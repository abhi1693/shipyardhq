"use server"

import prisma from "@/lib/prisma"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { dodoClient } from "@/lib/dodo"
import { headers } from "next/headers"
import {
  getActiveUserByClerkId,
  INACTIVE_ACCOUNT_MESSAGE,
} from "@/lib/server/userStatus"
import { MEMBER_ORGANIZATIONS_PATH } from "@/lib/routes"
import { createPlanCheckout } from "@/lib/server/dodoCheckout"
import { trackPlanPurchaseInGa } from "@/lib/server/analytics/planPurchaseTracking"

// Start a user-level checkout for a plan that includes the organization feature
export async function startOrgCheckoutAction(formData: FormData) {
  "use server"
  const { userId } = await auth()
  if (!userId) return
  const planId = formData.get("planId")?.toString() || ""
  if (!planId) return

  const user = await getActiveUserByClerkId(userId)
  if (!user) return

  const plan = await prisma.plan.findUnique({
    where: { id: planId },
    select: {
      id: true,
      externalId: true,
      price: true,
      type: true,
    },
  })
  if (!plan) return

  // Free plans: grant access immediately by creating a purchase record
  if ((plan.price || 0) === 0) {
    await prisma.userPlanPurchase.upsert({
      where: { userId_planId: { userId: user.id, planId: plan.id } },
      update: {},
      create: { userId: user.id, planId: plan.id },
    })
    redirect(`${MEMBER_ORGANIZATIONS_PATH}?upgraded=1`)
  }

  // Paid plans without a configured externalId should not grant access
  if (plan.price > 0 && !plan.externalId) {
    redirect(`${MEMBER_ORGANIZATIONS_PATH}?error=plan_not_configured`)
  }

  // Build return URL using current host if available
  let returnUrl: string | undefined
  try {
    const hdrs = await headers()
    const host = hdrs.get("x-forwarded-host") || hdrs.get("host")
    const proto = (hdrs.get("x-forwarded-proto") || "https").split(",")[0]
    if (host) returnUrl = `${proto}://${host}${MEMBER_ORGANIZATIONS_PATH}`
  } catch {}

  try {
    const checkout = await createPlanCheckout({
      plan: { externalId: plan.externalId!, type: plan.type },
      customer: {
        email: user.email,
        name: `${user.firstName} ${user.lastName}`.trim(),
      },
      metadata: { feature: "organization", planId },
      returnUrl,
    })

    redirect(checkout.url)
  } catch (error) {
    if (
      (error as any)?.digest &&
      String((error as any).digest).startsWith("NEXT_REDIRECT")
    ) {
      throw error
    }
    console.error("startOrgCheckoutAction failed", error)
  }

  redirect(`${MEMBER_ORGANIZATIONS_PATH}?error=checkout_init_failed`)
}

// Validate return from Dodo and grant user-level entitlement
export async function validateOrgPaymentAction(paymentId: string) {
  const { userId } = await auth()
  if (!userId) return { error: "Unauthenticated" }
  try {
    const payment = await dodoClient.payments.retrieve(paymentId)
    if (!payment) return { error: "Payment not found" }
    if (payment.status !== "succeeded")
      return { error: `Payment not succeeded: ${payment.status}` }
    const meta = (payment as any).metadata || {}

    // Preferred: metadata specifies the feature and plan
    let planId: string | undefined = (meta as any).planId
    const feature = (meta as any).feature
    let plan:
      | {
          id: string
        }
      | null = null

    if (!planId || feature !== "organization") {
      // Fallback for overlay checkout without metadata: infer plan by product_id
      const candidates: any[] =
        (payment as any).product_cart ||
        (payment as any).line_items ||
        (payment as any).items ||
        (payment as any).products ||
        []

      let productId: string | undefined
      for (const it of candidates) {
        const pid = (it &&
          (it.product_id || it.productId || it.product?.id)) as
          | string
          | undefined
        if (pid) {
          productId = pid
          break
        }
      }

      if (!productId) {
        return { error: "Unable to infer purchased product" }
      }

      plan = await prisma.plan.findFirst({
        where: { externalId: productId },
        select: {
          id: true,
        },
      })
      if (!plan) return { error: "No plan found for product" }
      planId = plan.id
    }
    if (!plan && planId) {
      plan = await prisma.plan.findUnique({
        where: { id: planId },
        select: {
          id: true,
        },
      })
    }
    if (!plan) return { error: "Plan not found" }
    const u = await getActiveUserByClerkId(userId)
    if (!u) return { error: INACTIVE_ACCOUNT_MESSAGE }

    // Record the successful purchase for entitlement
    await prisma.userPlanPurchase.upsert({
      where: { userId_planId: { userId: u.id, planId } },
      update: { externalId: paymentId },
      create: { userId: u.id, planId, externalId: paymentId },
    })
    await trackPlanPurchaseInGa({
      userId: u.id,
      paymentId,
      source: "organization",
    })
    return { success: true }
  } catch (e) {
    console.error("validateOrgPaymentAction failed", e)
    return { error: "Payment validation failed" }
  }
}

// Validate subscription-based return (e.g., status=active&subscription_id=...)
// and grant user-level organization entitlement by attaching an eligible plan.
export async function validateOrgSubscriptionAction(
  subscriptionId: string,
  status?: string,
) {
  const { userId } = await auth()
  if (!userId) return { error: "Unauthenticated" }

  // Only treat explicitly active subscriptions as success
  if (!subscriptionId || (status && status.toLowerCase() !== "active")) {
    return { error: "Subscription not active" }
  }

  try {
    // Try to map the subscription's product_id to a local plan via externalId
    let mappedPlanId: string | undefined
    let plan:
      | {
          id: string
        }
      | null = null
    try {
      const sub = await dodoClient.subscriptions.retrieve(subscriptionId)
      const pid = (sub as any)?.product_id as string | undefined
      if (pid) {
        const mapped = await prisma.plan.findFirst({
          where: { externalId: pid },
          select: {
            id: true,
          },
        })
        if (mapped) {
          mappedPlanId = mapped.id
          plan = mapped
        }
      }
    } catch {}

    // Require a mapped plan for entitlement; do not upsert with undefined
    if (!mappedPlanId) {
      return { error: "Unable to map subscription to a plan" }
    }
    if (!plan) {
      plan = await prisma.plan.findUnique({
        where: { id: mappedPlanId },
        select: {
          id: true,
        },
      })
      if (!plan) return { error: "Plan not found" }
    }

    const u = await getActiveUserByClerkId(userId)
    if (!u) return { error: INACTIVE_ACCOUNT_MESSAGE }

    // Record the active subscription as a purchase for entitlement
    await prisma.userPlanPurchase.upsert({
      where: { userId_planId: { userId: u.id, planId: mappedPlanId } },
      update: { externalId: subscriptionId },
      create: {
        userId: u.id,
        planId: mappedPlanId,
        externalId: subscriptionId,
      },
    })
    await trackPlanPurchaseInGa({
      userId: u.id,
      subscriptionId,
      source: "subscription",
    })
    return { success: true }
  } catch (e) {
    console.error("validateOrgSubscriptionAction failed", e)
    return { error: "Subscription validation failed" }
  }
}

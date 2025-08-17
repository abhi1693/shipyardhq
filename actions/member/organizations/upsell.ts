"use server"

import prisma from "@/lib/prisma"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { dodoClient } from "@/lib/dodo"
import { headers } from "next/headers"

// Start a user-level checkout for a plan that includes the organization feature
export async function startOrgCheckoutAction(formData: FormData) {
  "use server"
  const { userId } = await auth()
  if (!userId) return
  const planId = formData.get("planId")?.toString() || ""
  if (!planId) return

  const user = await prisma.user.findFirst({
    where: { clerkId: userId },
    select: { id: true, email: true, firstName: true, lastName: true },
  })
  if (!user) return

  const plan = await prisma.plan.findUnique({
    where: { id: planId },
    select: { id: true, externalId: true, price: true },
  })
  if (!plan) return

  // If plan is free or missing externalId, just grant access by creating org with plan
  if (!plan.externalId || (plan.price || 0) === 0) {
    // Create a starter org if none exists
    const existing = await prisma.organization.findFirst({
      where: { ownerUserId: user.id },
      select: { id: true },
    })
    if (!existing) {
      await prisma.organization.create({
        data: {
          name: `${user.firstName || "My"} Organization`.trim(),
          url: `${(user.firstName || "my").toLowerCase()}-${user.id.slice(0, 6)}`,
          ownerUserId: user.id,
          memberships: { create: { userId: user.id } },
          planId: plan.id,
        },
      })
    }
    redirect("/member/organizations?upgraded=1")
  }

  // Build return URL using current host if available
  let returnUrl: string | undefined
  try {
    const hdrs = await headers()
    const host = hdrs.get("x-forwarded-host") || hdrs.get("host")
    const proto = (hdrs.get("x-forwarded-proto") || "https").split(",")[0]
    if (host) returnUrl = `${proto}://${host}/member/organizations`
  } catch {}

  const customer = {
    email: user.email,
    name: `${user.firstName} ${user.lastName}`.trim(),
    create_new_customer: false,
  } as any

  const billing = { street: "", city: "", state: "", zipcode: "", country: "US" }

  const session = await dodoClient.payments.create({
    billing,
    customer,
    product_cart: [{ product_id: plan.externalId, quantity: 1 }],
    metadata: { feature: "organization", planId },
    payment_link: true,
    return_url: returnUrl,
  } as any)
  if ((session as any)?.payment_link) {
    redirect((session as any).payment_link)
  }
  return
}

// Validate return from Dodo and grant user-level entitlement
export async function validateOrgPaymentAction(paymentId: string) {
  const { userId } = await auth()
  if (!userId) return { error: "Unauthenticated" }
  try {
    const payment = await dodoClient.payments.retrieve(paymentId)
    if (!payment) return { error: "Payment not found" }
    if (payment.status !== "succeeded") return { error: `Payment not succeeded: ${payment.status}` }
    const meta = (payment as any).metadata || {}

    // Preferred: metadata specifies the feature and plan
    let planId: string | undefined = (meta as any).planId
    const feature = (meta as any).feature

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
        const pid = (it && (it.product_id || it.productId || it.product?.id)) as string | undefined
        if (pid) {
          productId = pid
          break
        }
      }

      if (!productId) {
        return { error: "Unable to infer purchased product" }
      }

      const plan = await prisma.plan.findFirst({ where: { externalId: productId }, select: { id: true } })
      if (!plan) return { error: "No plan found for product" }
      planId = plan.id
    }
    const u = await prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true, firstName: true } })
    if (!u) return { error: "User not found" }

    // Ensure the user has an organization with this plan; create a starter org if none
    const hasOrgWithPlan = await prisma.organization.findFirst({
      where: { ownerUserId: u.id, planId },
      select: { id: true },
    })
    if (!hasOrgWithPlan) {
      // If user has any org, attach plan to the first; otherwise create a new one
      const existingOrg = await prisma.organization.findFirst({
        where: { ownerUserId: u.id },
        select: { id: true, url: true },
        orderBy: { createdAt: "asc" },
      })
      if (existingOrg) {
        await prisma.organization.update({ where: { id: existingOrg.id }, data: { planId } })
      } else {
        await prisma.organization.create({
          data: {
            name: `${u.firstName || "My"} Organization`.trim(),
            url: `org-${u.id.slice(0, 8)}`,
            ownerUserId: u.id,
            memberships: { create: { userId: u.id } },
            planId,
          },
        })
      }
    }
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
    // Determine an eligible plan that unlocks the organization feature.
    // Prefer the lowest-priced plan that has the organization feature enabled.
    const plan = await prisma.plan.findFirst({
      where: {
        assignments: {
          some: { enabled: true, feature: { key: "organization" } },
        },
      },
      orderBy: { price: "asc" },
      select: { id: true },
    })

    if (!plan) return { error: "No organization-enabled plan configured" }

    const u = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true, firstName: true },
    })
    if (!u) return { error: "User not found" }

    // Attach the plan to an existing org owned by the user, or create a starter org.
    const existingOrg = await prisma.organization.findFirst({
      where: { ownerUserId: u.id },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    })

    if (existingOrg) {
      await prisma.organization.update({
        where: { id: existingOrg.id },
        data: { planId: plan.id },
      })
    } else {
      await prisma.organization.create({
        data: {
          name: `${u.firstName || "My"} Organization`.trim(),
          url: `org-${u.id.slice(0, 8)}`,
          ownerUserId: u.id,
          memberships: { create: { userId: u.id } },
          planId: plan.id,
        },
      })
    }

    // Note: We currently do not persist external subscription identifiers.
    // If needed later, add a field on Organization or a new Subscription model.
    return { success: true }
  } catch (e) {
    console.error("validateOrgSubscriptionAction failed", e)
    return { error: "Subscription validation failed" }
  }
}

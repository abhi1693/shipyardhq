import { auth } from "@clerk/nextjs/server"
import { randomUUID } from "crypto"
import { NextResponse } from "next/server"

import { getAppBaseUrl } from "@/lib/app-url"
import { dodoClient } from "@/lib/dodo"
import prisma from "@/lib/prisma"
import {
  HOME_PATH,
  MEMBER_PRODUCTS_PATH,
  memberProductPath,
} from "@/lib/routes"
import { refreshProductPlanGrantCaches } from "@/lib/server/productPlanGrantCache"
import {
  fulfillDodoOneTimePayment,
  syncDodoSubscriptionGrant,
  type ProductPlanGrantResult,
  UNVERIFIED_SUBSCRIPTION_PLAN_CHANGE_REASON,
} from "@/lib/server/productPlanGrants"
import { getActiveUserByClerkId } from "@/lib/server/userStatus"
import { hasVerifiedDodoSubscriptionPlanChangePayment } from "@/lib/server/dodoSubscriptionPayments"
import { readMetadataString } from "@/lib/server/subscriptionMetadata"

type BillingRedirectCorrelation = {
  token: string
  productId?: string
  planId?: string
}

function redirectUrl(
  path: string,
  billing: string,
  correlation: BillingRedirectCorrelation,
) {
  const destination = new URL(path, getAppBaseUrl())
  destination.searchParams.set("billing", billing)
  destination.searchParams.set("billingToken", correlation.token)
  if (correlation.productId) {
    destination.searchParams.set("billingProductId", correlation.productId)
  }
  if (correlation.planId) {
    destination.searchParams.set("billingPlanId", correlation.planId)
  }
  return destination
}

function metadataRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

async function resolveOwnedProductDestination(
  productId: string | undefined,
  userId: string,
) {
  if (!productId) return { path: MEMBER_PRODUCTS_PATH }
  const product = await prisma.product.findFirst({
    where: { id: productId, userId },
    select: { slug: true },
  })
  return product
    ? { path: memberProductPath(product.slug), productId }
    : { path: MEMBER_PRODUCTS_PATH }
}

async function refreshChangedProjection(
  grantResult: ProductPlanGrantResult,
  reason: string,
) {
  if (grantResult.outcome === "invalid" || grantResult.outcome === "ignored")
    return
  if (!grantResult.productId) return
  await refreshProductPlanGrantCaches(grantResult.productId, reason)
}

async function hasActiveGrant(grantResult: ProductPlanGrantResult | null) {
  if (!grantResult?.grantId || !grantResult.productId) return false
  if (grantResult.outcome === "invalid" || grantResult.outcome === "ignored") {
    return false
  }
  if (grantResult.reason === UNVERIFIED_SUBSCRIPTION_PLAN_CHANGE_REASON) {
    return false
  }
  const now = new Date()
  const activeGrant = await prisma.productPlanGrant.findFirst({
    where: {
      id: grantResult.grantId,
      productId: grantResult.productId,
      status: "active",
      startsAt: { lte: now },
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    select: { id: true },
  })
  return activeGrant !== null
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const fallbackProductId =
    requestUrl.searchParams.get("productId")?.trim() || undefined
  const fallbackPlanId =
    requestUrl.searchParams.get("planId")?.trim() || undefined
  const paymentId = requestUrl.searchParams.get("payment_id")?.trim()
  const subscriptionId = requestUrl.searchParams.get("subscription_id")?.trim()

  const { userId: clerkId } = await auth()
  if (!clerkId) {
    const signInPath = process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL ?? HOME_PATH
    return NextResponse.redirect(new URL(signInPath, getAppBaseUrl()))
  }
  const user = await getActiveUserByClerkId(clerkId)
  if (!user) {
    return NextResponse.redirect(new URL(HOME_PATH, getAppBaseUrl()))
  }

  let grantResult: ProductPlanGrantResult | null = null
  let resolvedProductId = fallbackProductId
  let expectedPlanId = fallbackPlanId
  let provisioningFailed = false
  try {
    if (paymentId) {
      const payment = await dodoClient.payments.retrieve(paymentId)
      const metadata = metadataRecord(payment.metadata)
      resolvedProductId =
        readMetadataString(metadata, "productId", "product_id") ??
        resolvedProductId
      expectedPlanId =
        readMetadataString(metadata, "planId", "plan_id") ?? expectedPlanId
      grantResult = await fulfillDodoOneTimePayment(payment, {
        expectedUserId: user.id,
      })
      await refreshChangedProjection(grantResult, "dodo.return.payment")
    } else if (subscriptionId) {
      const subscription =
        await dodoClient.subscriptions.retrieve(subscriptionId)
      const metadata = metadataRecord(subscription.metadata)
      resolvedProductId =
        readMetadataString(metadata, "productId", "product_id") ??
        resolvedProductId
      const metadataPlanId = readMetadataString(metadata, "planId", "plan_id")
      const providerExternalPlanId = subscription.product_id?.trim() || null
      // Once Dodo reports a target product, it is authoritative. Clear the
      // baseline/query plan before resolving it so catalog drift or a lookup
      // failure can never make the previous active plan certify this return.
      if (providerExternalPlanId) expectedPlanId = undefined
      const providerPlan = providerExternalPlanId
        ? await prisma.plan.findUnique({
            where: { externalId: providerExternalPlanId },
            select: { id: true },
          })
        : null
      expectedPlanId = providerExternalPlanId
        ? providerPlan?.id
        : (metadataPlanId ?? expectedPlanId)
      const providerObservedAt = new Date()
      const planChangePaymentSucceeded =
        await hasVerifiedDodoSubscriptionPlanChangePayment({
          subscriptionId,
          productId: subscription.product_id,
          status: subscription.status,
          metadata: subscription.metadata,
        })
      grantResult = await syncDodoSubscriptionGrant(subscription, {
        expectedUserId: user.id,
        providerObservedAt,
        planChangePaymentSucceeded,
      })
      await refreshChangedProjection(grantResult, "dodo.return.subscription")
    }
  } catch (error) {
    provisioningFailed = true
    console.error("[dodo-return] entitlement fallback failed", {
      paymentId,
      subscriptionId,
      error,
    })
  }

  const productId = grantResult?.productId ?? resolvedProductId
  if (!expectedPlanId && grantResult?.grantId) {
    try {
      const grant = await prisma.productPlanGrant.findUnique({
        where: { id: grantResult.grantId },
        select: { planId: true },
      })
      expectedPlanId = grant?.planId
    } catch (error) {
      console.error("[dodo-return] failed to resolve expected plan", {
        grantId: grantResult.grantId,
        error,
      })
    }
  }
  const destination = await resolveOwnedProductDestination(productId, user.id)
  const billing =
    !provisioningFailed && (await hasActiveGrant(grantResult))
      ? "success"
      : "processing"
  const canPollOwnedGrant = Boolean(
    destination.productId &&
    expectedPlanId &&
    (grantResult === null
      ? provisioningFailed
      : grantResult.outcome !== "invalid" && grantResult.outcome !== "ignored"),
  )
  return NextResponse.redirect(
    redirectUrl(destination.path, billing, {
      token: randomUUID(),
      productId: canPollOwnedGrant ? destination.productId : undefined,
      planId: canPollOwnedGrant ? expectedPlanId : undefined,
    }),
  )
}

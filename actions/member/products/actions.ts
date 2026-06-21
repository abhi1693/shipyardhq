"use server"

import { auth } from "@clerk/nextjs/server"
import prisma from "@/lib/prisma"
import { dodoClient } from "@/lib/dodo"
import { resolvePlanAssignedAt } from "@/lib/server/planAssignment"
import { createPlanCheckout } from "@/lib/server/dodoCheckout"
import { Prisma, ProductStatus } from "@/lib/vendor/prisma/client"
import { getDefaultPlanWithFeatures } from "@/lib/server/planDefaults"
import {
  getActiveUserByClerkId,
  INACTIVE_ACCOUNT_MESSAGE,
} from "@/lib/server/userStatus"
import { hasPlanFeature } from "@/lib/features"
import { memberProductPath } from "@/lib/routes"
import { fetchDodoCustomerByEmail } from "@/lib/fetchDodoCustomer"
import { createDodoCustomerPortalLinkByEmail } from "@/lib/dodoCustomerPortal"
import { revalidateProduct } from "@/lib/cache/revalidate"
import { refreshHomepageFeedCache } from "@/actions/public/homepage/feed"
import { invalidateProductAnalyticsRecordCache } from "@/lib/server/analytics/productAnalytics"

import { headers } from "next/headers"
import { redirect } from "next/navigation"

type ListParams = Record<string, string | string[] | undefined>

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active"])

async function refreshHomepageFeedCacheAfterMemberProductChange(
  reason: string,
  productId?: string,
) {
  try {
    return await refreshHomepageFeedCache()
  } catch (error) {
    console.error("Failed to refresh homepage feed cache after member change", {
      reason,
      productId,
      error,
    })
    return null
  }
}

async function invalidateProductAnalyticsAfterMemberProductChange(
  reason: string,
  productId?: string,
) {
  if (!productId) return null

  try {
    return await invalidateProductAnalyticsRecordCache(productId, reason)
  } catch (error) {
    console.error(
      "Failed to invalidate product analytics after member change",
      {
        reason,
        productId,
        error,
      },
    )
    return null
  }
}

type ProductListItem = Prisma.ProductGetPayload<{
  include: {
    category: { select: { id: true; name: true; slug: true } }
    plan: {
      select: {
        id: true
        name: true
        isDefault: true
        assignments: {
          select: {
            enabled: true
            feature: { select: { key: true } }
          }
        }
      }
    }
    verification: { select: { isVerified: true } }
    analytics: { select: { upvotes: true } }
  }
}>

function parseIsoDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isFinite(parsed.getTime()) ? parsed : null
}

async function findActiveSubscriptionForProduct(args: {
  email: string
  productId: string
}) {
  const customer = await fetchDodoCustomerByEmail(args.email)
  if (!customer) return null

  let best: any | null = null
  let bestCreatedAt = 0

  for await (const subscription of dodoClient.subscriptions.list({
    customer_id: customer.customer_id,
    page_size: 100,
  } as any)) {
    const status = (subscription?.status || "").toString().toLowerCase()
    if (!ACTIVE_SUBSCRIPTION_STATUSES.has(status)) continue

    const metadata =
      typeof subscription?.metadata === "object" && subscription.metadata
        ? (subscription.metadata as Record<string, unknown>)
        : null
    const metaProductId =
      (metadata?.productId as string | undefined) ||
      (metadata?.product_id as string | undefined)
    if (metaProductId !== args.productId) continue

    const createdAt = parseIsoDate(subscription?.created_at)?.getTime() ?? 0
    if (!best || createdAt > bestCreatedAt) {
      best = subscription
      bestCreatedAt = createdAt
    }
  }

  return best
}

export async function getUserProducts(params?: ListParams) {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthenticated")
  const user = await getActiveUserByClerkId(userId)
  if (!user) throw new Error(INACTIVE_ACCOUNT_MESSAGE)

  const verification = (params?.verification as string) || undefined
  const rawStatus = (params?.status as string) || undefined
  const validStatuses: readonly ProductStatus[] = [
    "draft",
    "published",
    "archived",
  ]
  const status =
    rawStatus && validStatuses.includes(rawStatus as ProductStatus)
      ? (rawStatus as ProductStatus)
      : undefined
  const q = ((params?.q as string) || "").trim()
  const sort = (params?.sort as string) || "new"
  const page = Math.max(1, parseInt((params?.page as string) || "1", 10) || 1)
  const limit = Math.max(
    1,
    parseInt((params?.limit as string) || "10", 10) || 10,
  )
  const skip = (page - 1) * limit

  const where: any = { userId: user.id }
  const andFilters: any[] = []

  if (verification === "verified") {
    andFilters.push({ verification: { isVerified: true } })
  } else if (verification === "unverified") {
    andFilters.push({ verification: { isVerified: false } })
  }

  if (status) {
    andFilters.push({ status })
  }

  if (q.length) {
    andFilters.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { slug: { contains: q, mode: "insensitive" } },
      ],
    })
  }

  if (andFilters.length) {
    where.AND = andFilters
  }

  let orderBy: any = { createdAt: "desc" as const }
  switch (sort) {
    case "updated":
      orderBy = { updatedAt: "desc" }
      break
    case "az":
      orderBy = { name: "asc" }
      break
    case "upvotes":
      orderBy = { analytics: { upvotes: "desc" } }
      break
    case "new":
    default:
      orderBy = { createdAt: "desc" }
  }

  const [products, total] = (await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        plan: {
          select: {
            id: true,
            name: true,
            isDefault: true,
            assignments: {
              select: {
                enabled: true,
                feature: { select: { key: true } },
              },
            },
          },
        },
        verification: { select: { isVerified: true } },
        analytics: { select: { upvotes: true } },
      },
    }),
    prisma.product.count({ where }),
  ])) as [ProductListItem[], number]

  // Fallback to the default plan's features when a product has no plan attached
  const defaultPlan = products.some((product) => !product.plan)
    ? await getDefaultPlanWithFeatures()
    : null

  const productsWithPermissions = products.map((product: ProductListItem) => {
    const planForAccess = product.plan ?? defaultPlan

    const hasAdvancedAnalytics = hasPlanFeature(
      planForAccess ?? null,
      "analytics.advanced",
    )
    const canViewAnalytics =
      hasAdvancedAnalytics ||
      hasPlanFeature(planForAccess ?? null, "analytics.basic")

    const { plan, ...rest } = product
    const planForDisplay = plan ?? defaultPlan
    const planSummary = planForDisplay
      ? {
          id: planForDisplay.id,
          name: planForDisplay.name,
        }
      : undefined

    return {
      ...rest,
      plan: planSummary,
      hasValidatedPlan: Boolean(plan),
      canDelete: product.userId === user.id,
      canViewAnalytics,
    }
  })

  return { products: productsWithPermissions, total, page, limit }
}

// Attach or remove a plan from a product owned by the current user
export async function setProductPlanAction(
  productId: string,
  planId: string | null,
  subscriptionId?: string | null,
) {
  const { userId } = await auth()
  if (!userId) return { error: "Unauthenticated" }

  const user = await getActiveUserByClerkId(userId)
  if (!user) return { error: INACTIVE_ACCOUNT_MESSAGE }

  const product = await prisma.product.findFirst({
    where: { id: productId, userId: user.id },
    select: {
      id: true,
      status: true,
      planAssignedAt: true,
      plan: { select: { boostForDays: true, isDefault: true } },
    },
  })
  if (!product) return { error: "Product not found or not owned by user" }

  let planAssignedAt: Date | null = null
  let subscriptionIdUpdate: string | null | undefined
  if (planId) {
    const plan = await prisma.plan.findUnique({
      where: { id: planId },
      select: { id: true, boostForDays: true, isDefault: true, type: true },
    })
    if (!plan) return { error: "Plan not found" }
    planAssignedAt = resolvePlanAssignedAt({
      currentPlan: product.plan,
      currentAssignedAt: product.planAssignedAt,
      newPlan: plan,
    })
    if (plan.type !== "recurring_price") {
      subscriptionIdUpdate = null
    } else if (subscriptionId !== undefined) {
      subscriptionIdUpdate = subscriptionId
    }
  } else {
    subscriptionIdUpdate = null
  }

  const data: Prisma.ProductUncheckedUpdateInput = {
    planId: planId ?? null,
    planAssignedAt,
  }
  if (subscriptionIdUpdate !== undefined) {
    data.subscriptionId = subscriptionIdUpdate
  }

  await prisma.product.update({
    where: { id: productId },
    data,
  })
  revalidateProduct(productId, "revalidate")
  await refreshHomepageFeedCacheAfterMemberProductChange(
    "member.product.plan.updated",
    productId,
  )
  await invalidateProductAnalyticsAfterMemberProductChange(
    "member.product.plan.updated",
    productId,
  )

  return { success: true }
}

// Start checkout on DodoPayments when plan has externalId
export async function startPlanCheckoutAction(
  productId: string,
  planId: string,
) {
  const { userId } = await auth()
  if (!userId) return { error: "Unauthenticated" }

  const user = await getActiveUserByClerkId(userId)
  if (!user) return { error: INACTIVE_ACCOUNT_MESSAGE }

  const product = await prisma.product.findFirst({
    where: { id: productId, userId: user.id },
    select: {
      id: true,
      slug: true,
      plan: {
        select: { isDefault: true, price: true },
      },
    },
  })
  if (!product) return { error: "Product not found or not owned by user" }
  if (
    product.plan &&
    !product.plan.isDefault &&
    (product.plan.price ?? 0) > 0
  ) {
    return { error: "Plan changes are only available for free products" }
  }

  const plan = await prisma.plan.findUnique({
    where: { id: planId },
    select: { id: true, externalId: true, price: true, type: true },
  })
  if (!plan) return { error: "Plan not found" }
  if (!plan.externalId || plan.price === 0) {
    return { error: "Checkout not required for this plan" }
  }

  // Build return URL using current host if available
  let returnUrl: string | undefined
  try {
    const hdrs = await headers()
    const host = hdrs.get("x-forwarded-host") || hdrs.get("host")
    const proto = (hdrs.get("x-forwarded-proto") || "https").split(",")[0]
    if (host) returnUrl = `${proto}://${host}${memberProductPath(product.slug)}`
  } catch {}

  try {
    const checkout = await createPlanCheckout({
      plan: { externalId: plan.externalId!, type: plan.type },
      customer: {
        email: user.email,
        name: `${user.firstName} ${user.lastName}`.trim(),
      },
      metadata: { productId, planId },
      returnUrl,
    })
    return { redirectUrl: checkout.url }
  } catch (e) {
    console.error("Failed to start checkout:", e)
    return { error: "Checkout initialization failed" }
  }
}

// Validate payment by ID and attach plan to product using metadata from Dodo
export async function validatePaymentAndAttachPlan(paymentId: string) {
  const { userId } = await auth()
  if (!userId) return { error: "Unauthenticated" }

  const user = await getActiveUserByClerkId(userId)
  if (!user) return { error: INACTIVE_ACCOUNT_MESSAGE }

  try {
    const payment = await dodoClient.payments.retrieve(paymentId)
    if (!payment) return { error: "Payment not found" }

    // Only attach on successful payment
    if (payment.status !== "succeeded") {
      return { error: `Payment not succeeded: ${payment.status}` }
    }

    const meta = (payment.metadata || {}) as any
    const productId = meta.productId as string | undefined
    const planId = meta.planId as string | undefined
    if (!productId || !planId) {
      return { error: "Missing metadata for product/plan" }
    }

    // Ownership check
    const product = await prisma.product.findFirst({
      where: { id: productId, userId: user.id },
      select: {
        id: true,
        userId: true,
        status: true,
        planAssignedAt: true,
        plan: { select: { boostForDays: true, isDefault: true } },
      },
    })
    if (!product) return { error: "Product not found or not owned" }

    // Attach plan
    const plan = await prisma.plan.findUnique({
      where: { id: planId },
      select: { boostForDays: true, isDefault: true },
    })
    if (!plan) return { error: "Plan not found" }
    const planAssignedAt = resolvePlanAssignedAt({
      currentPlan: product.plan,
      currentAssignedAt: product.planAssignedAt,
      newPlan: plan,
    })
    await prisma.product.update({
      where: { id: productId },
      data: {
        planId,
        planAssignedAt,
        subscriptionId: null,
      },
    })
    revalidateProduct(productId, "revalidate")
    await refreshHomepageFeedCacheAfterMemberProductChange(
      "member.product.payment.validated",
      productId,
    )
    await invalidateProductAnalyticsAfterMemberProductChange(
      "member.product.payment.validated",
      productId,
    )
    return { success: true }
  } catch (e) {
    console.error("Payment validation failed:", e)
    return { error: "Payment validation failed" }
  }
}

// Validate subscription by ID and attach plan to product using metadata from Dodo
export async function validateSubscriptionAndAttachPlan(
  subscriptionId: string,
) {
  const { userId } = await auth()
  if (!userId) return { error: "Unauthenticated" }

  const user = await getActiveUserByClerkId(userId)
  if (!user) return { error: INACTIVE_ACCOUNT_MESSAGE }

  try {
    const subscription = await dodoClient.subscriptions.retrieve(subscriptionId)
    if (!subscription) return { error: "Subscription not found" }

    const status = (subscription.status || "").toString().toLowerCase()
    if (status !== "active") {
      return { error: `Subscription not active: ${subscription.status}` }
    }

    const meta = (subscription.metadata || {}) as any
    const productId = (meta.productId || meta.product_id) as string | undefined
    const planId = (meta.planId || meta.plan_id) as string | undefined
    if (!productId || !planId) {
      return { error: "Missing metadata for product/plan" }
    }

    const product = await prisma.product.findFirst({
      where: { id: productId, userId: user.id },
      select: {
        id: true,
        userId: true,
        status: true,
        planAssignedAt: true,
        plan: { select: { boostForDays: true, isDefault: true } },
      },
    })
    if (!product) return { error: "Product not found or not owned" }

    const plan = await prisma.plan.findUnique({
      where: { id: planId },
      select: { boostForDays: true, isDefault: true },
    })
    if (!plan) return { error: "Plan not found" }

    const planAssignedAt = resolvePlanAssignedAt({
      currentPlan: product.plan,
      currentAssignedAt: product.planAssignedAt,
      newPlan: plan,
    })
    const rawSubscriptionId =
      (subscription as any)?.subscription_id ||
      (subscription as any)?.id ||
      subscriptionId
    const subscriptionExternalId =
      typeof rawSubscriptionId === "string" ? rawSubscriptionId : subscriptionId
    await prisma.product.update({
      where: { id: productId },
      data: {
        planId,
        planAssignedAt,
        subscriptionId: subscriptionExternalId,
      },
    })
    revalidateProduct(productId, "revalidate")
    await refreshHomepageFeedCacheAfterMemberProductChange(
      "member.product.subscription.validated",
      productId,
    )
    await invalidateProductAnalyticsAfterMemberProductChange(
      "member.product.subscription.validated",
      productId,
    )
    return { success: true }
  } catch (e) {
    console.error("Subscription validation failed:", e)
    return { error: "Subscription validation failed" }
  }
}

// Unified server action to choose/upgrade a plan for a product
// Usage from a form: const action = choosePlanAction.bind(null, { productId, redirectPath })
export async function choosePlanAction(
  ctx: { productId: string; redirectPath: string; errorRedirectPath?: string },
  formData: FormData,
) {
  "use server"
  const planId = formData.get("planId")?.toString() || ""
  if (!planId) return
  const selectedPlanParam = `planId=${encodeURIComponent(planId)}`
  const errorRedirectPath = ctx.errorRedirectPath ?? ctx.redirectPath
  const errorRedirect = (error: string) => {
    const separator = errorRedirectPath.includes("?") ? "&" : "?"
    return `${errorRedirectPath}${separator}error=${error}&${selectedPlanParam}`
  }

  // Try to start checkout when plan requires payment
  const plan = await prisma.plan.findUnique({
    where: { id: planId },
    select: { id: true, externalId: true, price: true, type: true },
  })
  if (!plan) return

  const ownership = await requireOwnedProduct(ctx.productId)
  if ("error" in ownership) return

  const currentPlan = await prisma.product.findUnique({
    where: { id: ctx.productId },
    select: {
      plan: {
        select: { type: true, isDefault: true, price: true },
      },
    },
  })
  const activePlan = currentPlan?.plan
  const hasPaidPlan =
    !!activePlan && !activePlan.isDefault && (activePlan.price ?? 0) > 0
  if (hasPaidPlan) {
    redirect(errorRedirect("plan_already_paid"))
  }

  // Free plans (no price): attach immediately
  if ((plan.price || 0) === 0) {
    await setProductPlanAction(ctx.productId, planId, null)
    redirect(`${ctx.redirectPath}?upgraded=1`)
  }

  // Paid plans must have an externalId to start checkout
  if ((plan.price || 0) > 0 && !plan.externalId) {
    redirect(errorRedirect("plan_not_configured"))
  }

  if ((plan.price || 0) > 0 && plan.type === "recurring_price") {
    const existingSubscription = await findActiveSubscriptionForProduct({
      email: ownership.user.email,
      productId: ctx.productId,
    })
    if (existingSubscription) {
      const portalLink = await createDodoCustomerPortalLinkByEmail(
        ownership.user.email,
      )
      if (portalLink) {
        redirect(portalLink)
      }

      redirect(errorRedirect("subscription_portal_failed"))
    }
  }

  // Start hosted checkout for paid plans
  const session = await startPlanCheckoutAction(ctx.productId, planId)
  const redirectUrl = (session as any)?.redirectUrl
  if (redirectUrl) {
    redirect(redirectUrl)
  }

  // If checkout couldn't be created, do NOT grant the plan
  redirect(errorRedirect("checkout_init_failed"))
}

async function requireOwnedProduct(productId: string) {
  const { userId } = await auth()
  if (!userId) return { error: "Unauthenticated" as const } as const
  const user = await getActiveUserByClerkId(userId)
  if (!user) return { error: INACTIVE_ACCOUNT_MESSAGE }

  const product = await prisma.product.findFirst({
    where: { id: productId, userId: user.id },
    select: { id: true, slug: true, userId: true, name: true, status: true },
  })
  if (!product)
    return { error: "Product not found or not owned by user" as const } as const

  return { user, product }
}

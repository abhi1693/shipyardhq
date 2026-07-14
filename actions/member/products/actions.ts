"use server"

import { auth } from "@clerk/nextjs/server"
import prisma from "@/lib/prisma"
import { dodoClient } from "@/lib/dodo"
import { createPlanCheckout } from "@/lib/server/dodoCheckout"
import { Prisma, ProductStatus } from "@/lib/vendor/prisma/client"
import { getDefaultPlanWithFeatures } from "@/lib/server/planDefaults"
import {
  getActiveUserByClerkId,
  INACTIVE_ACCOUNT_MESSAGE,
} from "@/lib/server/userStatus"
import { hasPlanFeature } from "@/lib/features"
import { fetchDodoCustomerByEmail } from "@/lib/fetchDodoCustomer"
import { createDodoCustomerPortalLinkByEmail } from "@/lib/dodoCustomerPortal"
import { revalidateProduct } from "@/lib/cache/revalidate"
import { refreshHomepageFeedCache } from "@/actions/public/homepage/feed"
import { invalidateProductAnalyticsRecordCache } from "@/lib/server/analytics/productAnalytics"
import { PAID_PLACEMENT_GRANT_SOURCES } from "@/lib/products/placement-grants"
import { getAppBaseUrl } from "@/lib/app-url"
import { resolveEffectivePlanGrant } from "@/lib/products/effective-plan-grants"
import { projectEffectiveProductPlanGrant } from "@/lib/server/productPlanGrants"
import { enqueueProductPlanGrantBoundaryJobs } from "@/lib/server/productPlanGrantBoundarySchedule"

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

const memberProductPlanGrantSelect = {
  id: true,
  source: true,
  startsAt: true,
  createdAt: true,
  plan: {
    select: {
      id: true,
      name: true,
      price: true,
      isDefault: true,
      assignments: {
        select: {
          enabled: true,
          feature: { select: { key: true } },
        },
      },
    },
  },
} satisfies Prisma.ProductPlanGrantSelect

type ProductListItem = Prisma.ProductGetPayload<{
  include: {
    category: { select: { id: true; name: true; slug: true } }
    planGrants: {
      select: typeof memberProductPlanGrantSelect
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

  const now = new Date()
  const [products, total] = (await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        planGrants: {
          where: {
            status: "active",
            startsAt: { lte: now },
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          },
          select: memberProductPlanGrantSelect,
        },
        verification: { select: { isVerified: true } },
        analytics: { select: { upvotes: true } },
      },
    }),
    prisma.product.count({ where }),
  ])) as [ProductListItem[], number]

  // Fallback to the default plan when no active grant exists.
  const defaultPlan = products.some((product) => !product.planGrants.length)
    ? await getDefaultPlanWithFeatures()
    : null

  const productsWithPermissions = products.map((product: ProductListItem) => {
    const { planGrants, ...rest } = product
    const effectiveGrant = resolveEffectivePlanGrant(planGrants)
    const planForAccess = effectiveGrant?.plan ?? defaultPlan

    const hasAdvancedAnalytics = hasPlanFeature(
      planForAccess ?? null,
      "analytics.advanced",
    )
    const canViewAnalytics =
      hasAdvancedAnalytics ||
      hasPlanFeature(planForAccess ?? null, "analytics.basic")

    const planForDisplay = planForAccess
    const planSummary = planForDisplay
      ? {
          id: planForDisplay.id,
          name: planForDisplay.name,
        }
      : undefined

    return {
      ...rest,
      plan: planSummary,
      hasValidatedPlan: Boolean(product.planId),
      canDelete: product.userId === user.id,
      canViewAnalytics,
    }
  })

  return { products: productsWithPermissions, total, page, limit }
}

// Attach or remove a plan from a product owned by the current user
async function setProductPlanAction(
  productId: string,
  planId: string,
  options: { publish?: boolean } = {},
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
    },
  })
  if (!product) return { error: "Product not found or not owned by user" }

  const plan = await prisma.plan.findUnique({
    where: { id: planId },
    select: { id: true, isDefault: true, price: true },
  })
  if (!plan) return { error: "Plan not found" }
  if (!plan.isDefault || plan.price > 0) {
    return { error: "Paid plans require verified checkout" }
  }

  const now = new Date()
  const projection = await prisma.$transaction(async (tx) => {
    const projectedPlan = await projectEffectiveProductPlanGrant(
      tx,
      productId,
      now,
    )
    if (options.publish && product.status === ProductStatus.draft) {
      await tx.product.update({
        where: { id: productId },
        data: { status: ProductStatus.published, publishedAt: now },
      })
    }
    return projectedPlan
  })
  enqueueProductPlanGrantBoundaryJobs(projection.boundaryJobs)
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
async function startPlanCheckoutAction(productId: string, planId: string) {
  const { userId } = await auth()
  if (!userId) return { error: "Unauthenticated" }

  const user = await getActiveUserByClerkId(userId)
  if (!user) return { error: INACTIVE_ACCOUNT_MESSAGE }

  const now = new Date()
  const product = await prisma.product.findFirst({
    where: { id: productId, userId: user.id },
    select: {
      id: true,
      slug: true,
      planGrants: {
        where: {
          source: { in: [...PAID_PLACEMENT_GRANT_SOURCES] },
          status: "active",
          startsAt: { lte: now },
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        take: 1,
        select: { id: true },
      },
    },
  })
  if (!product) return { error: "Product not found or not owned by user" }
  if (product.planGrants.length > 0) {
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

  const returnUrl = new URL("/api/billing/dodo/return", getAppBaseUrl())
  returnUrl.searchParams.set("productId", product.id)
  returnUrl.searchParams.set("planId", plan.id)

  try {
    const checkout = await createPlanCheckout({
      plan: { externalId: plan.externalId!, type: plan.type },
      customer: {
        email: user.email,
        name: `${user.firstName} ${user.lastName}`.trim(),
      },
      metadata: { productId, planId, userId: user.id },
      returnUrl: returnUrl.toString(),
    })
    return { redirectUrl: checkout.url }
  } catch (e) {
    console.error("Failed to start checkout:", e)
    return { error: "Checkout initialization failed" }
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

  const now = new Date()
  const currentPlan = await prisma.product.findUnique({
    where: { id: ctx.productId },
    select: {
      planGrants: {
        where: {
          source: { in: [...PAID_PLACEMENT_GRANT_SOURCES] },
          status: "active",
          startsAt: { lte: now },
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        take: 1,
        select: { id: true },
      },
    },
  })
  const hasPaidPlan = Boolean(currentPlan?.planGrants.length)
  if (hasPaidPlan) {
    redirect(errorRedirect("plan_already_paid"))
  }

  // Free plans (no price): attach immediately
  if ((plan.price || 0) === 0) {
    await setProductPlanAction(ctx.productId, planId, { publish: true })
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

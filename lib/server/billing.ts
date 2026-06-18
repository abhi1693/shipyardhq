"use server"

import { auth } from "@clerk/nextjs/server"
import prisma from "@/lib/prisma"
import { dodoClient } from "@/lib/dodo"
import { fetchDodoCustomerByEmail } from "@/lib/fetchDodoCustomer"
import { resolvePlanAssignedAt } from "@/lib/server/planAssignment"
import { PlanType, Prisma, ProductStatus } from "@/lib/vendor/prisma/client"
import { readMetadataString } from "@/lib/server/subscriptionMetadata"
import {
  getActiveUserByClerkId,
  INACTIVE_ACCOUNT_MESSAGE,
} from "@/lib/server/userStatus"
import { refreshHomepageFeedCache } from "@/actions/public/homepage/feed"
import { invalidateProductAnalyticsRecordCache } from "@/lib/server/analytics/productAnalytics"
import { revalidateProduct } from "@/lib/cache/revalidate"

type PlanSummary = {
  id: string
  externalId: string | null
  type: PlanType
  boostForDays: number | null
  isDefault: boolean
  price: number
}

type SubscriptionPaymentSummary = {
  status?: string
  createdAtMs: number
}

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active"])
const INACTIVE_SUBSCRIPTION_STATUSES = new Set([
  "pending",
  "cancelled",
  "canceled",
  "expired",
  "failed",
  "on_hold",
])

async function refreshHomepageFeedCacheAfterBillingSync() {
  try {
    await refreshHomepageFeedCache()
  } catch (error) {
    console.error("[billing] homepage feed refresh failed", { error })
  }
}

async function invalidateProductAnalyticsAfterBillingSync(
  productIds: string[],
) {
  const uniqueProductIds = Array.from(new Set(productIds)).filter(Boolean)
  if (!uniqueProductIds.length) return

  await Promise.allSettled(
    uniqueProductIds.map((productId) =>
      invalidateProductAnalyticsRecordCache(productId, "billing.sync"),
    ),
  )
}

function publishProductData(status?: ProductStatus | null) {
  if (status === ProductStatus.published) return {}
  return {
    status: ProductStatus.published,
    publishedAt: new Date(),
  }
}

function revalidateProductsAfterBillingSync(productIds: string[]) {
  for (const productId of new Set(productIds)) {
    if (productId) revalidateProduct(productId, "revalidate")
  }
}

export async function syncCurrentUserBilling() {
  const { userId } = await auth()
  if (!userId) return { error: "Unauthenticated" }

  const user = await getActiveUserByClerkId(userId)
  if (!user?.email) return { error: INACTIVE_ACCOUNT_MESSAGE }

  const customer = await fetchDodoCustomerByEmail(user.email)
  if (!customer) {
    // No external customer found; avoid destructive deletes to prevent
    // accidentally revoking valid entitlements due to email mismatch.
    return { added: 0, removed: 0 }
  }

  const page = await dodoClient.subscriptions.list({
    customer_id: customer.customer_id,
    page_size: 100,
  } as any)

  const activeProducts = new Set<string>()
  const cancelledProducts = new Set<string>()
  const subscriptionMetadataPlanIds = new Set<string>()
  const items: any[] = (page as any)?.items || []
  for (const sub of items) {
    const status = (sub?.status || "").toLowerCase()
    const pid = sub?.product_id as string | undefined
    const metadata =
      typeof sub?.metadata === "object" && sub.metadata
        ? (sub.metadata as Record<string, unknown>)
        : null
    const metadataPlanId = readMetadataString(metadata, "planId", "plan_id")
    if (metadataPlanId) {
      subscriptionMetadataPlanIds.add(metadataPlanId)
    }
    if (!pid) continue
    if (ACTIVE_SUBSCRIPTION_STATUSES.has(status)) {
      activeProducts.add(pid)
      continue
    }
    if (INACTIVE_SUBSCRIPTION_STATUSES.has(status)) {
      cancelledProducts.add(pid)
    }
  }

  const latestSubscriptionPaymentById = new Map<
    string,
    SubscriptionPaymentSummary
  >()
  const allPayPage = await dodoClient.payments.list({
    customer_id: customer.customer_id,
    page_size: 100,
  } as any)
  const allPayments: any[] = (allPayPage as any)?.items || []
  for (const payment of allPayments) {
    const subscriptionId =
      typeof payment?.subscription_id === "string"
        ? payment.subscription_id
        : undefined
    if (!subscriptionId) continue

    const createdAtMs = Date.parse(payment?.created_at || "")
    const existing = latestSubscriptionPaymentById.get(subscriptionId)
    if (
      Number.isFinite(createdAtMs) &&
      (!existing || createdAtMs > existing.createdAtMs)
    ) {
      latestSubscriptionPaymentById.set(subscriptionId, {
        status: (payment?.status || "").toString().toLowerCase(),
        createdAtMs,
      })
    }
  }

  // Also consider successful one-time payments as entitlements
  const payPage = await dodoClient.payments.list({
    customer_id: customer.customer_id,
    status: "succeeded",
    page_size: 100,
  } as any)
  const oneTimeProducts = new Set<string>()
  const oneTimeProductPurchases: Array<{
    productId: string
    planId?: string
    externalId?: string
  }> = []
  const payments: any[] = (payPage as any)?.items || []
  for (const p of payments) {
    const metadata =
      typeof p?.metadata === "object" && p.metadata
        ? (p.metadata as Record<string, unknown>)
        : null
    const productId = readMetadataString(metadata, "productId", "product_id")
    const planId = readMetadataString(metadata, "planId", "plan_id")
    const cart = (p?.product_cart as any[]) || []
    for (const it of cart) {
      const pid = it?.product_id as string | undefined
      if (!pid) continue
      oneTimeProducts.add(pid)
      if (productId) {
        oneTimeProductPurchases.push({
          productId,
          planId,
          externalId: pid,
        })
      }
    }
    if (productId && planId && cart.length === 0) {
      oneTimeProductPurchases.push({ productId, planId })
    }
  }

  const externalPlanIds = Array.from(
    new Set([...activeProducts, ...cancelledProducts, ...oneTimeProducts]),
  ).filter(Boolean)
  const internalPlanIds = Array.from(
    new Set([
      ...oneTimeProductPurchases.map((purchase) => purchase.planId),
      ...subscriptionMetadataPlanIds,
    ]),
  ).filter(Boolean) as string[]
  const planWhere: Prisma.PlanWhereInput[] = []
  if (externalPlanIds.length) {
    planWhere.push({ externalId: { in: externalPlanIds } })
  }
  if (internalPlanIds.length) {
    planWhere.push({ id: { in: internalPlanIds } })
  }

  const plans = planWhere.length
    ? ((await prisma.plan.findMany({
        where: { OR: planWhere },
        select: {
          id: true,
          externalId: true,
          type: true,
          boostForDays: true,
          isDefault: true,
          price: true,
        },
      })) as PlanSummary[])
    : []
  const byExternal: Record<string, string> = {}
  const planById = new Map<string, PlanSummary>()
  for (const p of plans) {
    planById.set(p.id, p)
    if (p.externalId) byExternal[p.externalId] = p.id
  }

  const subscriptionEntitlementExternalIds = await syncProductPlanSubscriptions(
    {
      userId: user.id,
      subscriptions: items,
      planById,
      planIdByExternal: byExternal,
      latestSubscriptionPaymentById,
    },
  )
  await syncProductPlanPayments({
    userId: user.id,
    purchases: oneTimeProductPurchases,
    planById,
    planIdByExternal: byExternal,
  })

  let added = 0
  for (const pid of new Set<string>([
    ...subscriptionEntitlementExternalIds,
    ...oneTimeProducts,
  ])) {
    const planId = byExternal[pid]
    if (!planId) continue
    await prisma.userPlanPurchase.upsert({
      where: { userId_planId: { userId: user.id, planId } },
      update: {},
      create: { userId: user.id, planId, externalId: undefined },
    })
    added++
  }

  // Only remove entitlements for products that are cancelled AND not otherwise
  // protected by an active subscription or successful one-time payment.
  const protectedPids = new Set<string>([
    ...subscriptionEntitlementExternalIds,
    ...oneTimeProducts,
  ])
  const removablePids = Array.from(cancelledProducts).filter(
    (pid) => !protectedPids.has(pid),
  )
  if (removablePids.length === 0) {
    return { added, removed: 0 }
  }

  const removed = await prisma.userPlanPurchase.deleteMany({
    where: {
      userId: user.id,
      plan: { externalId: { in: removablePids } },
    },
  })

  return { added, removed: removed.count }
}

async function syncProductPlanSubscriptions(args: {
  userId: string
  subscriptions: any[]
  planById: Map<string, PlanSummary>
  planIdByExternal: Record<string, string>
  latestSubscriptionPaymentById: Map<string, SubscriptionPaymentSummary>
}) {
  const activeByProductId = new Map<
    string,
    { plan: PlanSummary; subscriptionId?: string }
  >()
  const inactiveByProductId = new Map<string, PlanSummary>()

  for (const sub of args.subscriptions) {
    const status = (sub?.status || "").toLowerCase()
    const isActive = ACTIVE_SUBSCRIPTION_STATUSES.has(status)
    const isInactive = INACTIVE_SUBSCRIPTION_STATUSES.has(status)
    if (!isActive && !isInactive) continue

    const metadata =
      typeof sub?.metadata === "object" && sub.metadata
        ? (sub.metadata as Record<string, unknown>)
        : null
    const productId = readMetadataString(metadata, "productId", "product_id")
    if (!productId) continue

    const planIdFromMeta = readMetadataString(metadata, "planId", "plan_id")
    const productExternalId =
      typeof sub?.product_id === "string" ? sub.product_id : undefined
    const rawSubscriptionId = (sub as any)?.subscription_id || (sub as any)?.id
    const subscriptionId =
      typeof rawSubscriptionId === "string" ? rawSubscriptionId : undefined
    const planIdFromExternal = productExternalId
      ? args.planIdByExternal[productExternalId]
      : undefined
    const latestPayment = subscriptionId
      ? args.latestSubscriptionPaymentById.get(subscriptionId)
      : undefined
    const hasPendingPlanChange =
      Boolean(
        planIdFromMeta &&
        planIdFromExternal &&
        planIdFromMeta !== planIdFromExternal,
      ) && latestPayment?.status !== "succeeded"

    // Dodo may update subscription.product_id as soon as a plan change is
    // initiated, while the payment is still processing. Keep the local product
    // on the metadata/current plan until the latest subscription payment
    // succeeds.
    const planId =
      (hasPendingPlanChange ? planIdFromMeta : planIdFromExternal) ||
      planIdFromMeta
    if (!planId) continue

    const plan = args.planById.get(planId)
    if (!plan || plan.type !== PlanType.recurring_price) continue

    if (isActive) {
      const existing = activeByProductId.get(productId)
      if (!existing || plan.price > existing.plan.price) {
        activeByProductId.set(productId, { plan, subscriptionId })
      }
      continue
    }

    if (!activeByProductId.has(productId)) {
      inactiveByProductId.set(productId, plan)
    }
  }

  if (!activeByProductId.size && !inactiveByProductId.size) {
    return []
  }

  const activeExternalPlanIds = Array.from(
    new Set(
      Array.from(activeByProductId.values())
        .map(({ plan }) => plan.externalId)
        .filter((externalId): externalId is string => Boolean(externalId)),
    ),
  )

  const productIds = Array.from(
    new Set([...activeByProductId.keys(), ...inactiveByProductId.keys()]),
  )

  const [products, defaultPlan] = await Promise.all([
    prisma.product.findMany({
      where: { id: { in: productIds }, userId: args.userId },
      select: {
        id: true,
        status: true,
        planId: true,
        planAssignedAt: true,
        subscriptionId: true,
        plan: { select: { boostForDays: true, isDefault: true, type: true } },
      },
    }),
    prisma.plan.findFirst({ where: { isDefault: true }, select: { id: true } }),
  ])

  const productById = new Map(products.map((product) => [product.id, product]))
  const updates: Array<ReturnType<typeof prisma.product.update>> = []
  const touchedProductIds = new Set<string>()

  for (const [
    productId,
    { plan, subscriptionId },
  ] of activeByProductId.entries()) {
    const product = productById.get(productId)
    if (!product) continue
    const shouldUpdateSubscriptionId =
      subscriptionId && product.subscriptionId !== subscriptionId
    const shouldPublish = product.status !== ProductStatus.published
    if (
      product.planId === plan.id &&
      product.planAssignedAt &&
      !shouldUpdateSubscriptionId &&
      !shouldPublish
    ) {
      continue
    }

    const planAssignedAt = resolvePlanAssignedAt({
      currentPlan: product.plan,
      currentAssignedAt: product.planAssignedAt,
      newPlan: plan,
    })

    const data: Prisma.ProductUncheckedUpdateInput = {
      planId: plan.id,
      planAssignedAt,
      ...(subscriptionId ? { subscriptionId } : {}),
      ...publishProductData(product.status),
    }
    updates.push(
      prisma.product.update({
        where: { id: productId },
        data,
      }),
    )
    touchedProductIds.add(productId)
  }

  if (defaultPlan) {
    for (const [productId, plan] of inactiveByProductId.entries()) {
      if (activeByProductId.has(productId)) continue
      const product = productById.get(productId)
      if (!product) continue
      if (product.planId !== plan.id) continue
      if (product.plan?.type !== PlanType.recurring_price) continue

      updates.push(
        prisma.product.update({
          where: { id: productId },
          data: {
            planId: defaultPlan.id,
            planAssignedAt: null,
            subscriptionId: null,
          },
        }),
      )
      touchedProductIds.add(productId)
    }
  }

  if (updates.length) {
    await Promise.all(updates)
    revalidateProductsAfterBillingSync(Array.from(touchedProductIds))
    await refreshHomepageFeedCacheAfterBillingSync()
    await invalidateProductAnalyticsAfterBillingSync(
      Array.from(touchedProductIds),
    )
  }

  return activeExternalPlanIds
}

async function syncProductPlanPayments(args: {
  userId: string
  purchases: Array<{ productId: string; planId?: string; externalId?: string }>
  planById: Map<string, PlanSummary>
  planIdByExternal: Record<string, string>
}) {
  const activeByProductId = new Map<string, PlanSummary>()

  for (const purchase of args.purchases) {
    const planId =
      (purchase.planId && args.planById.has(purchase.planId)
        ? purchase.planId
        : undefined) ||
      (purchase.externalId ? args.planIdByExternal[purchase.externalId] : null)
    if (!planId) continue

    const plan = args.planById.get(planId)
    if (!plan || plan.type !== PlanType.one_time_price) continue

    const existing = activeByProductId.get(purchase.productId)
    if (!existing || plan.price > existing.price) {
      activeByProductId.set(purchase.productId, plan)
    }
  }

  if (!activeByProductId.size) return

  const products = await prisma.product.findMany({
    where: {
      id: { in: Array.from(activeByProductId.keys()) },
      userId: args.userId,
    },
    select: {
      id: true,
      status: true,
      planId: true,
      planAssignedAt: true,
      plan: { select: { boostForDays: true, isDefault: true, type: true } },
    },
  })

  const productById = new Map(products.map((product) => [product.id, product]))
  const updates: Array<ReturnType<typeof prisma.product.update>> = []
  const touchedProductIds = new Set<string>()

  for (const [productId, plan] of activeByProductId.entries()) {
    const product = productById.get(productId)
    if (!product) continue

    const shouldPublish = product.status !== ProductStatus.published
    if (
      product.planId === plan.id &&
      product.planAssignedAt &&
      !shouldPublish
    ) {
      continue
    }

    const planAssignedAt = resolvePlanAssignedAt({
      currentPlan: product.plan,
      currentAssignedAt: product.planAssignedAt,
      newPlan: plan,
    })

    updates.push(
      prisma.product.update({
        where: { id: productId },
        data: {
          planId: plan.id,
          planAssignedAt,
          subscriptionId: null,
          ...publishProductData(product.status),
        },
      }),
    )
    touchedProductIds.add(productId)
  }

  if (updates.length) {
    await Promise.all(updates)
    revalidateProductsAfterBillingSync(Array.from(touchedProductIds))
    await refreshHomepageFeedCacheAfterBillingSync()
    await invalidateProductAnalyticsAfterBillingSync(
      Array.from(touchedProductIds),
    )
  }
}

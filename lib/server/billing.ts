"use server"

import { auth } from "@clerk/nextjs/server"
import prisma from "@/lib/prisma"
import { dodoClient } from "@/lib/dodo"
import { fetchDodoCustomerByEmail } from "@/lib/fetchDodoCustomer"
import { resolvePlanAssignedAt } from "@/lib/server/planAssignment"
import { PlanType, Prisma } from "@/lib/vendor/prisma/client"
import { readMetadataString } from "@/lib/server/subscriptionMetadata"
import {
  getActiveUserByClerkId,
  INACTIVE_ACCOUNT_MESSAGE,
} from "@/lib/server/userStatus"

type PlanSummary = {
  id: string
  externalId: string | null
  type: PlanType
  boostForDays: number | null
  isDefault: boolean
  price: number
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
  const items: any[] = (page as any)?.items || []
  for (const sub of items) {
    const status = (sub?.status || "").toLowerCase()
    const pid = sub?.product_id as string | undefined
    if (!pid) continue
    if (ACTIVE_SUBSCRIPTION_STATUSES.has(status)) {
      activeProducts.add(pid)
      continue
    }
    if (INACTIVE_SUBSCRIPTION_STATUSES.has(status)) {
      cancelledProducts.add(pid)
    }
  }

  // Also consider successful one-time payments as entitlements
  const payPage = await dodoClient.payments.list({
    customer_id: customer.customer_id,
    status: "succeeded",
    page_size: 100,
  } as any)
  const oneTimeProducts = new Set<string>()
  const payments: any[] = (payPage as any)?.items || []
  for (const p of payments) {
    const cart = (p?.product_cart as any[]) || []
    for (const it of cart) {
      const pid = it?.product_id as string | undefined
      if (pid) oneTimeProducts.add(pid)
    }
  }

  const plans = (await prisma.plan.findMany({
    where: {
      externalId: {
        in: Array.from(
          new Set([
            ...activeProducts,
            ...cancelledProducts,
            ...oneTimeProducts,
          ]),
        ),
      },
    },
    select: {
      id: true,
      externalId: true,
      type: true,
      boostForDays: true,
      isDefault: true,
      price: true,
    },
  })) as PlanSummary[]
  const byExternal: Record<string, string> = {}
  const planById = new Map<string, PlanSummary>()
  for (const p of plans) {
    planById.set(p.id, p)
    if (p.externalId) byExternal[p.externalId] = p.id
  }

  await syncProductPlanSubscriptions({
    userId: user.id,
    subscriptions: items,
    planById,
    planIdByExternal: byExternal,
  })

  let added = 0
  for (const pid of new Set<string>([...activeProducts, ...oneTimeProducts])) {
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
  const protectedPids = new Set<string>([...activeProducts, ...oneTimeProducts])
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
    const planId =
      (productExternalId ? args.planIdByExternal[productExternalId] : undefined) ||
      planIdFromMeta
    if (!planId) continue

    const plan = args.planById.get(planId)
    if (!plan || plan.type !== PlanType.recurring_price) continue
    const rawSubscriptionId = (sub as any)?.subscription_id || (sub as any)?.id
    const subscriptionId =
      typeof rawSubscriptionId === "string" ? rawSubscriptionId : undefined

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
    return
  }

  const productIds = Array.from(
    new Set([
      ...activeByProductId.keys(),
      ...inactiveByProductId.keys(),
    ]),
  )

  const [products, defaultPlan] = await Promise.all([
    prisma.product.findMany({
      where: { id: { in: productIds }, userId: args.userId },
      select: {
        id: true,
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

  for (const [productId, { plan, subscriptionId }] of activeByProductId.entries()) {
    const product = productById.get(productId)
    if (!product) continue
    const shouldUpdateSubscriptionId =
      subscriptionId && product.subscriptionId !== subscriptionId
    if (product.planId === plan.id && product.planAssignedAt && !shouldUpdateSubscriptionId) {
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
    }
    updates.push(
      prisma.product.update({
        where: { id: productId },
        data,
      }),
    )
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
          data: { planId: defaultPlan.id, planAssignedAt: null, subscriptionId: null },
        }),
      )
    }
  }

  if (updates.length) {
    await Promise.all(updates)
  }
}

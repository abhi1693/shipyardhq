"use server"

import { revalidatePath } from "next/cache"

import { auth } from "@clerk/nextjs/server"

import prisma from "@/lib/prisma"
import { redeem, requiresPlacementSchedule } from "@/lib/rewards/engine"
import {
  RewardsError,
  RewardsInsufficientBalanceError,
  RedemptionLimitError,
  RedemptionValidationError,
} from "@/lib/rewards/errors"
import {
  FeatureEntitlementStatus,
  RedemptionStatus,
  RewardTransactionType,
} from "@/lib/vendor/prisma/client"
import type { Prisma } from "@/lib/vendor/prisma/client"
import {
  getActiveUserByClerkId,
  INACTIVE_ACCOUNT_MESSAGE,
} from "@/lib/server/userStatus"
import {
  MEMBER_OVERVIEW_PATH,
  MEMBER_REWARDS_PATH,
  MEMBER_PRODUCTS_PATH,
} from "@/lib/routes"
import type { RedeemOptions } from "@/lib/rewards/types"

import type { MemberRewardsSnapshot, RedeemFormState } from "./types"

const ACTIVE_ENTITLEMENT_STATUSES: FeatureEntitlementStatus[] = [
  FeatureEntitlementStatus.active,
  FeatureEntitlementStatus.pending,
  FeatureEntitlementStatus.paused,
]

async function requireCurrentUser() {
  const { userId } = await auth()
  if (!userId) {
    throw new Error("Unauthenticated")
  }
  const user = await getActiveUserByClerkId(userId)
  if (!user) {
    throw new Error(INACTIVE_ACCOUNT_MESSAGE)
  }
  return user
}

async function getAccessibleOrganizationIds(userId: string) {
  const memberships = await prisma.organizationMembership.findMany({
    where: { userId },
    select: { organizationId: true },
  })
  type Membership = (typeof memberships)[number]
  return memberships.map(
    (membership: Membership) => membership.organizationId,
  )
}

async function getProductOptions(userId: string) {
  const organizationIds = await getAccessibleOrganizationIds(userId)
  const productWhere = organizationIds.length
    ? {
        OR: [{ userId }, { organizationId: { in: organizationIds } }],
      }
    : { userId }

  type ProductWithOrgName = Prisma.ProductGetPayload<{
    include: { organization: { select: { name: true } } }
  }>

  // Edge Prisma client loses relation typing; assert shape for organization select
  const products = (await prisma.product.findMany({
    where: productWhere,
    include: {
      organization: { select: { name: true } },
    },
    orderBy: [{ name: "asc" }],
  })) as ProductWithOrgName[]

  return products.map((product) => ({
    id: product.id,
    name: product.name,
    slug: product.slug,
    status: product.status,
    organizationName: product.organization?.name ?? null,
  }))
}

export async function getMemberRewardsSnapshot(): Promise<MemberRewardsSnapshot> {
  const user = await requireCurrentUser()

  type FeatureKeyCount = { featureKey: string; _count: { featureKey: number } }

  const [
    balanceRecord,
    transactions,
    catalogItems,
    entitlements,
    redemptions,
    productOptions,
    activeCountsRaw,
    pendingCountsRaw,
  ] = await Promise.all([
    prisma.rewardBalance.findUnique({ where: { userId: user.id } }),
    prisma.rewardTransaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        rule: { select: { name: true, key: true } },
        catalogItem: { select: { name: true, featureKey: true } },
        product: { select: { id: true, name: true } },
      },
    }),
    prisma.rewardCatalogItem.findMany({
      where: { isActive: true },
      orderBy: [{ category: "asc" }, { baseCost: "asc" }, { name: "asc" }],
    }),
    prisma.featureEntitlement.findMany({
      where: {
        userId: user.id,
        status: { in: ACTIVE_ENTITLEMENT_STATUSES },
      },
      orderBy: { createdAt: "desc" },
      include: {
        catalogItem: { select: { name: true, featureKey: true } },
        product: { select: { id: true, name: true, slug: true } },
      },
      take: 20,
    }),
    prisma.redemption.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        catalogItem: { select: { name: true, featureKey: true } },
        placementSchedules: {
          select: { status: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        product: { select: { id: true, name: true, slug: true } },
      },
      take: 20,
    }),
    getProductOptions(user.id),
    prisma.featureEntitlement.groupBy({
      by: ["featureKey"],
      where: {
        userId: user.id,
        status: { in: ACTIVE_ENTITLEMENT_STATUSES },
      },
      _count: { featureKey: true },
    }),
    prisma.redemption.groupBy({
      by: ["featureKey"],
      where: {
        userId: user.id,
        status: RedemptionStatus.pending,
      },
      _count: { featureKey: true },
    }),
  ])

  const activeCounts = activeCountsRaw as FeatureKeyCount[]
  const pendingCounts = pendingCountsRaw as FeatureKeyCount[]

  const balance = {
    balance: balanceRecord?.balance ?? 0,
    lifetimeEarned: balanceRecord?.lifetimeEarned ?? 0,
    lifetimeSpent: balanceRecord?.lifetimeSpent ?? 0,
    lifetimeAdjusted: balanceRecord?.lifetimeAdjusted ?? 0,
    currentStreakCount: balanceRecord?.currentStreakCount ?? 0,
    longestStreakCount: balanceRecord?.longestStreakCount ?? 0,
    currentStreakTier: balanceRecord?.currentStreakTier ?? null,
    streakActiveThrough: balanceRecord?.streakActiveThrough ?? null,
    lastEarnedAt: balanceRecord?.lastEarnedAt ?? null,
    lastRedeemedAt: balanceRecord?.lastRedeemedAt ?? null,
  }

  const activeCountMap = new Map<string, number>()
  for (const item of activeCounts) {
    activeCountMap.set(item.featureKey, item._count.featureKey)
  }

  const pendingCountMap = new Map<string, number>()
  for (const item of pendingCounts) {
    pendingCountMap.set(item.featureKey, item._count.featureKey)
  }

  type CatalogItem = (typeof catalogItems)[number]
  const catalog = catalogItems.map((item: CatalogItem) => {
    const reasons: string[] = []
    const activeCount = activeCountMap.get(item.featureKey) ?? 0
    const pendingCount = pendingCountMap.get(item.featureKey) ?? 0

    if (balance.balance < item.baseCost) {
      reasons.push("Insufficient rewards")
    }

    if (item.maxActivePerUser != null && activeCount >= item.maxActivePerUser) {
      reasons.push("Active limit reached")
    }

    if (
      item.maxPendingPerUser != null &&
      pendingCount >= item.maxPendingPerUser
    ) {
      reasons.push("Pending limit reached")
    }

    if (item.requiresProduct && productOptions.length === 0) {
      reasons.push("Add a product to redeem")
    }

    const canAfford = balance.balance >= item.baseCost
    const canRedeem = reasons.length === 0
    const requiresSchedule = requiresPlacementSchedule(item)

    return {
      ...item,
      canAfford,
      canRedeem,
      reasons,
      activeCount,
      pendingCount,
      requiresSchedule,
    }
  })

  function extractAdjustmentAmount(
    metadata: Prisma.JsonValue | null,
  ): number | null {
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
      return null
    }

    const record = metadata as Record<string, unknown>

    const candidate =
      record.adjustment ?? record.adjustmentAmount ?? record.amount

    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      return candidate
    }

    if (typeof candidate === "string") {
      const parsed = Number(candidate)
      return Number.isFinite(parsed) ? parsed : null
    }

    if (
      candidate &&
      typeof candidate === "object" &&
      !Array.isArray(candidate)
    ) {
      const amount = (candidate as Record<string, unknown>).amount
      if (typeof amount === "number" && Number.isFinite(amount)) {
        return amount
      }
      if (typeof amount === "string") {
        const parsed = Number(amount)
        return Number.isFinite(parsed) ? parsed : null
      }
    }

    return null
  }

  type RewardTransaction = (typeof transactions)[number]
  const transactionsUi = transactions.map((transaction: RewardTransaction) => {
    const adjustmentAmount =
      transaction.type === RewardTransactionType.adjustment
        ? extractAdjustmentAmount(transaction.metadata)
        : null

    return {
      id: transaction.id,
      type: transaction.type,
      rewardAmount: transaction.rewardAmount,
      balanceAfter: transaction.balanceAfter,
      createdAt: transaction.createdAt,
      ruleKey: transaction.rule?.key ?? transaction.ruleKey,
      ruleName: transaction.rule?.name ?? null,
      rewardKey:
        transaction.catalogItem?.featureKey ?? transaction.rewardKey ?? null,
      rewardName: transaction.catalogItem?.name ?? null,
      productId: transaction.product?.id ?? null,
      productName: transaction.product?.name ?? null,
      metadata: transaction.metadata,
      notes: transaction.notes ?? null,
      adjustmentAmount,
    }
  })

  type Entitlement = (typeof entitlements)[number]
  const activeEntitlementsUi = entitlements.map((entitlement: Entitlement) => ({
    id: entitlement.id,
    featureKey: entitlement.catalogItem?.featureKey ?? entitlement.featureKey,
    name: entitlement.catalogItem?.name ?? entitlement.featureKey,
    status: entitlement.status,
    startsAt: entitlement.startsAt,
    expiresAt: entitlement.expiresAt,
    productId: entitlement.product?.id ?? null,
    productName: entitlement.product?.name ?? null,
    productSlug: entitlement.product?.slug ?? null,
  }))

  type Redemption = (typeof redemptions)[number]
  const recentRedemptions = redemptions.map((redemption: Redemption) => ({
    id: redemption.id,
    featureKey: redemption.catalogItem?.featureKey ?? redemption.featureKey,
    name: redemption.catalogItem?.name ?? redemption.featureKey,
    status: redemption.status,
    cost: redemption.cost,
    createdAt: redemption.createdAt,
    startsAt: redemption.startsAt,
    activatedAt: redemption.activatedAt,
    expiresAt: redemption.expiresAt,
    productId: redemption.product?.id ?? null,
    productName: redemption.product?.name ?? null,
    productSlug: redemption.product?.slug ?? null,
    placementStatus: redemption.placementSchedules[0]?.status ?? null,
  }))

  return {
    balance,
    transactions: transactionsUi,
    catalog,
    activeEntitlements: activeEntitlementsUi,
    recentRedemptions,
    productOptions,
  }
}

export async function redeemCatalogItemAction(
  _prevState: RedeemFormState,
  formData: FormData,
): Promise<RedeemFormState> {
  const user = await requireCurrentUser()

  const featureKey = formData.get("featureKey")?.toString().trim()
  if (!featureKey) {
    return { status: "error", message: "Missing reward selection" }
  }

  const productIdRaw = formData.get("productId")?.toString().trim()
  const notesRaw = formData.get("notes")?.toString().trim()
  const slotKeyRaw = formData.get("slotKey")?.toString().trim()

  try {
    const catalogItem = await prisma.rewardCatalogItem.findUnique({
      where: { featureKey },
    })

    if (!catalogItem || !catalogItem.isActive) {
      return { status: "error", message: "Reward is no longer available" }
    }

    const requiresSchedule = requiresPlacementSchedule(catalogItem)

    if (catalogItem.requiresProduct && !productIdRaw) {
      return {
        status: "error",
        message: "Select a product to redeem this reward",
      }
    }

    let productId: string | undefined

    if (productIdRaw) {
      const organizationIds = await getAccessibleOrganizationIds(user.id)
      const product = await prisma.product.findFirst({
        where: organizationIds.length
          ? {
              id: productIdRaw,
              OR: [
                { userId: user.id },
                { organizationId: { in: organizationIds } },
              ],
            }
          : { id: productIdRaw, userId: user.id },
        select: { id: true },
      })

      if (!product) {
        return {
          status: "error",
          message: "You do not have access to that product",
        }
      }

      productId = product.id
    }

    if (catalogItem.requiresProduct && !productId) {
      return {
        status: "error",
        message: "Select a product to redeem this reward",
      }
    }

    const options: RedeemOptions = {
      productId,
      notes: notesRaw && notesRaw.length ? notesRaw : undefined,
    }

    if (requiresSchedule) {
      if (catalogItem.durationSeconds == null) {
        return {
          status: "error",
          message: "Placement reward is missing duration configuration",
        }
      }
      const now = new Date()
      const startsAt = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate(),
          now.getUTCHours(),
          now.getUTCMinutes(),
          now.getUTCSeconds(),
          now.getUTCMilliseconds(),
        ),
      )
      options.reservation = {
        startsAt,
        durationSeconds: catalogItem.durationSeconds,
        slotKey:
          slotKeyRaw && slotKeyRaw.length
            ? slotKeyRaw
            : `${featureKey}:default`,
      }
    }

    const result = await redeem(user.id, featureKey, options)

    revalidatePath(MEMBER_REWARDS_PATH)
    revalidatePath(MEMBER_PRODUCTS_PATH)
    revalidatePath(MEMBER_OVERVIEW_PATH)

    return {
      status: "success",
      redemptionId: result.redemption.id,
      balanceAfter: result.transaction.balanceAfter,
      message: `Redeemed ${result.catalogItem.name}`,
    }
  } catch (error) {
    console.error("Failed to redeem catalog item", error)

    if (error instanceof RewardsInsufficientBalanceError) {
      return { status: "error", message: "You do not have enough rewards" }
    }
    if (error instanceof RedemptionLimitError) {
      return {
        status: "error",
        message: "You reached the limit for this reward",
      }
    }
    if (error instanceof RedemptionValidationError) {
      return { status: "error", message: error.message }
    }
    if (error instanceof RewardsError) {
      return { status: "error", message: error.message }
    }
    return {
      status: "error",
      message: "We couldn't complete that redemption",
    }
  }
}

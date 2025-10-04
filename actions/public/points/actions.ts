import prisma from "@/lib/prisma"
import { accelerateTags, DEFAULT_SWR, DEFAULT_TTL, TAGS } from "@/lib/cache"
import {
  PointTransactionType,
  RedemptionStatus,
  type RewardFeatureCategory,
  type RewardRuleCategory,
} from "@/lib/vendor/prisma/client"

type RuleUsageGroup = {
  ruleId: string | null
  ruleKey: string | null
  _sum: { points: number | null }
  _count: { _all: number }
}

type CatalogItemRecord = {
  featureKey: string
  name: string
  description: string | null
  category: RewardFeatureCategory
  baseCost: number
  durationSeconds: number | null
  requiresProduct: boolean
  maxActivePerUser: number | null
  maxPendingPerUser: number | null
}

type RedemptionRecord = {
  id: string
  featureKey: string
  cost: number
  status: RedemptionStatus
  createdAt: Date
  catalogItem?: { name: string | null } | null
  product?: { name: string | null; slug: string | null } | null
  [key: string]: unknown
}

type RuleRecord = {
  id: string
  name: string
  description: string | null
  category: RewardRuleCategory
  basePoints: number
  dailyCap: number | null
  lifetimeCap: number | null
}

const THIRTY_DAYS_MS = 1000 * 60 * 60 * 24 * 30
const NINETY_DAYS_MS = 1000 * 60 * 60 * 24 * 90

export type PublicPointsRule = {
  id: string
  name: string
  description: string | null
  category: RewardRuleCategory
  basePoints: number
  dailyCap: number | null
  lifetimeCap: number | null
  totalAwarded: number
  awardCount: number
}

export type PublicPointsReward = {
  featureKey: string
  name: string
  description: string | null
  category: RewardFeatureCategory
  baseCost: number
  durationSeconds: number | null
  requiresProduct: boolean
  maxActivePerUser: number | null
  maxPendingPerUser: number | null
  redemptionCount: number
}

export type PublicPointsRedemption = {
  id: string
  featureKey: string
  name: string | null
  productName: string | null
  productSlug: string | null
  cost: number
  status: RedemptionStatus
  createdAt: Date
}

export type PublicPointsStats = {
  membersWithPoints: number
  activeBalances: number
  earnedLast30d: {
    points: number
    transactions: number
  }
  spentLast30d: {
    points: number
    redemptions: number
  }
}

export type PublicPointsData = {
  stats: PublicPointsStats
  topRules: PublicPointsRule[]
  rewards: PublicPointsReward[]
  recentRedemptions: PublicPointsRedemption[]
}

const pointsCache = {
  ttl: DEFAULT_TTL.fast,
  swr: DEFAULT_SWR.fast,
  tags: accelerateTags([TAGS.points]),
} as const

export async function getPublicPointsData(): Promise<PublicPointsData> {
  const now = Date.now()
  const thirtyDaysAgo = new Date(now - THIRTY_DAYS_MS)
  const ninetyDaysAgo = new Date(now - NINETY_DAYS_MS)

  const [
    membersWithPoints,
    activeBalances,
    earnedAggregateRaw,
    spentAggregateRaw,
    redeemedCountLast30d,
    ruleUsageRaw,
    ruleRecordsRaw,
    catalogItemsRaw,
    redemptionCountsRaw,
    recentRedemptionsRaw,
  ] = await Promise.all([
    prisma.pointBalance.count({
      where: { lifetimeEarned: { gt: 0 } },
      cacheStrategy: {
        ...pointsCache,
        tags: accelerateTags([TAGS.points, "points:stats"]),
      },
    }),
    prisma.pointBalance.count({
      where: { balance: { gt: 0 } },
      cacheStrategy: {
        ...pointsCache,
        tags: accelerateTags([TAGS.points, "points:stats"]),
      },
    }),
    prisma.pointTransaction.aggregate({
      where: {
        type: PointTransactionType.earn,
        createdAt: { gte: thirtyDaysAgo },
      },
      _sum: { points: true },
      _count: { _all: true },
      cacheStrategy: {
        ...pointsCache,
        tags: accelerateTags([TAGS.points, "points:earned:30d"]),
      },
    }),
    prisma.pointTransaction.aggregate({
      where: {
        type: PointTransactionType.spend,
        createdAt: { gte: thirtyDaysAgo },
      },
      _sum: { points: true },
      _count: { _all: true },
      cacheStrategy: {
        ...pointsCache,
        tags: accelerateTags([TAGS.points, "points:spent:30d"]),
      },
    }),
    prisma.redemption.count({
      where: {
        createdAt: { gte: thirtyDaysAgo },
        status: {
          in: [
            RedemptionStatus.pending,
            RedemptionStatus.active,
            RedemptionStatus.refunded,
          ],
        },
      },
      cacheStrategy: {
        ...pointsCache,
        tags: accelerateTags([TAGS.points, "points:redemptions:30d"]),
      },
    }),
    prisma.pointTransaction.groupBy({
      by: ["ruleId", "ruleKey"],
      where: {
        type: PointTransactionType.earn,
        createdAt: { gte: ninetyDaysAgo },
        ruleId: { not: null },
      },
      _sum: { points: true },
      _count: { _all: true },
      orderBy: { _sum: { points: "desc" } },
      take: 8,
      cacheStrategy: {
        ...pointsCache,
        tags: accelerateTags([TAGS.points, "points:rules"]),
      },
    }),
    prisma.rewardRule.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        basePoints: true,
        dailyCap: true,
        lifetimeCap: true,
      },
      cacheStrategy: {
        ...pointsCache,
        tags: accelerateTags([TAGS.points, "points:rules"]),
      },
    }),
    prisma.rewardCatalogItem.findMany({
      where: { isActive: true },
      select: {
        featureKey: true,
        name: true,
        description: true,
        category: true,
        baseCost: true,
        durationSeconds: true,
        requiresProduct: true,
        maxActivePerUser: true,
        maxPendingPerUser: true,
      },
      orderBy: [
        { category: "asc" },
        { baseCost: "asc" },
        { name: "asc" },
      ],
      cacheStrategy: {
        ...pointsCache,
        tags: accelerateTags([TAGS.points, "points:rewards"]),
      },
    }),
    prisma.redemption.groupBy({
      by: ["featureKey"],
      where: {
        createdAt: { gte: ninetyDaysAgo },
        status: {
          in: [
            RedemptionStatus.pending,
            RedemptionStatus.active,
            RedemptionStatus.refunded,
          ],
        },
      },
      _count: { _all: true },
      cacheStrategy: {
        ...pointsCache,
        tags: accelerateTags([TAGS.points, "points:reward-usage"]),
      },
    }),
    prisma.redemption.findMany({
      where: {
        status: {
          in: [
            RedemptionStatus.active,
            RedemptionStatus.pending,
            RedemptionStatus.refunded,
          ],
        },
      },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        featureKey: true,
        cost: true,
        status: true,
        createdAt: true,
        catalogItem: { select: { name: true } },
        product: { select: { name: true, slug: true } },
      },
      cacheStrategy: {
        ...pointsCache,
        tags: accelerateTags([TAGS.points, "points:redemptions:recent"]),
      },
    }),
  ])

  const earnedAggregate = earnedAggregateRaw ?? {
    _sum: { points: 0 },
    _count: { _all: 0 },
  }
  const spentAggregate = spentAggregateRaw ?? {
    _sum: { points: 0 },
    _count: { _all: 0 },
  }

  const ruleUsage = (ruleUsageRaw as RuleUsageGroup[]).filter(
    (entry) => entry.ruleId && (entry._sum.points ?? 0) > 0,
  )
  const ruleRecords = new Map(
    (ruleRecordsRaw as RuleRecord[]).map((rule) => [rule.id, rule]),
  )

  const topRules: PublicPointsRule[] = ruleUsage
    .map((entry) => {
      const id = entry.ruleId as string
      const record = ruleRecords.get(id)
      if (!record) return null
      return {
        id,
        name: record.name,
        description: record.description,
        category: record.category,
        basePoints: record.basePoints,
        dailyCap: record.dailyCap,
        lifetimeCap: record.lifetimeCap,
        totalAwarded: entry._sum.points ?? 0,
        awardCount: entry._count._all,
      }
    })
    .filter((rule): rule is PublicPointsRule => Boolean(rule))

  const redemptionCounts = new Map<string, number>(
    (redemptionCountsRaw as { featureKey: string; _count: { _all: number } }[]).map(
      (entry) => [entry.featureKey, entry._count._all],
    ),
  )

  const rewards: PublicPointsReward[] = (catalogItemsRaw as CatalogItemRecord[]).map(
    (item) => ({
      featureKey: item.featureKey,
      name: item.name,
      description: item.description,
      category: item.category,
      baseCost: item.baseCost,
      durationSeconds: item.durationSeconds,
      requiresProduct: item.requiresProduct,
      maxActivePerUser: item.maxActivePerUser,
      maxPendingPerUser: item.maxPendingPerUser,
      redemptionCount: redemptionCounts.get(item.featureKey) ?? 0,
    }),
  )

  const recentRedemptions: PublicPointsRedemption[] = (
    recentRedemptionsRaw as RedemptionRecord[]
  ).map((item) => ({
    id: item.id,
    featureKey: item.featureKey,
    name: item.catalogItem?.name ?? null,
    productName: item.product?.name ?? null,
    productSlug: item.product?.slug ?? null,
    cost: item.cost,
    status: item.status,
    createdAt: item.createdAt,
  }))

  return {
    stats: {
      membersWithPoints,
      activeBalances,
      earnedLast30d: {
        points: earnedAggregate._sum?.points ?? 0,
        transactions: earnedAggregate._count?._all ?? 0,
      },
      spentLast30d: {
        points: spentAggregate._sum?.points ?? 0,
        redemptions: redeemedCountLast30d,
      },
    },
    topRules,
    rewards,
    recentRedemptions,
  }
}

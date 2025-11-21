import prisma from "@/lib/prisma"
import { cached, DEFAULT_TTL, TAGS } from "@/lib/cache"
import {
  RewardTransactionType,
  RedemptionStatus,
  type RewardFeatureCategory,
  type RewardRuleCategory,
  type Prisma,
} from "@/lib/vendor/prisma/client"
import {
  normalizeRewardsLeaderboardLimit,
  REWARDS_LEADERBOARD_DEFAULT_LIMIT,
} from "@/lib/rewards/leaderboard"

type RuleUsageGroup = {
  ruleId: string | null
  ruleKey: string | null
  _sum: { rewardAmount: number | null }
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
  baseRewardAmount: number
  dailyCap: number | null
  lifetimeCap: number | null
}

const THIRTY_DAYS_MS = 1000 * 60 * 60 * 24 * 30
const NINETY_DAYS_MS = 1000 * 60 * 60 * 24 * 90

export type PublicRewardsRule = {
  id: string
  name: string
  description: string | null
  category: RewardRuleCategory
  baseRewardAmount: number
  dailyCap: number | null
  lifetimeCap: number | null
  totalAwarded: number
  awardCount: number
}

export type PublicRewardsReward = {
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

export type PublicRewardsRedemption = {
  id: string
  featureKey: string
  name: string | null
  productName: string | null
  productSlug: string | null
  cost: number
  status: RedemptionStatus
  createdAt: Date
}

export type PublicRewardsStats = {
  membersWithRewards: number
  activeBalances: number
  earnedLast30d: {
    rewardAmount: number
    transactions: number
  }
  spentLast30d: {
    rewardAmount: number
    redemptions: number
  }
}

export type RewardsLeaderboardEntry = Prisma.RewardBalanceGetPayload<{
  select: {
    userId: true
    balance: true
    lifetimeEarned: true
    lifetimeSpent: true
    lifetimeAdjusted: true
    lifetimeRefunded: true
    updatedAt: true
    currentStreakCount: true
    longestStreakCount: true
    lastEarnedAt: true
    lastRedeemedAt: true
    user: {
      select: {
        id: true
        clerkId: true
        firstName: true
        lastName: true
        _count: {
          select: {
            products: {
              where: { status: "published" }
            }
          }
        }
      }
    }
  }
}>

export const getRewardsLeaderboardEntries = cached(
  async (limit = REWARDS_LEADERBOARD_DEFAULT_LIMIT) => {
    const normalizedLimit = normalizeRewardsLeaderboardLimit(limit)

    const rows = await prisma.rewardBalance.findMany({
      take: normalizedLimit,
      where: {
        lifetimeEarned: { gt: 0 },
        user: { status: "active" },
      },
      orderBy: [{ lifetimeEarned: "desc" }, { updatedAt: "desc" }],
      select: {
        userId: true,
        balance: true,
        lifetimeEarned: true,
        lifetimeSpent: true,
        lifetimeAdjusted: true,
        lifetimeRefunded: true,
        updatedAt: true,
        currentStreakCount: true,
        longestStreakCount: true,
        lastEarnedAt: true,
        lastRedeemedAt: true,
        user: {
          select: {
            id: true,
            clerkId: true,
            firstName: true,
            lastName: true,
            _count: {
              select: {
                products: {
                  where: { status: "published" },
                },
              },
            },
          },
        },
      },
    })

    return rows as unknown as RewardsLeaderboardEntry[]
  },
  "rewards:leaderboard",
  {
    keyParts: ([limit]) => [
      `limit:${normalizeRewardsLeaderboardLimit(
        typeof limit === "number" ? limit : REWARDS_LEADERBOARD_DEFAULT_LIMIT,
      )}`,
    ],
    ttl: DEFAULT_TTL.fast,
    tags: ([limit]) => [
      TAGS.rewards,
      TAGS.rewardsLeaderboard,
      `rewards:leaderboard:limit:${normalizeRewardsLeaderboardLimit(
        typeof limit === "number" ? limit : REWARDS_LEADERBOARD_DEFAULT_LIMIT,
      )}`,
    ],
  },
)

export type RewardsLeaderboardPosition = {
  rank: number
  totalEligible: number
  lifetimeEarned: number
  launchCount: number
}

export const getRewardsLeaderboardPositionForUser = cached(
  async (userId: string): Promise<RewardsLeaderboardPosition | null> => {
    if (!userId) return null

    const balance = await prisma.rewardBalance.findUnique({
      where: { userId },
      select: {
        lifetimeEarned: true,
        updatedAt: true,
        user: {
          select: {
            status: true,
            _count: {
              select: {
                products: {
                  where: { status: "published" },
                },
              },
            },
          },
        },
      },
    })

    if (
      !balance ||
      balance.lifetimeEarned <= 0 ||
      balance.user?.status !== "active"
    ) {
      return null
    }

    const [aheadCount, eligibleCount] = await Promise.all([
      prisma.rewardBalance.count({
        where: {
          user: { status: "active" },
          lifetimeEarned: { gt: 0 },
          OR: [
            { lifetimeEarned: { gt: balance.lifetimeEarned } },
            {
              AND: [
                { lifetimeEarned: balance.lifetimeEarned },
                { updatedAt: { gt: balance.updatedAt } },
              ],
            },
          ],
        },
      }),
      prisma.rewardBalance.count({
        where: {
          user: { status: "active" },
          lifetimeEarned: { gt: 0 },
        },
      }),
    ])

    return {
      rank: aheadCount + 1,
      totalEligible: eligibleCount,
      lifetimeEarned: balance.lifetimeEarned,
      launchCount: balance.user?._count.products ?? 0,
    }
  },
  "rewards:leaderboard:user-position",
  {
    ttl: DEFAULT_TTL.fast,
    tags: ([userId]) => [
      TAGS.rewards,
      TAGS.rewardsLeaderboard,
      TAGS.user(String(userId)),
    ],
  },
)

export type PublicRewardsData = {
  stats: PublicRewardsStats
  rules: PublicRewardsRule[]
  rewards: PublicRewardsReward[]
  recentRedemptions: PublicRewardsRedemption[]
}

export const getPublicRewardsStats = cached(
  async (): Promise<PublicRewardsStats> => {
    const now = Date.now()
    const thirtyDaysAgo = new Date(now - THIRTY_DAYS_MS)

    const [
      membersWithRewards,
      activeBalances,
      earnedAggregateRaw,
      spentAggregateRaw,
      redeemedCountLast30d,
    ] = await Promise.all([
      prisma.rewardBalance.count({
        where: { lifetimeEarned: { gt: 0 } },
      }),
      prisma.rewardBalance.count({
        where: { balance: { gt: 0 } },
      }),
      prisma.rewardTransaction.aggregate({
        where: {
          type: RewardTransactionType.earn,
          createdAt: { gte: thirtyDaysAgo },
        },
        _sum: { rewardAmount: true },
        _count: { _all: true },
      }),
      prisma.rewardTransaction.aggregate({
        where: {
          type: RewardTransactionType.spend,
          createdAt: { gte: thirtyDaysAgo },
        },
        _sum: { rewardAmount: true },
        _count: { _all: true },
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
      }),
    ])

    return {
      membersWithRewards,
      activeBalances,
      earnedLast30d: {
        rewardAmount: earnedAggregateRaw._sum.rewardAmount ?? 0,
        transactions: earnedAggregateRaw._count._all ?? 0,
      },
      spentLast30d: {
        rewardAmount: spentAggregateRaw._sum.rewardAmount ?? 0,
        redemptions: redeemedCountLast30d,
      },
    }
  },
  "rewards:public-stats",
  {
    ttl: 300,
    tags: () => [TAGS.rewards, "rewards:stats"],
  },
)

export async function getPublicRewardsData(): Promise<PublicRewardsData> {
  const now = Date.now()
  const ninetyDaysAgo = new Date(now - NINETY_DAYS_MS)

  const [
    stats,
    ruleUsageRaw,
    ruleRecordsRaw,
    catalogItemsRaw,
    redemptionCountsRaw,
    recentRedemptionsRaw,
  ] = await Promise.all([
    getPublicRewardsStats(),
    prisma.rewardTransaction.groupBy({
      by: ["ruleId", "ruleKey"],
      where: {
        type: RewardTransactionType.earn,
        createdAt: { gte: ninetyDaysAgo },
        ruleId: { not: null },
      },
      _sum: { rewardAmount: true },
      _count: { _all: true },
      orderBy: { _sum: { rewardAmount: "desc" } },
      take: 8,
    }),
    prisma.rewardRule.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        baseRewardAmount: true,
        dailyCap: true,
        lifetimeCap: true,
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
      orderBy: [{ category: "asc" }, { baseCost: "asc" }, { name: "asc" }],
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
      take: 4,
      select: {
        id: true,
        featureKey: true,
        cost: true,
        status: true,
        createdAt: true,
        catalogItem: { select: { name: true } },
        product: { select: { name: true, slug: true } },
      },
    }),
  ])

  const ruleUsageEntries = (ruleUsageRaw as RuleUsageGroup[]).filter(
    (entry) => entry.ruleId,
  )
  const usageByRuleId = new Map<string, RuleUsageGroup>(
    ruleUsageEntries.map((entry) => [entry.ruleId as string, entry]),
  )

  const rules: PublicRewardsRule[] = (ruleRecordsRaw as RuleRecord[]).map(
    (rule) => {
      const usage = usageByRuleId.get(rule.id)
      return {
        id: rule.id,
        name: rule.name,
        description: rule.description,
        category: rule.category,
        baseRewardAmount: rule.baseRewardAmount,
        dailyCap: rule.dailyCap,
        lifetimeCap: rule.lifetimeCap,
        totalAwarded: usage?._sum.rewardAmount ?? 0,
        awardCount: usage?._count._all ?? 0,
      }
    },
  )

  rules.sort((a, b) => {
    if (a.baseRewardAmount === b.baseRewardAmount) {
      if (a.totalAwarded === b.totalAwarded) {
        if (a.awardCount === b.awardCount) {
          return a.name.localeCompare(b.name)
        }
        return b.awardCount - a.awardCount
      }
      return b.totalAwarded - a.totalAwarded
    }
    return b.baseRewardAmount - a.baseRewardAmount
  })

  const redemptionCounts = new Map<string, number>(
    (
      redemptionCountsRaw as { featureKey: string; _count: { _all: number } }[]
    ).map((entry) => [entry.featureKey, entry._count._all]),
  )

  const rewards: PublicRewardsReward[] = (
    catalogItemsRaw as CatalogItemRecord[]
  ).map((item) => ({
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
  }))

  const recentRedemptions: PublicRewardsRedemption[] = (
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
    stats,
    rules,
    rewards,
    recentRedemptions,
  }
}

import { cached, DEFAULT_TTL, TAGS } from "@/lib/cache"
import prisma from "@/lib/prisma"

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

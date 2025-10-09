import { beforeEach, describe, expect, it, vi } from "vitest"

const rewardBalanceCountMock = vi.hoisted(() => vi.fn())
const rewardBalanceFindManyMock = vi.hoisted(() => vi.fn())
const rewardTransactionAggregateMock = vi.hoisted(() => vi.fn())
const redemptionCountMock = vi.hoisted(() => vi.fn())

vi.mock("next/cache", () => ({
  unstable_cache: (fn: any) => fn,
}))

vi.mock("@/lib/prisma", () => ({
  default: {
    rewardBalance: {
      count: rewardBalanceCountMock,
      findMany: rewardBalanceFindManyMock,
    },
    rewardTransaction: {
      aggregate: rewardTransactionAggregateMock,
    },
    redemption: {
      count: redemptionCountMock,
    },
  },
}))

import {
  getPublicRewardsStats,
  getRewardsLeaderboardEntries,
} from "@/actions/public/rewards/actions"

describe("rewards leaderboard actions", () => {
  beforeEach(() => {
    rewardBalanceCountMock.mockReset()
    rewardBalanceFindManyMock.mockReset()
    rewardTransactionAggregateMock.mockReset()
    redemptionCountMock.mockReset()
  })

  it("computes public rewards stats with safe fallbacks", async () => {
    rewardBalanceCountMock.mockResolvedValueOnce(42)
    rewardBalanceCountMock.mockResolvedValueOnce(18)

    rewardTransactionAggregateMock
      .mockResolvedValueOnce({
        _sum: { rewardAmount: 3200 },
        _count: { _all: 64 },
      })
      .mockResolvedValueOnce({
        _sum: { rewardAmount: 1800 },
        _count: { _all: 25 },
      })

    redemptionCountMock.mockResolvedValueOnce(12)

    const stats = await getPublicRewardsStats()

    expect(stats).toEqual({
      membersWithRewards: 42,
      activeBalances: 18,
      earnedLast30d: {
        rewardAmount: 3200,
        transactions: 64,
      },
      spentLast30d: {
        rewardAmount: 1800,
        redemptions: 12,
      },
    })

    expect(rewardBalanceCountMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: { lifetimeEarned: { gt: 0 } },
      }),
    )
    expect(rewardBalanceCountMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: { balance: { gt: 0 } },
      }),
    )
    expect(redemptionCountMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: expect.objectContaining({
            in: expect.arrayContaining(["pending", "active", "refunded"]),
          }),
        }),
      }),
    )
  })

  it("fetches leaderboard entries ordered by rewards earned", async () => {
    const now = new Date()
    rewardBalanceFindManyMock.mockResolvedValueOnce([
      {
        userId: "user_1",
        balance: 450,
        lifetimeEarned: 7200,
        lifetimeSpent: 5200,
        lifetimeAdjusted: 0,
        lifetimeRefunded: 300,
        currentStreakCount: 5,
        longestStreakCount: 12,
        lastEarnedAt: now,
        lastRedeemedAt: null,
        user: {
          id: "user_1",
          clerkId: "clerk_123",
          firstName: "Ada",
          lastName: "Lovelace",
          _count: { products: 3 },
        },
      },
    ])

    const result = await getRewardsLeaderboardEntries(75)

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      userId: "user_1",
      lifetimeEarned: 7200,
      user: expect.objectContaining({
        firstName: "Ada",
        _count: { products: 3 },
      }),
    })

    expect(rewardBalanceFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 75,
        where: expect.objectContaining({
          lifetimeEarned: { gt: 0 },
          user: { status: "active" },
        }),
        orderBy: [{ lifetimeEarned: "desc" }, { updatedAt: "desc" }],
      }),
    )

    const cacheStrategy =
      rewardBalanceFindManyMock.mock.calls[0]?.[0]?.cacheStrategy
    expect(cacheStrategy?.tags).toContain("rewards_leaderboard_limit_75")
  })

  it("normalizes leaderboard limit to supported bounds", async () => {
    rewardBalanceFindManyMock.mockResolvedValueOnce([])
    await getRewardsLeaderboardEntries(0)
    expect(rewardBalanceFindManyMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ take: 1 }),
    )

    rewardBalanceFindManyMock.mockResolvedValueOnce([])
    await getRewardsLeaderboardEntries(999)
    expect(rewardBalanceFindManyMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ take: 200 }),
    )

    rewardBalanceFindManyMock.mockResolvedValueOnce([])
    await getRewardsLeaderboardEntries(Number.NaN)
    expect(rewardBalanceFindManyMock).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ take: 50 }),
    )
  })
})

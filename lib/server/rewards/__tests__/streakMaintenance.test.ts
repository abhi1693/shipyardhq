import { beforeEach, describe, expect, it, vi } from "vitest"

const awardRewardsMock = vi.hoisted(() => vi.fn())
const prismaMock = vi.hoisted(() => {
  return {
    rewardTransactionFindMany: vi.fn(),
    rewardBalanceFindMany: vi.fn(),
    rewardBalanceUpsert: vi.fn(),
    rewardBalanceUpdateMany: vi.fn(),
  }
})

vi.mock("@/lib/rewards/engine", () => ({
  awardRewards: awardRewardsMock,
}))

vi.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    rewardTransaction: {
      findMany: prismaMock.rewardTransactionFindMany,
    },
    rewardBalance: {
      findMany: prismaMock.rewardBalanceFindMany,
      upsert: prismaMock.rewardBalanceUpsert,
      updateMany: prismaMock.rewardBalanceUpdateMany,
    },
  },
}))

import { runStreakMaintenance, STREAK_RULE_KEY } from "../streakMaintenance"

describe("runStreakMaintenance", () => {
  beforeEach(() => {
    awardRewardsMock.mockReset()
    prismaMock.rewardTransactionFindMany.mockReset()
    prismaMock.rewardBalanceFindMany.mockReset()
    prismaMock.rewardBalanceUpsert.mockReset()
    prismaMock.rewardBalanceUpdateMany.mockReset()
  })

  it("tracks streak progress without awarding when below tier threshold", async () => {
    const now = new Date("2025-04-02T05:00:00Z")

    prismaMock.rewardTransactionFindMany.mockResolvedValueOnce([
      { userId: "user-1", ruleKey: "rewards.login.daily" },
    ])
    prismaMock.rewardBalanceFindMany.mockResolvedValueOnce([])
    prismaMock.rewardBalanceUpsert.mockResolvedValueOnce(undefined)
    prismaMock.rewardBalanceUpdateMany.mockResolvedValueOnce({ count: 0 })

    const summary = await runStreakMaintenance({ now })

    expect(summary.qualifyingUsers).toBe(1)
    expect(summary.streaksExtended).toBe(1)
    expect(summary.awardsCreated).toBe(0)
    expect(summary.triggerRuleTotals).toEqual({
      "rewards.login.daily": 1,
    })
    expect(awardRewardsMock).not.toHaveBeenCalled()
    expect(prismaMock.rewardBalanceUpsert).toHaveBeenCalledTimes(1)
    const upsertCall = prismaMock.rewardBalanceUpsert.mock.calls[0][0]
    expect(upsertCall.update.currentStreakCount).toBe(1)
    expect(upsertCall.update.currentStreakTier).toBeNull()
  })

  it("awards streak maintenance when tier threshold is met", async () => {
    const now = new Date("2025-04-02T05:00:00Z")

    prismaMock.rewardTransactionFindMany.mockResolvedValueOnce([
      { userId: "user-42", ruleKey: "rewards.login.daily" },
      { userId: "user-42", ruleKey: "rewards.review.publish" },
    ])
    prismaMock.rewardBalanceFindMany.mockResolvedValueOnce([
      {
        userId: "user-42",
        currentStreakCount: 2,
        longestStreakCount: 5,
        currentStreakTier: "bronze",
        streakActiveThrough: new Date("2025-04-02T00:00:00Z"),
        lastEvaluatedAt: new Date("2025-04-01T03:00:00Z"),
      },
    ])
    prismaMock.rewardBalanceUpdateMany.mockResolvedValueOnce({ count: 0 })

    awardRewardsMock.mockResolvedValueOnce({
      created: true,
      transaction: {} as any,
      balance: {} as any,
      rule: { key: STREAK_RULE_KEY } as any,
    })

    const summary = await runStreakMaintenance({ now })

    expect(awardRewardsMock).toHaveBeenCalledTimes(1)
    const [, ruleKey, payload] = awardRewardsMock.mock.calls[0]
    expect(ruleKey).toBe(STREAK_RULE_KEY)
    expect(payload.eventId).toBe("2025-04-01:streak")
    expect(payload.streak?.count).toBe(3)
    expect(payload.streak?.tier).toBe("bronze")
    const metadata = payload.metadata as Record<string, unknown>
    expect(metadata.triggerRules).toEqual([
      "rewards.login.daily",
      "rewards.review.publish",
    ])
    expect(summary.awardsCreated).toBe(1)
    expect(summary.tiersAwarded.bronze).toBe(1)
    expect(summary.triggerRuleTotals).toEqual({
      "rewards.login.daily": 1,
      "rewards.review.publish": 1,
    })
    expect(prismaMock.rewardBalanceUpsert).not.toHaveBeenCalled()
  })

  it("skips users already evaluated for the current day", async () => {
    const now = new Date("2025-04-02T05:00:00Z")

    prismaMock.rewardTransactionFindMany.mockResolvedValueOnce([
      { userId: "user-7", ruleKey: "rewards.upvote.give" },
    ])
    prismaMock.rewardBalanceFindMany.mockResolvedValueOnce([
      {
        userId: "user-7",
        currentStreakCount: 4,
        longestStreakCount: 9,
        currentStreakTier: "silver",
        streakActiveThrough: new Date("2025-04-03T00:00:00Z"),
        lastEvaluatedAt: new Date("2025-04-02T00:00:00Z"),
      },
    ])
    prismaMock.rewardBalanceUpdateMany.mockResolvedValueOnce({ count: 0 })

    const summary = await runStreakMaintenance({ now })

    expect(summary.alreadyEvaluated).toBe(1)
    expect(summary.streaksExtended).toBe(0)
    expect(awardRewardsMock).not.toHaveBeenCalled()
    expect(prismaMock.rewardBalanceUpsert).not.toHaveBeenCalled()
  })

  it("resets expired streaks when no qualifying login is found", async () => {
    const now = new Date("2025-04-02T05:00:00Z")

    prismaMock.rewardTransactionFindMany.mockResolvedValueOnce([])
    prismaMock.rewardBalanceUpdateMany.mockResolvedValueOnce({ count: 3 })

    const summary = await runStreakMaintenance({ now })

    expect(summary.qualifyingUsers).toBe(0)
    expect(summary.streaksReset).toBe(3)
    expect(summary.triggerRuleTotals).toEqual({})
    expect(awardRewardsMock).not.toHaveBeenCalled()
    expect(prismaMock.rewardBalanceUpsert).not.toHaveBeenCalled()
    expect(prismaMock.rewardBalanceFindMany).not.toHaveBeenCalled()
  })
})

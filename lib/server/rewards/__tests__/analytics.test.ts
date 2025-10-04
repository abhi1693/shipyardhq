import { beforeEach, describe, expect, it, vi, afterEach } from "vitest"

process.env.TZ = "UTC"

vi.mock("@/lib/prisma", () => ({
  default: {
    rewardTransaction: {
      findMany: vi.fn(),
      groupBy: vi.fn(),
    },
    rewardRule: {
      findMany: vi.fn(),
    },
    rewardCatalogItem: {
      findMany: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
  },
}))

import prisma from "@/lib/prisma"
import { RewardTransactionType } from "@/lib/vendor/prisma/client"
import { getRewardAnalytics } from "../analytics"

describe("getRewardAnalytics", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2024-10-10T12:00:00Z"))
    ;(prisma.rewardTransaction.findMany as any).mockReset()
    ;(prisma.rewardTransaction.groupBy as any).mockReset()
    ;(prisma.rewardRule.findMany as any).mockReset()
    ;(prisma.rewardCatalogItem.findMany as any).mockReset()
    ;(prisma.user.findMany as any).mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("returns aggregated reward analytics for the requested range", async () => {
    ;(prisma.rewardTransaction.findMany as any)
      .mockResolvedValueOnce([
        {
          createdAt: new Date("2024-10-05T10:00:00Z"),
          type: RewardTransactionType.earn,
          rewardAmount: 100,
          metadata: null,
          ruleKey: "rewards.login.daily",
          rewardKey: null,
          userId: "user-1",
        },
        {
          createdAt: new Date("2024-10-07T08:00:00Z"),
          type: RewardTransactionType.earn,
          rewardAmount: 50,
          metadata: null,
          ruleKey: "rewards.review.publish",
          rewardKey: null,
          userId: "user-3",
        },
        {
          createdAt: new Date("2024-10-08T14:00:00Z"),
          type: RewardTransactionType.spend,
          rewardAmount: 80,
          metadata: null,
          ruleKey: null,
          rewardKey: "rewards.analytics.snapshot",
          userId: "user-2",
        },
        {
          createdAt: new Date("2024-10-09T09:00:00Z"),
          type: RewardTransactionType.refund,
          rewardAmount: 20,
          metadata: null,
          ruleKey: null,
          rewardKey: "rewards.analytics.snapshot",
          userId: "user-2",
        },
        {
          createdAt: new Date("2024-10-09T18:00:00Z"),
          type: RewardTransactionType.adjustment,
          rewardAmount: 30,
          metadata: {
            adjustment: { amount: 30 },
          },
          ruleKey: null,
          rewardKey: null,
          userId: "user-4",
        },
        {
          createdAt: new Date("2024-10-10T11:00:00Z"),
          type: RewardTransactionType.adjustment,
          rewardAmount: 10,
          metadata: {
            adjustment: { amount: -10 },
          },
          ruleKey: null,
          rewardKey: null,
          userId: "user-5",
        },
      ])
      .mockResolvedValueOnce([
        {
          type: RewardTransactionType.earn,
          rewardAmount: 90,
          metadata: null,
        },
        {
          type: RewardTransactionType.spend,
          rewardAmount: 40,
          metadata: null,
        },
        {
          type: RewardTransactionType.refund,
          rewardAmount: 10,
          metadata: null,
        },
        {
          type: RewardTransactionType.adjustment,
          rewardAmount: 20,
          metadata: {
            adjustment: { amount: 20 },
          },
        },
        {
          type: RewardTransactionType.adjustment,
          rewardAmount: 5,
          metadata: {
            adjustment: { amount: -5 },
          },
        },
      ])
    ;(prisma.rewardTransaction.groupBy as any)
      .mockResolvedValueOnce([
        {
          ruleKey: "rewards.login.daily",
          _sum: { rewardAmount: 120 },
          _count: { _all: 3 },
        },
        {
          ruleKey: "rewards.review.publish",
          _sum: { rewardAmount: 30 },
          _count: { _all: 1 },
        },
      ])
      .mockResolvedValueOnce([
        {
          rewardKey: "rewards.analytics.snapshot",
          _sum: { rewardAmount: 80 },
          _count: { _all: 1 },
        },
      ])
      .mockResolvedValueOnce([
        {
          userId: "user-1",
          _sum: { rewardAmount: 120 },
          _count: { _all: 2 },
        },
      ])
      .mockResolvedValueOnce([
        {
          userId: "user-2",
          _sum: { rewardAmount: 80 },
          _count: { _all: 1 },
        },
      ])
    ;(prisma.rewardRule.findMany as any).mockResolvedValue([
      { key: "rewards.login.daily", name: "Daily login" },
      { key: "rewards.review.publish", name: "Review published" },
    ])
    ;(prisma.rewardCatalogItem.findMany as any).mockResolvedValue([
      { featureKey: "rewards.analytics.snapshot", name: "Analytics snapshot" },
    ])
    ;(prisma.user.findMany as any).mockResolvedValue([
      {
        id: "user-1",
        email: "user1@example.com",
        firstName: "Alex",
        lastName: "Admin",
      },
      {
        id: "user-2",
        email: "user2@example.com",
        firstName: "Builder",
        lastName: "One",
      },
    ])

    const summary = await getRewardAnalytics(7)

    expect(summary.rangeDays).toBe(7)

    expect(summary.totals.earned.amount).toBe(150)
    expect(summary.totals.earned.previousAmount).toBe(90)
    expect(summary.totals.spent.amount).toBe(80)
    expect(summary.totals.refunded.amount).toBe(20)
    expect(summary.totals.adjustments.amount).toBe(40)
    expect(summary.totals.adjustments.net).toBe(20)
    expect(summary.totals.adjustments.positiveAmount).toBe(30)
    expect(summary.totals.adjustments.negativeAmount).toBe(10)

    expect(summary.totals.netIssued.amount).toBe(150 - 80 + 20 + 20)

    expect(summary.timeline).toHaveLength(7)
    const timelinePoint = summary.timeline.find(
      (point) => point.date === "2024-10-09",
    )
    expect(timelinePoint).toBeDefined()
    expect(timelinePoint?.earn).toBe(0)
    expect(timelinePoint?.adjustment).toBe(30)
    expect(timelinePoint?.refund).toBe(20)
    expect(timelinePoint?.net).toBe(50)

    expect(summary.leaders.topRules).toHaveLength(2)
    expect(summary.leaders.topRules[0]).toMatchObject({
      id: "rewards.login.daily",
      name: "Daily login",
      amount: 120,
    })

    expect(summary.leaders.topRewards[0]).toMatchObject({
      id: "rewards.analytics.snapshot",
      name: "Analytics snapshot",
      amount: 80,
    })

    expect(summary.leaders.topEarners[0]).toMatchObject({
      id: "user-1",
      name: "Alex Admin",
      email: "user1@example.com",
      amount: 120,
    })

    expect(summary.leaders.topSpenders[0]).toMatchObject({
      id: "user-2",
      name: "Builder One",
      email: "user2@example.com",
      amount: 80,
    })
  })
})

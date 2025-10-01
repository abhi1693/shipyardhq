import { beforeEach, describe, expect, it, vi } from "vitest"

const groupByMock = vi.hoisted(() => vi.fn())
const analyticsFindManyMock = vi.hoisted(() => vi.fn())
const rootDeleteManyMock = vi.hoisted(() => vi.fn())
const txDeleteManyMock = vi.hoisted(() => vi.fn())
const txCreateManyMock = vi.hoisted(() => vi.fn())
const transactionMock = vi.hoisted(() => vi.fn())
const notificationFindMock = vi.hoisted(() => vi.fn())
const notificationCreateMock = vi.hoisted(() => vi.fn())
const productFindManyMock = vi.hoisted(() => vi.fn())
const productUpdateMock = vi.hoisted(() => vi.fn())
const badgeFindFirstMock = vi.hoisted(() => vi.fn())
const badgeCreateMock = vi.hoisted(() => vi.fn())
const badgeUpdateMock = vi.hoisted(() => vi.fn())
const planFindUniqueMock = vi.hoisted(() => vi.fn())
const planFindFirstMock = vi.hoisted(() => vi.fn())
const sendEmailMock = vi.hoisted(() => vi.fn())

vi.mock("@/lib/prisma", () => {
  return {
    default: {
      productUpvote: { groupBy: groupByMock },
      productAnalytics: { findMany: analyticsFindManyMock },
      monthlyProductRanking: { deleteMany: rootDeleteManyMock },
      monthlyLeaderboardNotification: {
        findUnique: notificationFindMock,
        create: notificationCreateMock,
      },
      productBadge: {
        findFirst: badgeFindFirstMock,
        create: badgeCreateMock,
        update: badgeUpdateMock,
      },
      plan: { findUnique: planFindUniqueMock, findFirst: planFindFirstMock },
      product: { findMany: productFindManyMock, update: productUpdateMock },
      $transaction: transactionMock,
    },
  }
})

vi.mock("@/lib/email/resend", () => ({
  sendEmail: sendEmailMock,
}))

vi.mock("@/lib/email/templates/leaderboard/monthlyWinner", () => ({
  default: (props: any) => ({ component: "MonthlyWinnerEmail", props }),
}))

import {
  generateMonthlyLeaderboard,
  notifyMonthlyWinners,
  parseMonthKey,
  toMonthKey,
} from "@/lib/server/monthlyLeaderboard"

describe("generateMonthlyLeaderboard", () => {
  beforeEach(() => {
    groupByMock.mockReset()
    analyticsFindManyMock.mockReset()
    rootDeleteManyMock.mockReset()
    txDeleteManyMock.mockReset()
    txCreateManyMock.mockReset()
    transactionMock.mockReset()
    notificationFindMock.mockReset()
    notificationCreateMock.mockReset()
    productFindManyMock.mockReset()
    productUpdateMock.mockReset()
    badgeFindFirstMock.mockReset()
    badgeCreateMock.mockReset()
    badgeUpdateMock.mockReset()
    planFindUniqueMock.mockReset()
    planFindFirstMock.mockReset()
    sendEmailMock.mockReset()
    sendEmailMock.mockResolvedValue({})

    transactionMock.mockImplementation(async (callback) =>
      callback({
        monthlyProductRanking: {
          deleteMany: txDeleteManyMock,
          createMany: txCreateManyMock,
        },
      }),
    )
  })

  it("builds rankings for the previous month by default", async () => {
    const now = new Date(Date.UTC(2024, 5, 3, 12))
    groupByMock.mockResolvedValue([
      { productId: "prod-1", _count: { productId: 12 } },
      { productId: "prod-2", _count: { productId: 8 } },
    ])
    analyticsFindManyMock.mockResolvedValue([
      { productId: "prod-1", upvotes: 300 },
      { productId: "prod-2", upvotes: 120 },
    ])
    txCreateManyMock.mockResolvedValue({ count: 2 })

    const result = await generateMonthlyLeaderboard({ now, limit: 10 })

    expect(result.monthKey).toBe("31-05-2024")
    expect(result.count).toBe(2)
    expect(result.rankings[0]).toEqual({
      productId: "prod-1",
      rank: 1,
      upvotes: 12,
      score: 12 * 100 + 300,
    })
    expect(result.rankings[1]).toEqual({
      productId: "prod-2",
      rank: 2,
      upvotes: 8,
      score: 8 * 100 + 120,
    })

    const groupArgs = groupByMock.mock.calls[0][0]
    expect(groupArgs.take).toBe(10)
    expect(groupArgs.where.createdAt.gte.toISOString()).toBe(
      "2024-05-01T00:00:00.000Z",
    )
    expect(groupArgs.where.createdAt.lt.toISOString()).toBe(
      "2024-06-01T00:00:00.000Z",
    )

    expect(txDeleteManyMock).toHaveBeenCalledWith({
      where: { month: new Date("2024-05-01T00:00:00.000Z") },
    })
    expect(txCreateManyMock).toHaveBeenCalledWith({
      data: [
        {
          month: new Date("2024-05-01T00:00:00.000Z"),
          productId: "prod-1",
          rank: 1,
          score: 12 * 100 + 300,
          upvotes: 12,
        },
        {
          month: new Date("2024-05-01T00:00:00.000Z"),
          productId: "prod-2",
          rank: 2,
          score: 8 * 100 + 120,
          upvotes: 8,
        },
      ],
    })
    expect(transactionMock).toHaveBeenCalledTimes(1)
    expect(analyticsFindManyMock).toHaveBeenCalledWith({
      where: { productId: { in: ["prod-1", "prod-2"] } },
      select: { productId: true, upvotes: true },
    })
  })

  it("clears rankings when no upvotes recorded", async () => {
    const now = new Date(Date.UTC(2024, 2, 8))
    groupByMock.mockResolvedValue([])

    const result = await generateMonthlyLeaderboard({ now })

    expect(result.count).toBe(0)
    expect(rootDeleteManyMock).toHaveBeenCalledWith({
      where: { month: new Date("2024-02-01T00:00:00.000Z") },
    })
    expect(transactionMock).not.toHaveBeenCalled()
  })
})

describe("notifyMonthlyWinners", () => {
  beforeEach(() => {
    notificationFindMock.mockReset()
    notificationCreateMock.mockReset()
    productFindManyMock.mockReset()
    productUpdateMock.mockReset()
    badgeFindFirstMock.mockReset()
    badgeCreateMock.mockReset()
    badgeUpdateMock.mockReset()
    planFindUniqueMock.mockReset()
    planFindFirstMock.mockReset()
    sendEmailMock.mockReset()
    sendEmailMock.mockResolvedValue({})
    planFindFirstMock.mockResolvedValue({ boostForDays: 1 })
  })

  it("sends emails to top three and records notification", async () => {
    vi.useFakeTimers()
    const now = new Date("2024-06-05T12:00:00.000Z")
    vi.setSystemTime(now)

    const month = new Date("2024-04-01T00:00:00.000Z")
    const result = {
      month,
      monthKey: "30-04-2024",
      start: month,
      end: new Date("2024-05-01T00:00:00.000Z"),
      limit: 10,
      count: 3,
      rankings: [
        { productId: "prod-1", rank: 1, upvotes: 120, score: 420 },
        { productId: "prod-2", rank: 2, upvotes: 90, score: 330 },
        { productId: "prod-3", rank: 3, upvotes: 60, score: 260 },
      ],
    }

    notificationFindMock.mockResolvedValue(null)
    productFindManyMock.mockResolvedValue([
      {
        id: "prod-1",
        name: "Shitposts",
        slug: "shitposts",
        planId: null,
        planAssignedAt: null,
        plan: null,
        user: { email: "first@example.com" },
      },
      {
        id: "prod-2",
        name: "Launchify",
        slug: "launchify",
        planId: null,
        planAssignedAt: null,
        plan: null,
        user: { email: "second@example.com" },
      },
      {
        id: "prod-3",
        name: "GrowthForge",
        slug: "growthforge",
        planId: null,
        planAssignedAt: null,
        plan: null,
        user: { email: "third@example.com" },
      },
    ])
    notificationCreateMock.mockResolvedValue({ id: "notif" })
    badgeFindFirstMock.mockResolvedValue(null)
    badgeCreateMock.mockResolvedValue({ id: "badge" })
    badgeUpdateMock.mockResolvedValue({})
    planFindUniqueMock.mockResolvedValue({
      id: "plan-featured",
      boostForDays: 14,
    })
    productUpdateMock.mockResolvedValue({})
    sendEmailMock.mockResolvedValue({})

    try {
      const outcome = await notifyMonthlyWinners(result as any)

      expect(outcome.notified).toBe(3)
      expect(outcome.alreadyNotified).toBe(false)
      expect(sendEmailMock).toHaveBeenCalledTimes(3)
      expect(notificationCreateMock).toHaveBeenCalledWith({ data: { month } })
      expect(badgeCreateMock).toHaveBeenCalledTimes(1)
      const badgeCall = badgeCreateMock.mock.calls[0][0]
      expect(badgeCall.data.productId).toBe("prod-1")
      expect(badgeCall.data.badge).toBe("editor-pick")
      const expectedExpiry = new Date(now.getTime() + 24 * 60 * 60 * 1000)
      expect(badgeCall.data.expiresAt?.toISOString()).toBe(
        expectedExpiry.toISOString(),
      )
      expect(planFindUniqueMock).toHaveBeenCalledWith({
        where: { slug: "featured" },
        select: { id: true, boostForDays: true },
      })
      expect(productUpdateMock).toHaveBeenCalledWith({
        where: { id: "prod-1" },
        data: expect.objectContaining({
          planId: "plan-featured",
          planAssignedAt: expect.any(Date),
        }),
      })
      expect(planFindFirstMock).toHaveBeenCalledWith({
        where: { isDefault: true },
        orderBy: { createdAt: "desc" },
        select: { boostForDays: true },
      })
    } finally {
      vi.useRealTimers()
    }
  })

  it("skips when winners already notified", async () => {
    notificationFindMock.mockResolvedValue({ id: "existing" })

    const result = {
      month: new Date("2024-04-01T00:00:00.000Z"),
      monthKey: "30-04-2024",
      start: new Date("2024-04-01T00:00:00.000Z"),
      end: new Date("2024-05-01T00:00:00.000Z"),
      limit: 10,
      count: 3,
      rankings: [{ productId: "prod-1", rank: 1, upvotes: 100, score: 400 }],
    }

    const outcome = await notifyMonthlyWinners(result as any)
    expect(outcome.alreadyNotified).toBe(true)
    expect(sendEmailMock).not.toHaveBeenCalled()
    expect(notificationCreateMock).not.toHaveBeenCalled()
    expect(badgeCreateMock).not.toHaveBeenCalled()
  })

  it("creates no notification when emails are missing", async () => {
    notificationFindMock.mockResolvedValue(null)
    productFindManyMock.mockResolvedValue([
      {
        id: "prod-1",
        name: "No Email",
        slug: "no-email",
        planId: null,
        planAssignedAt: null,
        plan: null,
        user: { email: null },
      },
    ])
    badgeFindFirstMock.mockResolvedValue(null)
    badgeCreateMock.mockResolvedValue({ id: "badge" })
    planFindUniqueMock.mockResolvedValue({
      id: "plan-featured",
      boostForDays: 14,
    })
    productUpdateMock.mockResolvedValue({})

    const result = {
      month: new Date("2024-04-01T00:00:00.000Z"),
      monthKey: "30-04-2024",
      start: new Date("2024-04-01T00:00:00.000Z"),
      end: new Date("2024-05-01T00:00:00.000Z"),
      limit: 10,
      count: 1,
      rankings: [{ productId: "prod-1", rank: 1, upvotes: 50, score: 200 }],
    }

    const outcome = await notifyMonthlyWinners(result as any)

    expect(outcome.notified).toBe(0)
    expect(notificationCreateMock).toHaveBeenCalled()
    expect(badgeCreateMock).toHaveBeenCalled()
    expect(productUpdateMock).toHaveBeenCalled()
  })
})

describe("month helpers", () => {
  it("parses valid month keys", () => {
    expect(parseMonthKey("30-04-2024")?.toISOString()).toBe(
      "2024-04-01T00:00:00.000Z",
    )
  })

  it("returns null for invalid month keys", () => {
    expect(parseMonthKey("not-a-month")).toBeNull()
    expect(parseMonthKey("31-13-2024")).toBeNull()
    expect(parseMonthKey("29-02-2023")).toBeNull()
  })

  it("formats month keys", () => {
    expect(toMonthKey(new Date("2023-09-15T00:00:00.000Z"))).toBe("30-09-2023")
  })
})

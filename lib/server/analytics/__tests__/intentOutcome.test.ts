import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"

const {
  userFindManyMock,
  productGroupByMock,
  membershipGroupByMock,
  upvoteGroupByMock,
  feedbackGroupByMock,
  purchaseGroupByMock,
  productTrafficFindManyMock,
  upvoteFindManyMock,
  purchaseFindManyMock,
} = vi.hoisted(() => ({
  userFindManyMock: vi.fn(),
  productGroupByMock: vi.fn(),
  membershipGroupByMock: vi.fn(),
  upvoteGroupByMock: vi.fn(),
  feedbackGroupByMock: vi.fn(),
  purchaseGroupByMock: vi.fn(),
  productTrafficFindManyMock: vi.fn(),
  upvoteFindManyMock: vi.fn(),
  purchaseFindManyMock: vi.fn(),
}))

const cacheHitMock = vi.hoisted(() => vi.fn())
const cacheMissMock = vi.hoisted(() => vi.fn())

vi.mock("@/lib/prisma", () => ({
  default: {
    user: {
      findMany: userFindManyMock,
    },
    product: {
      groupBy: productGroupByMock,
    },
    productTrafficEvent: {
      findMany: productTrafficFindManyMock,
    },
    organizationMembership: {
      groupBy: membershipGroupByMock,
    },
    productUpvote: {
      groupBy: upvoteGroupByMock,
      findMany: upvoteFindManyMock,
    },
    memberFeedback: {
      groupBy: feedbackGroupByMock,
    },
    userPlanPurchase: {
      groupBy: purchaseGroupByMock,
      findMany: purchaseFindManyMock,
    },
  },
}))

vi.mock("@/lib/server/cache", async () => {
  const actual = await vi.importActual<typeof import("@/lib/server/cache")>(
    "@/lib/server/cache",
  )
  return {
    ...actual,
    cacheHit: cacheHitMock,
    cacheMiss: cacheMissMock,
  }
})

import { getIntentOutcomeAnalytics } from "@/lib/server/analytics/intentOutcome"

describe("getIntentOutcomeAnalytics", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2024-05-20T00:00:00.000Z"))

    userFindManyMock.mockReset()
    productGroupByMock.mockReset()
    membershipGroupByMock.mockReset()
    upvoteGroupByMock.mockReset()
    feedbackGroupByMock.mockReset()
    purchaseGroupByMock.mockReset()
    productTrafficFindManyMock.mockReset()
    upvoteFindManyMock.mockReset()
    purchaseFindManyMock.mockReset()

    cacheHitMock.mockReset()
    cacheMissMock.mockReset()
    cacheHitMock.mockResolvedValue(null)
    cacheMissMock.mockResolvedValue(undefined)

    productGroupByMock.mockResolvedValue([])
    membershipGroupByMock.mockResolvedValue([])
    upvoteGroupByMock.mockResolvedValue([])
    feedbackGroupByMock.mockResolvedValue([])
    purchaseGroupByMock.mockResolvedValue([])
    productTrafficFindManyMock.mockResolvedValue([])
    upvoteFindManyMock.mockResolvedValue([])
    purchaseFindManyMock.mockResolvedValue([])
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("aggregates retention cohorts across activation stages", async () => {
    userFindManyMock.mockResolvedValue([
      {
        id: "u1",
        createdAt: new Date("2024-05-01T12:00:00.000Z"),
        roleIntent: "launch-product",
        heardFrom: "twitter",
      },
      {
        id: "u2",
        createdAt: new Date("2024-05-10T09:00:00.000Z"),
        roleIntent: "launch-product",
        heardFrom: "twitter",
      },
      {
        id: "u3",
        createdAt: new Date("2024-04-25T18:00:00.000Z"),
        roleIntent: "explore",
        heardFrom: "google",
      },
    ])

    productGroupByMock.mockResolvedValue([
      {
        userId: "u1",
        _count: { _all: 1 },
        _min: { createdAt: new Date("2024-05-03T00:00:00.000Z") },
      },
      {
        userId: "u3",
        _count: { _all: 2 },
        _min: { createdAt: new Date("2024-05-05T00:00:00.000Z") },
      },
    ])

    membershipGroupByMock.mockResolvedValue([
      {
        userId: "u1",
        _count: { _all: 1 },
        _min: { createdAt: new Date("2024-07-05T00:00:00.000Z") },
      },
    ])

    upvoteGroupByMock.mockResolvedValue([
      {
        userId: "u2",
        _count: { _all: 1 },
        _min: { createdAt: new Date("2024-05-13T00:00:00.000Z") },
      },
    ])

    feedbackGroupByMock.mockResolvedValue([
      {
        userId: "u1",
        _count: { _all: 1 },
        _min: { createdAt: new Date("2024-05-18T00:00:00.000Z") },
      },
    ])

    purchaseGroupByMock.mockResolvedValue([
      {
        userId: "u1",
        _count: { _all: 1 },
        _min: { createdAt: new Date("2024-06-10T00:00:00.000Z") },
      },
    ])

    productTrafficFindManyMock.mockResolvedValue([
      {
        product: { userId: "u1" },
        createdAt: new Date("2024-07-01T00:00:00.000Z"),
      },
      {
        product: { userId: "u3" },
        createdAt: new Date("2024-08-05T00:00:00.000Z"),
      },
    ])

    upvoteFindManyMock.mockResolvedValue([
      {
        userId: "u2",
        createdAt: new Date("2024-05-13T00:00:00.000Z"),
      },
    ])

    purchaseFindManyMock.mockResolvedValue([
      {
        userId: "u1",
        createdAt: new Date("2024-06-10T00:00:00.000Z"),
      },
    ])

    const analytics = await getIntentOutcomeAnalytics({ rangeDays: 60 })

    expect(analytics.rangeDays).toBe(60)
    expect(analytics.summary.totalUsers).toBe(3)
    expect(analytics.summary.totalCohorts).toBe(2)

    const summaryProductStage = analytics.summary.stageMetrics.find(
      (stage) => stage.key === "shippedProduct",
    )
    expect(summaryProductStage?.count).toBe(2)
    expect(summaryProductStage?.percentage).toBeCloseTo((2 / 3) * 100)
    expect(
      summaryProductStage?.speedBuckets.find(
        (bucket) => bucket.thresholdDays === 30,
      )?.count,
    ).toBe(2)

    const retention30 = analytics.summary.retention.thresholds.find(
      (bucket) => bucket.thresholdDays === 30,
    )
    const retention60 = analytics.summary.retention.thresholds.find(
      (bucket) => bucket.thresholdDays === 60,
    )
    const retention90 = analytics.summary.retention.thresholds.find(
      (bucket) => bucket.thresholdDays === 90,
    )

    expect(retention30?.activeUsers).toBe(2)
    expect(retention30?.percentage).toBeCloseTo((2 / 3) * 100)
    expect(retention60?.activeUsers).toBe(2)
    expect(retention90?.activeUsers).toBe(1)

    const twitterCohort = analytics.cohorts.find(
      (cohort) => cohort.id === "launch-product|twitter",
    )
    expect(twitterCohort).toBeDefined()
    expect(twitterCohort?.totalUsers).toBe(2)

    const twitterProductStage = twitterCohort?.stageMetrics.find(
      (stage) => stage.key === "shippedProduct",
    )
    expect(twitterProductStage?.count).toBe(1)
    expect(twitterProductStage?.percentage).toBeCloseTo(50)
    expect(
      twitterProductStage?.speedBuckets.find(
        (bucket) => bucket.thresholdDays === 30,
      )?.count,
    ).toBe(1)

    const twitterUpvoteStage = twitterCohort?.stageMetrics.find(
      (stage) => stage.key === "upvotedProduct",
    )
    expect(twitterUpvoteStage?.count).toBe(1)
    expect(twitterUpvoteStage?.medianDaysToComplete).toBe(3)

    const twitterRetention = twitterCohort?.retention.thresholds
    expect(
      twitterRetention?.find((bucket) => bucket.thresholdDays === 30)
        ?.activeUsers,
    ).toBe(1)
    expect(
      twitterRetention?.find((bucket) => bucket.thresholdDays === 60)
        ?.activeUsers,
    ).toBe(1)
    expect(
      twitterRetention?.find((bucket) => bucket.thresholdDays === 90)
        ?.activeUsers,
    ).toBe(0)

    const googleCohort = analytics.cohorts.find(
      (cohort) => cohort.id === "explore|google",
    )
    expect(googleCohort?.totalUsers).toBe(1)
    const googleProductStage = googleCohort?.stageMetrics.find(
      (stage) => stage.key === "shippedProduct",
    )
    expect(googleProductStage?.count).toBe(1)
    expect(googleProductStage?.medianDaysToComplete).toBe(10)
    const googleRetention = googleCohort?.retention.thresholds
    expect(googleRetention?.every((bucket) => bucket.activeUsers === 1)).toBe(
      true,
    )

    expect(userFindManyMock).toHaveBeenCalledTimes(1)
    expect(productGroupByMock).toHaveBeenCalledTimes(1)
    expect(membershipGroupByMock).toHaveBeenCalledTimes(1)
    expect(upvoteGroupByMock).toHaveBeenCalledTimes(1)
    expect(feedbackGroupByMock).toHaveBeenCalledTimes(1)
    expect(purchaseGroupByMock).toHaveBeenCalledTimes(1)
    expect(productTrafficFindManyMock).toHaveBeenCalledTimes(1)
    expect(upvoteFindManyMock).toHaveBeenCalledTimes(1)
    expect(purchaseFindManyMock).toHaveBeenCalledTimes(1)

    expect(cacheMissMock).toHaveBeenCalledWith(
      expect.objectContaining({
        key: expect.stringContaining("analytics:intentOutcome"),
        ttlSeconds: 3600,
      }),
    )
  })

  it("returns empty summary when no users fit the window", async () => {
    userFindManyMock.mockResolvedValue([])

    const analytics = await getIntentOutcomeAnalytics({ rangeDays: 30 })

    expect(analytics.summary.totalUsers).toBe(0)
    expect(
      analytics.summary.stageMetrics.every((stage) => stage.count === 0),
    ).toBe(true)
    expect(
      analytics.summary.retention.thresholds.every(
        (bucket) => bucket.activeUsers === 0,
      ),
    ).toBe(true)
    expect(productGroupByMock).not.toHaveBeenCalled()

    expect(cacheMissMock).toHaveBeenCalledWith(
      expect.objectContaining({
        key: expect.stringContaining("analytics:intentOutcome"),
        ttlSeconds: 3600,
      }),
    )
  })

  it("returns cached analytics when cache hit succeeds", async () => {
    const cached = {
      rangeDays: 180,
      generatedAt: new Date().toISOString(),
      summary: {
        totalUsers: 0,
        totalCohorts: 0,
        stageMetrics: [],
        retention: { thresholds: [] },
      },
      cohorts: [],
    } as unknown as Awaited<
      ReturnType<typeof getIntentOutcomeAnalytics>
    >

    cacheHitMock.mockResolvedValueOnce(cached)

    const result = await getIntentOutcomeAnalytics()

    expect(result).toBe(cached)
    expect(userFindManyMock).not.toHaveBeenCalled()
    expect(cacheMissMock).not.toHaveBeenCalled()
  })
})

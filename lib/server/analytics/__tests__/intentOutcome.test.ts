import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"

const {
  userFindManyMock,
  productGroupByMock,
  membershipGroupByMock,
  upvoteGroupByMock,
  feedbackGroupByMock,
  purchaseGroupByMock,
} = vi.hoisted(() => ({
  userFindManyMock: vi.fn(),
  productGroupByMock: vi.fn(),
  membershipGroupByMock: vi.fn(),
  upvoteGroupByMock: vi.fn(),
  feedbackGroupByMock: vi.fn(),
  purchaseGroupByMock: vi.fn(),
}))

vi.mock("next/cache", () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => (...args: unknown[]) =>
    fn(...args),
}))

vi.mock("@/lib/prisma", () => ({
  default: {
    user: {
      findMany: userFindManyMock,
    },
    product: {
      groupBy: productGroupByMock,
    },
    organizationMembership: {
      groupBy: membershipGroupByMock,
    },
    productUpvote: {
      groupBy: upvoteGroupByMock,
    },
    memberFeedback: {
      groupBy: feedbackGroupByMock,
    },
    userPlanPurchase: {
      groupBy: purchaseGroupByMock,
    },
  },
}))

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

    productGroupByMock.mockResolvedValue([])
    membershipGroupByMock.mockResolvedValue([])
    upvoteGroupByMock.mockResolvedValue([])
    feedbackGroupByMock.mockResolvedValue([])
    purchaseGroupByMock.mockResolvedValue([])
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
        _min: { createdAt: new Date("2024-05-15T00:00:00.000Z") },
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
        _min: { createdAt: new Date("2024-05-21T00:00:00.000Z") },
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

    const googleCohort = analytics.cohorts.find(
      (cohort) => cohort.id === "explore|google",
    )
    expect(googleCohort?.totalUsers).toBe(1)
    const googleProductStage = googleCohort?.stageMetrics.find(
      (stage) => stage.key === "shippedProduct",
    )
    expect(googleProductStage?.count).toBe(1)
    expect(googleProductStage?.medianDaysToComplete).toBe(10)

    expect(userFindManyMock).toHaveBeenCalledTimes(1)
    expect(productGroupByMock).toHaveBeenCalledTimes(1)
    expect(membershipGroupByMock).toHaveBeenCalledTimes(1)
    expect(upvoteGroupByMock).toHaveBeenCalledTimes(1)
    expect(feedbackGroupByMock).toHaveBeenCalledTimes(1)
    expect(purchaseGroupByMock).toHaveBeenCalledTimes(1)
  })

  it("returns empty summary when no users fit the window", async () => {
    userFindManyMock.mockResolvedValue([])

    const analytics = await getIntentOutcomeAnalytics({ rangeDays: 30 })

    expect(analytics.summary.totalUsers).toBe(0)
    expect(analytics.summary.stageMetrics.every((stage) => stage.count === 0)).toBe(
      true,
    )
    expect(productGroupByMock).not.toHaveBeenCalled()
  })
})

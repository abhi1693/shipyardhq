import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"

const {
  countMock,
  groupByMock,
  findFirstMock,
  findManyMock,
  newsletterFindManyMock,
  productFindManyMock,
  upvoteFindManyMock,
  purchaseFindManyMock,
  feedbackGroupByMock,
} = vi.hoisted(() => ({
  countMock: vi.fn(),
  groupByMock: vi.fn(),
  findFirstMock: vi.fn(),
  findManyMock: vi.fn(),
  newsletterFindManyMock: vi.fn(),
  productFindManyMock: vi.fn(),
  upvoteFindManyMock: vi.fn(),
  purchaseFindManyMock: vi.fn(),
  feedbackGroupByMock: vi.fn(),
}))

const cacheHitMock = vi.hoisted(() => vi.fn())
const cacheMissMock = vi.hoisted(() => vi.fn())

vi.mock("@/lib/prisma", () => ({
  default: {
    user: {
      count: countMock,
      groupBy: groupByMock,
      findFirst: findFirstMock,
      findMany: findManyMock,
    },
    product: {
      findMany: productFindManyMock,
    },
    productUpvote: {
      findMany: upvoteFindManyMock,
    },
    userPlanPurchase: {
      findMany: purchaseFindManyMock,
    },
    memberFeedback: {
      groupBy: feedbackGroupByMock,
    },
    newsletterSubscription: {
      findMany: newsletterFindManyMock,
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

import {
  getOnboardingAnswersSummary,
  getPendingOnboardingUsers,
  getRecentOnboardingCompletions,
  getRoleIntentLabel,
  getHeardFromLabel,
} from "@/lib/server/analytics/onboardingSummary"

describe("getOnboardingAnswersSummary", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2024-04-20T00:00:00.000Z"))
    countMock.mockReset()
    groupByMock.mockReset()
    findFirstMock.mockReset()
    findManyMock.mockReset()
    newsletterFindManyMock.mockReset()
    productFindManyMock.mockReset()
    upvoteFindManyMock.mockReset()
    purchaseFindManyMock.mockReset()
    feedbackGroupByMock.mockReset()

    cacheHitMock.mockReset()
    cacheMissMock.mockReset()
    cacheHitMock.mockResolvedValue(null)
    cacheMissMock.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("aggregates onboarding responses with friendly labels", async () => {
    countMock
      .mockResolvedValueOnce(40) // total active
      .mockResolvedValueOnce(25) // completed
      .mockResolvedValueOnce(6) // last 7 days

    groupByMock
      .mockResolvedValueOnce([
        {
          roleIntent: "launch-product",
          _count: { roleIntent: 12 },
        },
        {
          roleIntent: "custom-intent",
          _count: { roleIntent: 5 },
        },
      ])
      .mockResolvedValueOnce([
        {
          heardFrom: "twitter",
          _count: { heardFrom: 10 },
        },
        {
          heardFrom: "other",
          _count: { heardFrom: 8 },
        },
      ])

    findFirstMock.mockResolvedValue({
      updatedAt: new Date("2024-04-18T15:00:00.000Z"),
    })

    findManyMock
      .mockResolvedValueOnce([
        {
          id: "user-1",
          email: "alice@example.com",
          roleIntent: "launch-product",
          heardFrom: "twitter",
        },
        {
          id: "user-2",
          email: "bob@example.com",
          roleIntent: "custom-intent",
          heardFrom: "other",
        },
      ])
      .mockResolvedValueOnce([
        { email: "alice@example.com" },
        { email: "bob@example.com" },
      ])

    newsletterFindManyMock.mockResolvedValueOnce([
      { email: "alice@example.com" },
      { email: "carol@example.com" },
    ])

    productFindManyMock.mockResolvedValueOnce([{ userId: "user-1" }])
    upvoteFindManyMock.mockResolvedValueOnce([{ userId: "user-2" }])
    purchaseFindManyMock.mockResolvedValueOnce([{ userId: "user-1" }])
    feedbackGroupByMock.mockResolvedValueOnce([
      {
        userId: "user-1",
        _count: { _all: 2, rating: 2 },
        _sum: { rating: 8 },
      },
      {
        userId: "user-2",
        _count: { _all: 1, rating: 1 },
        _sum: { rating: 2 },
      },
    ])

    const summary = await getOnboardingAnswersSummary()

    expect(summary.totalActiveUsers).toBe(40)
    expect(summary.completedResponses).toBe(25)
    expect(summary.pendingUsers).toBe(15)
    expect(summary.completedLast7Days).toBe(6)
    expect(summary.lastResponseAt).toBe("2024-04-18T15:00:00.000Z")
    expect(summary.completionRate).toBeCloseTo((25 / 40) * 100)

    expect(summary.roleIntentBreakdown).toEqual([
      {
        value: "launch-product",
        label: "Launch a product",
        count: 12,
        percentage: (12 / 25) * 100,
      },
      {
        value: "custom-intent",
        label: "Custom Intent",
        count: 5,
        percentage: (5 / 25) * 100,
      },
    ])

    expect(summary.heardFromBreakdown).toEqual([
      {
        value: "twitter",
        label: "Twitter / X",
        count: 10,
        percentage: (10 / 25) * 100,
      },
      {
        value: "other",
        label: "Other",
        count: 8,
        percentage: (8 / 25) * 100,
      },
    ])

    expect(summary.newsletterSubscribed).toBe(1)
    expect(summary.newsletterOptedOut).toBe(1)
    expect(summary.newsletterIntentBreakdown).toEqual([
      {
        id: "builder",
        label: "Builders",
        subscribed: 1,
        optedOut: 0,
        total: 1,
        subscribedPercentage: 100,
      },
    ])

    expect(summary.newsletterRegisteredSubscribers).toBe(1)
    expect(summary.newsletterRegisteredNotSubscribed).toBe(1)
    expect(summary.newsletterUnregisteredSubscribers).toBe(1)

    expect(summary.roleIntentOutcomes).toEqual([
      {
        value: "launch-product",
        label: "Launch a product",
        total: 1,
        productOwners: 1,
        productOwnerRate: 100,
        upvoters: 0,
        upvoterRate: 0,
        purchasers: 1,
        purchaserRate: 100,
        feedbackSubmitters: 1,
        feedbackSubmissionRate: 100,
        feedbackCount: 2,
        feedbackAverageRating: 4,
      },
      {
        value: "custom-intent",
        label: "Custom Intent",
        total: 1,
        productOwners: 0,
        productOwnerRate: 0,
        upvoters: 1,
        upvoterRate: 100,
        purchasers: 0,
        purchaserRate: 0,
        feedbackSubmitters: 1,
        feedbackSubmissionRate: 100,
        feedbackCount: 1,
        feedbackAverageRating: 2,
      },
    ])

    expect(summary.heardFromOutcomes).toEqual([
      {
        value: "twitter",
        label: "Twitter / X",
        total: 1,
        productOwners: 1,
        productOwnerRate: 100,
        upvoters: 0,
        upvoterRate: 0,
        purchasers: 1,
        purchaserRate: 100,
        feedbackSubmitters: 1,
        feedbackSubmissionRate: 100,
        feedbackCount: 2,
        feedbackAverageRating: 4,
      },
      {
        value: "other",
        label: "Other",
        total: 1,
        productOwners: 0,
        productOwnerRate: 0,
        upvoters: 1,
        upvoterRate: 100,
        purchasers: 0,
        purchaserRate: 0,
        feedbackSubmitters: 1,
        feedbackSubmissionRate: 100,
        feedbackCount: 1,
        feedbackAverageRating: 2,
      },
    ])

    expect(countMock).toHaveBeenCalledTimes(3)
    expect(groupByMock).toHaveBeenCalledTimes(2)
    expect(findFirstMock).toHaveBeenCalledTimes(1)
    expect(findManyMock).toHaveBeenCalledTimes(2)
    expect(productFindManyMock).toHaveBeenCalledTimes(1)
    expect(upvoteFindManyMock).toHaveBeenCalledTimes(1)
    expect(purchaseFindManyMock).toHaveBeenCalledTimes(1)
    expect(feedbackGroupByMock).toHaveBeenCalledTimes(1)
    expect(newsletterFindManyMock).toHaveBeenCalledTimes(1)

    expect(cacheMissMock).toHaveBeenCalledWith(
      expect.objectContaining({
        key: expect.stringContaining("analytics:onboardingSummary"),
        ttlSeconds: 3600,
      }),
    )
  })

  it("handles absence of responses", async () => {
    countMock
      .mockResolvedValueOnce(0) // total active
      .mockResolvedValueOnce(0) // completed
      .mockResolvedValueOnce(0) // last 7 days

    groupByMock.mockResolvedValueOnce([]).mockResolvedValueOnce([])

    findFirstMock.mockResolvedValue(null)

    findManyMock.mockResolvedValueOnce([]).mockResolvedValueOnce([])
    newsletterFindManyMock.mockResolvedValueOnce([])
    productFindManyMock.mockResolvedValueOnce([])
    upvoteFindManyMock.mockResolvedValueOnce([])
    purchaseFindManyMock.mockResolvedValueOnce([])
    feedbackGroupByMock.mockResolvedValueOnce([])

    const summary = await getOnboardingAnswersSummary()

    expect(summary.totalActiveUsers).toBe(0)
    expect(summary.completedResponses).toBe(0)
    expect(summary.pendingUsers).toBe(0)
    expect(summary.completionRate).toBe(0)
    expect(summary.roleIntentBreakdown).toEqual([])
    expect(summary.heardFromBreakdown).toEqual([])
    expect(summary.lastResponseAt).toBeNull()
    expect(summary.newsletterSubscribed).toBe(0)
    expect(summary.newsletterOptedOut).toBe(0)
    expect(summary.newsletterIntentBreakdown).toEqual([])
    expect(summary.newsletterRegisteredSubscribers).toBe(0)
    expect(summary.newsletterRegisteredNotSubscribed).toBe(0)
    expect(summary.newsletterUnregisteredSubscribers).toBe(0)
    expect(summary.roleIntentOutcomes).toEqual([])
    expect(summary.heardFromOutcomes).toEqual([])

    expect(cacheMissMock).toHaveBeenCalledWith(
      expect.objectContaining({
        key: expect.stringContaining("analytics:onboardingSummary"),
        ttlSeconds: 3600,
      }),
    )
  })

  it("returns cached onboarding summary when available", async () => {
    const cached = {
      totalActiveUsers: 0,
      completedResponses: 0,
      completionRate: 0,
      pendingUsers: 0,
      completedLast7Days: 0,
      lastResponseAt: null,
      roleIntentBreakdown: [],
      heardFromBreakdown: [],
      newsletterSubscribed: 0,
      newsletterOptedOut: 0,
      newsletterIntentBreakdown: [],
      newsletterRegisteredSubscribers: 0,
      newsletterRegisteredNotSubscribed: 0,
      newsletterUnregisteredSubscribers: 0,
      roleIntentOutcomes: [],
      heardFromOutcomes: [],
    } as Awaited<ReturnType<typeof getOnboardingAnswersSummary>>

    cacheHitMock.mockResolvedValueOnce(cached)

    const result = await getOnboardingAnswersSummary()

    expect(result).toBe(cached)
    expect(countMock).not.toHaveBeenCalled()
    expect(cacheMissMock).not.toHaveBeenCalled()
  })

  it("fetches pending onboarding users", async () => {
    findManyMock.mockResolvedValueOnce([])
    await getPendingOnboardingUsers(5)
    expect(findManyMock).toHaveBeenCalledWith({
      where: {
        status: "active",
        OR: [{ roleIntent: null }, { heardFrom: null }],
      },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        createdAt: true,
      },
    })
  })

  it("fetches recent onboarding completions", async () => {
    findManyMock.mockResolvedValueOnce([])
    await getRecentOnboardingCompletions(8)
    expect(findManyMock).toHaveBeenCalledWith({
      where: {
        status: "active",
        roleIntent: { not: null },
        heardFrom: { not: null },
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 8,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        roleIntent: true,
        heardFrom: true,
        updatedAt: true,
      },
    })
  })

  it("maps labels for role intent and heard from values", () => {
    expect(getRoleIntentLabel("launch-product")).toBe("Launch a product")
    expect(getRoleIntentLabel("custom_intent")).toBe("Custom Intent")
    expect(getHeardFromLabel("twitter")).toBe("Twitter / X")
    expect(getHeardFromLabel("unknown-source")).toBe("Unknown Source")
  })
})

import { beforeEach, describe, expect, it, vi } from "vitest"

const findManyMock = vi.hoisted(() => vi.fn())
const cacheHitMock = vi.hoisted(() => vi.fn())
const cacheMissMock = vi.hoisted(() => vi.fn())

vi.mock("@/lib/prisma", () => ({
  default: {
    monthlyProductRanking: {
      findMany: findManyMock,
    },
  },
}))

vi.mock("@/lib/server/cache", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/server/cache")>(
      "@/lib/server/cache",
    )

  return {
    ...actual,
    cacheHit: cacheHitMock,
    cacheMiss: cacheMissMock,
  }
})

import { getLeaderboardScoringAnalytics } from "@/lib/server/analytics/leaderboardScoring"

describe("getLeaderboardScoringAnalytics", () => {
  beforeEach(() => {
    findManyMock.mockReset()
    cacheHitMock.mockReset()
    cacheMissMock.mockReset()
    cacheHitMock.mockResolvedValue(null)
    cacheMissMock.mockResolvedValue(undefined)
  })

  it("returns leaderboard insights with deltas and history", async () => {
    const jan = new Date("2024-01-01T00:00:00.000Z")
    const feb = new Date("2024-02-01T00:00:00.000Z")
    const mar = new Date("2024-03-01T00:00:00.000Z")

    const productA = {
      id: "prod-a",
      name: "Alpha",
      slug: "alpha",
      tagline: "Ship faster",
      logo: "/alpha.png",
      analytics: { upvotes: 1400 },
      category: { name: "Analytics" },
      user: { firstName: "Ada", lastName: "Lovelace" },
    }

    const productB = {
      id: "prod-b",
      name: "Beta",
      slug: "beta",
      tagline: "Measure impact",
      logo: "/beta.png",
      analytics: { upvotes: 980 },
      category: { name: "Ops" },
      user: { firstName: "Grace", lastName: "Hopper" },
    }

    const productC = {
      id: "prod-c",
      name: "Gamma",
      slug: "gamma",
      tagline: "Automate workflows",
      logo: "/gamma.png",
      analytics: { upvotes: 220 },
      category: { name: "Automation" },
      user: { firstName: "Linus", lastName: "Torvalds" },
    }

    const productD = {
      id: "prod-d",
      name: "Delta",
      slug: "delta",
      tagline: "Simplify billing",
      logo: "/delta.png",
      analytics: { upvotes: 480 },
      category: { name: "Finance" },
      user: { firstName: "Margaret", lastName: "Hamilton" },
    }

    findManyMock
      // Distinct months
      .mockResolvedValueOnce([{ month: mar }, { month: feb }, { month: jan }])
      // Current rankings
      .mockResolvedValueOnce([
        {
          month: mar,
          productId: "prod-a",
          rank: 1,
          score: 1720,
          upvotes: 12,
          product: productA,
        },
        {
          month: mar,
          productId: "prod-b",
          rank: 2,
          score: 1250,
          upvotes: 9,
          product: productB,
        },
        {
          month: mar,
          productId: "prod-c",
          rank: 3,
          score: null,
          upvotes: 7,
          product: productC,
        },
      ])
      // Previous month subset
      .mockResolvedValueOnce([
        { productId: "prod-a", rank: 2, score: 1500, upvotes: 10 },
        { productId: "prod-b", rank: 1, score: 1600, upvotes: 14 },
      ])
      // History window
      .mockResolvedValueOnce([
        {
          month: jan,
          productId: "prod-d",
          rank: 1,
          score: 850,
          upvotes: 4,
          product: productD,
        },
        {
          month: feb,
          productId: "prod-b",
          rank: 1,
          score: 1600,
          upvotes: 14,
          product: productB,
        },
        {
          month: feb,
          productId: "prod-a",
          rank: 2,
          score: 1500,
          upvotes: 10,
          product: productA,
        },
        {
          month: feb,
          productId: "prod-d",
          rank: 3,
          score: 900,
          upvotes: 5,
          product: productD,
        },
        {
          month: mar,
          productId: "prod-a",
          rank: 1,
          score: 1720,
          upvotes: 12,
          product: productA,
        },
        {
          month: mar,
          productId: "prod-b",
          rank: 2,
          score: 1250,
          upvotes: 9,
          product: productB,
        },
        {
          month: mar,
          productId: "prod-c",
          rank: 3,
          score: null,
          upvotes: 7,
          product: productC,
        },
      ])

    const result = await getLeaderboardScoringAnalytics({ limit: 3 })

    expect(findManyMock).toHaveBeenCalledTimes(4)
    expect(cacheHitMock).toHaveBeenCalledTimes(1)
    expect(cacheMissMock).toHaveBeenCalledTimes(1)
    expect(cacheMissMock).toHaveBeenCalledWith(
      expect.objectContaining({
        key: expect.stringContaining("admin:analytics:leaderboard"),
        ttlSeconds: 300,
      }),
    )
    expect(result.month.key).toBe("31-03-2024")
    expect(result.availableMonths.map((m) => m.key)).toEqual([
      "31-03-2024",
      "29-02-2024",
      "31-01-2024",
    ])
    expect(result.rankings).toHaveLength(3)

    const champion = result.rankings[0]
    expect(champion.productId).toBe("prod-a")
    expect(champion.rank).toBe(1)
    expect(champion.score).toBe(1720)
    expect(champion.monthlyUpvotes).toBe(12)
    expect(champion.totalUpvotes).toBe(1400)
    expect(champion.rankChange).toBe(1)
    expect(champion.scoreChange).toBe(220)
    expect(champion.upvoteChange).toBe(2)
    expect(champion.isNew).toBe(false)

    const runnerUp = result.rankings[1]
    expect(runnerUp.rankChange).toBe(-1)
    expect(runnerUp.scoreChange).toBe(-350)
    expect(runnerUp.upvoteChange).toBe(-5)

    const newcomer = result.rankings[2]
    expect(newcomer.isNew).toBe(true)
    expect(newcomer.rankChange).toBeNull()
    expect(newcomer.score).toBe(920)

    expect(result.summary.rankedCount).toBe(3)
    expect(result.summary.totalMonthlyUpvotes).toBe(28)
    expect(result.summary.medianMonthlyUpvotes).toBe(9)
    expect(result.summary.returningCount).toBe(2)
    expect(result.summary.newCount).toBe(1)
    expect(result.summary.improvingCount).toBe(1)
    expect(result.summary.decliningCount).toBe(1)
    expect(result.summary.returningRate).toBeCloseTo((2 / 3) * 100)
    expect(result.summary.championScoreDelta).toBe(220)
    expect(result.summary.championUpvoteDelta).toBe(2)
    expect(result.summary.scoreSpread).toBe(800)

    expect(result.history).toHaveLength(3)
    expect(result.history[0]).toMatchObject({
      month: "31-01-2024",
      totalMonthlyUpvotes: 4,
      championProduct: { id: "prod-d", name: "Delta" },
    })
    expect(result.history[2]).toMatchObject({
      month: "31-03-2024",
      totalMonthlyUpvotes: 28,
      championProduct: { id: "prod-a", name: "Alpha" },
    })
  })

  it("handles empty leaderboard data", async () => {
    findManyMock.mockResolvedValueOnce([])

    const result = await getLeaderboardScoringAnalytics()

    expect(findManyMock).toHaveBeenCalledTimes(1)
    expect(cacheHitMock).toHaveBeenCalledTimes(1)
    expect(cacheMissMock).toHaveBeenCalledTimes(1)
    expect(result.availableMonths).toEqual([])
    expect(result.rankings).toEqual([])
    expect(result.summary.rankedCount).toBe(0)
    expect(result.summary.topScore).toBeNull()
    expect(result.history).toEqual([])
  })

  it("returns cached analytics when cache hit succeeds", async () => {
    const analyticsFromCache = {
      month: {
        key: "31-05-2024",
        label: "May 2024",
        start: new Date("2024-05-01T00:00:00.000Z"),
        end: new Date("2024-06-01T00:00:00.000Z"),
      },
      availableMonths: [{ key: "31-05-2024", label: "May 2024" }],
      rankings: [],
      summary: {
        rankedCount: 0,
        totalMonthlyUpvotes: 0,
        totalScore: 0,
        averageMonthlyUpvotes: 0,
        medianMonthlyUpvotes: 0,
        averageScore: 0,
        topMonthlyUpvotes: null,
        topScore: null,
        bottomScore: null,
        returningCount: 0,
        newCount: 0,
        improvingCount: 0,
        decliningCount: 0,
        stableCount: 0,
        returningRate: 0,
        championScoreDelta: null,
        championUpvoteDelta: null,
        scoreSpread: null,
      },
      history: [],
    }

    cacheHitMock.mockResolvedValueOnce(analyticsFromCache)

    const result = await getLeaderboardScoringAnalytics()

    expect(cacheHitMock).toHaveBeenCalledTimes(1)
    expect(findManyMock).not.toHaveBeenCalled()
    expect(cacheMissMock).not.toHaveBeenCalled()
    expect(result).toBe(analyticsFromCache)
  })
})

import { beforeEach, describe, expect, it, vi, afterEach } from "vitest"

const { groupByMock, upvoteFindManyMock, productFindManyMock } = vi.hoisted(
  () => ({
    groupByMock: vi.fn(),
    upvoteFindManyMock: vi.fn(),
    productFindManyMock: vi.fn(),
  }),
)

const cacheHitMock = vi.hoisted(() => vi.fn())
const cacheMissMock = vi.hoisted(() => vi.fn())

vi.mock("@/lib/prisma", () => ({
  default: {
    productUpvote: {
      groupBy: groupByMock,
      findMany: upvoteFindManyMock,
    },
    product: {
      findMany: productFindManyMock,
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

import { getLeaderboardRangeAnalytics } from "@/lib/server/analytics/leaderboardRange"

describe("getLeaderboardRangeAnalytics", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2024-04-20T00:00:00.000Z"))
    groupByMock.mockReset()
    upvoteFindManyMock.mockReset()
    productFindManyMock.mockReset()
    cacheHitMock.mockReset()
    cacheMissMock.mockReset()
    cacheHitMock.mockResolvedValue(null)
    cacheMissMock.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("returns empty analytics when no activity", async () => {
    groupByMock.mockResolvedValueOnce([]).mockResolvedValueOnce([])
    upvoteFindManyMock.mockResolvedValue([])
    productFindManyMock.mockResolvedValue([])

    const analytics = await getLeaderboardRangeAnalytics(7)

    expect(analytics.summary.totalUpvotes).toBe(0)
    expect(analytics.summary.previousUpvotes).toBe(0)
    expect(analytics.products.top).toHaveLength(0)
    expect(analytics.products.surging).toHaveLength(0)
    expect(analytics.products.new).toHaveLength(0)
    expect(analytics.history).toHaveLength(7)
  })

  it("aggregates upvotes and previous period data", async () => {
    groupByMock
      .mockResolvedValueOnce([
        { productId: "prod-1", _count: { _all: 3 } },
        { productId: "prod-2", _count: { _all: 2 } },
      ])
      .mockResolvedValueOnce([
        { productId: "prod-1", _count: { _all: 1 } },
        { productId: "prod-3", _count: { _all: 4 } },
      ])

    upvoteFindManyMock.mockResolvedValue([
      { productId: "prod-1", createdAt: new Date("2024-04-19T12:00:00.000Z") },
      { productId: "prod-1", createdAt: new Date("2024-04-18T12:00:00.000Z") },
      { productId: "prod-1", createdAt: new Date("2024-04-16T12:00:00.000Z") },
      { productId: "prod-2", createdAt: new Date("2024-04-17T12:00:00.000Z") },
      { productId: "prod-2", createdAt: new Date("2024-04-15T12:00:00.000Z") },
    ])

    productFindManyMock.mockResolvedValue([
      {
        id: "prod-1",
        name: "Alpha",
        slug: "alpha",
        tagline: "Ship faster",
        analytics: { upvotes: 50 },
        category: { name: "Automation" },
        user: { firstName: "Ada", lastName: "Lovelace" },
      },
      {
        id: "prod-2",
        name: "Beta",
        slug: "beta",
        tagline: null,
        analytics: { upvotes: 10 },
        category: { name: null },
        user: { firstName: "Grace", lastName: "Hopper" },
      },
      {
        id: "prod-3",
        name: "Gamma",
        slug: "gamma",
        tagline: null,
        analytics: { upvotes: 30 },
        category: { name: null },
        user: { firstName: "Alan", lastName: "Turing" },
      },
    ])

    const analytics = await getLeaderboardRangeAnalytics(7)

    expect(analytics.summary.totalUpvotes).toBe(5)
    expect(analytics.summary.previousUpvotes).toBe(5)
    expect(analytics.summary.uniqueProducts).toBe(2)
    expect(analytics.summary.newProducts).toBe(1)
    expect(analytics.products.top[0]).toMatchObject({
      id: "prod-1",
      rangeUpvotes: 3,
      previousUpvotes: 1,
      upvoteChange: 2,
      rank: 1,
      isNew: false,
    })
    expect(analytics.products.top[1]).toMatchObject({
      id: "prod-2",
      rangeUpvotes: 2,
      previousUpvotes: 0,
      isNew: true,
    })
    expect(analytics.products.new[0]?.id).toBe("prod-2")
    expect(analytics.products.surging[0]?.id).toBe("prod-1")
    expect(analytics.history).toHaveLength(7)
    expect(cacheMissMock).toHaveBeenCalled()
  })
})

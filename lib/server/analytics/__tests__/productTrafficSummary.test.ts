import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"

const prismaMocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  clickFindMany: vi.fn(),
  upvoteFindMany: vi.fn(),
  clickCount: vi.fn(),
  upvoteCount: vi.fn(),
}))

const cacheHitMock = vi.hoisted(() => vi.fn())
const cacheMissMock = vi.hoisted(() => vi.fn())

vi.mock("@/lib/prisma", () => ({
  default: {
    productTrafficEvent: {
      findMany: prismaMocks.findMany,
    },
    productClickEvent: {
      findMany: prismaMocks.clickFindMany,
      count: prismaMocks.clickCount,
    },
    productUpvote: {
      findMany: prismaMocks.upvoteFindMany,
      count: prismaMocks.upvoteCount,
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

import { getProductTrafficSummary } from "@/lib/server/analytics/productTrafficSummary"

describe("getProductTrafficSummary", () => {
  const fixedNow = new Date("2025-01-10T12:00:00Z")

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(fixedNow)
    prismaMocks.findMany.mockReset()
    prismaMocks.clickFindMany.mockReset()
    prismaMocks.upvoteFindMany.mockReset()
    prismaMocks.clickCount.mockReset()
    prismaMocks.upvoteCount.mockReset()
    cacheHitMock.mockReset()
    cacheMissMock.mockReset()
    cacheHitMock.mockResolvedValue(null)
    cacheMissMock.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("aggregates traffic events into summary data", async () => {
    prismaMocks.findMany
      .mockResolvedValueOnce([
        {
          createdAt: new Date("2025-01-10T08:00:00Z"),
          device: "desktop",
          browser: "Chrome",
          os: "macOS",
          country: "United States",
          region: "California",
          city: "San Francisco",
          referrer: "https://example.com/path",
          ipHash: "hash-1",
          path: "/products/example",
          productId: "prod-1",
          isBot: false,
        },
        {
          createdAt: new Date("2025-01-09T14:00:00Z"),
          device: "mobile",
          browser: "Safari",
          os: "iOS",
          country: null,
          region: null,
          city: null,
          referrer: null,
          ipHash: null,
          path: "/products/example",
          productId: "prod-1",
          isBot: false,
        },
        {
          createdAt: new Date("2025-01-09T10:00:00Z"),
          device: "mobile",
          browser: "Safari",
          os: "iOS",
          country: null,
          region: null,
          city: null,
          referrer: null,
          ipHash: "hash-2",
          path: "/products/example",
          productId: "prod-1",
          isBot: false,
        },
      ])
      .mockResolvedValueOnce([
        {
          createdAt: new Date("2024-12-20T09:00:00Z"),
          ipHash: "hash-prev",
          path: "/products/example",
          country: "United States",
          referrer: "https://example.com/path",
          productId: "prod-1",
          isBot: false,
        },
      ])
      .mockResolvedValueOnce([{ ipHash: "hash-1" }])

    prismaMocks.clickFindMany.mockResolvedValueOnce([
      {
        createdAt: new Date("2025-01-10T08:05:00Z"),
        device: "desktop",
        browser: "Chrome",
        os: "macOS",
        referrer: "https://example.com/path",
      },
    ])
    prismaMocks.upvoteFindMany.mockResolvedValueOnce([
      {
        createdAt: new Date("2025-01-09T14:30:00Z"),
      },
    ])
    prismaMocks.clickCount.mockResolvedValueOnce(1)
    prismaMocks.upvoteCount.mockResolvedValueOnce(0)

    const summary = await getProductTrafficSummary("prod-1", { rangeDays: 3 })

    expect(cacheHitMock).toHaveBeenCalledTimes(1)
    expect(cacheMissMock).toHaveBeenCalledTimes(1)
    expect(cacheMissMock).toHaveBeenCalledWith(
      expect.objectContaining({
        key: expect.stringContaining("trafficSummary"),
        ttlSeconds: 300,
      }),
    )
    expect(summary.totalViews).toEqual(3)
    expect(summary.previousViews).toEqual(1)
    expect(summary.uniqueVisitors).toEqual(3) // hash-1, hash-2, anonymous
    expect(summary.viewsToday).toEqual(1)
    expect(summary.viewsSevenDays).toEqual(3)
    expect(summary.botViews).toEqual(0)
    expect(summary.filters.includeBots).toBe(false)
    expect(summary.deviceBreakdown).toEqual([
      { device: "mobile", label: "Mobile", views: 2 },
      { device: "desktop", label: "Desktop", views: 1 },
    ])
    expect(summary.referrerBreakdown[0]).toMatchObject({
      referrer: "Direct / None",
      views: 2,
    })
    expect(summary.referrerBreakdown[1]).toMatchObject({
      referrer: "example.com",
      views: 1,
    })
    expect(summary.countryBreakdown[0]).toMatchObject({
      country: "Unknown",
      views: 2,
    })
    expect(summary.viewsOverTime).toHaveLength(3)
    expect(summary.viewsOverTime[2]).toMatchObject({
      date: "2025-01-10",
      views: 1,
      uniqueVisitors: 1,
    })
    expect(summary.advanced.pathBreakdown[0]).toMatchObject({
      path: "/products/example",
      views: 3,
    })
    expect(summary.advanced.newVsReturning.returningVisitors).toEqual(1)
    expect(summary.advanced.newVsReturning.newVisitors).toEqual(1)
    expect(summary.advanced.osBreakdown[0]).toMatchObject({
      os: "iOS",
      views: 2,
    })
  })

  it("omits advanced metrics when includeAdvanced is false", async () => {
    prismaMocks.findMany
      .mockResolvedValueOnce([
        {
          createdAt: new Date("2025-01-10T08:00:00Z"),
          device: "desktop",
          browser: "Chrome",
          os: "macOS",
          country: "United States",
          region: "California",
          city: "San Francisco",
          referrer: "https://example.com/path",
          ipHash: "hash-1",
          path: "/products/example",
          productId: "prod-1",
          isBot: false,
        },
      ])
      .mockResolvedValueOnce([])

    const summary = await getProductTrafficSummary("prod-1", {
      rangeDays: 2,
      includeAdvanced: false,
    })

    expect(cacheHitMock).toHaveBeenCalledTimes(1)
    expect(cacheMissMock).toHaveBeenCalledTimes(1)
    expect(prismaMocks.findMany).toHaveBeenCalledTimes(2)
    expect(prismaMocks.clickFindMany).not.toHaveBeenCalled()
    expect(prismaMocks.upvoteFindMany).not.toHaveBeenCalled()
    expect(prismaMocks.clickCount).not.toHaveBeenCalled()
    expect(prismaMocks.upvoteCount).not.toHaveBeenCalled()

    expect(summary.totalViews).toEqual(1)
    expect(summary.botViews).toEqual(0)
    expect(summary.filters.includeBots).toBe(false)
    expect(summary.deviceBreakdown).toEqual([])
    expect(summary.countryBreakdown).toEqual([])
    expect(summary.referrerBreakdown).toEqual([])
    expect(summary.advanced.uniqueVisitorsOverTime).toEqual([])
    expect(summary.advanced.pathBreakdown).toEqual([])
    expect(summary.advanced.newVsReturning).toEqual({
      newVisitors: 0,
      returningVisitors: 0,
      unknownVisitors: 0,
      returningRate: 0,
    })
  })

  it("tracks bot traffic separately and toggles inclusion", async () => {
    prismaMocks.findMany
      .mockResolvedValueOnce([
        {
          createdAt: new Date("2025-01-10T08:00:00Z"),
          device: "desktop",
          browser: "Chrome",
          os: "macOS",
          country: "United States",
          region: "California",
          city: "San Francisco",
          referrer: "https://example.com/path",
          ipHash: "human-hash",
          path: "/products/example",
          productId: "prod-bot",
          isBot: false,
        },
        {
          createdAt: new Date("2025-01-10T08:01:00Z"),
          device: "desktop",
          browser: "Googlebot",
          os: "Other",
          country: "United States",
          region: "California",
          city: "San Francisco",
          referrer: null,
          ipHash: "bot-hash",
          path: "/products/example",
          productId: "prod-bot",
          isBot: true,
        },
      ])
      .mockResolvedValueOnce([])

    const summary = await getProductTrafficSummary("prod-bot", {
      rangeDays: 1,
      includeAdvanced: false,
    })

    expect(summary.totalViews).toEqual(1)
    expect(summary.botViews).toEqual(1)
    expect(summary.filters.includeBots).toBe(false)

    prismaMocks.findMany.mockReset()
    prismaMocks.findMany
      .mockResolvedValueOnce([
        {
          createdAt: new Date("2025-01-10T08:00:00Z"),
          device: "desktop",
          browser: "Chrome",
          os: "macOS",
          country: "United States",
          region: "California",
          city: "San Francisco",
          referrer: "https://example.com/path",
          ipHash: "human-hash",
          path: "/products/example",
          productId: "prod-bot",
          isBot: false,
        },
        {
          createdAt: new Date("2025-01-10T08:01:00Z"),
          device: "desktop",
          browser: "Googlebot",
          os: "Other",
          country: "United States",
          region: "California",
          city: "San Francisco",
          referrer: null,
          ipHash: "bot-hash",
          path: "/products/example",
          productId: "prod-bot",
          isBot: true,
        },
      ])
      .mockResolvedValueOnce([])
    cacheHitMock.mockReset()
    cacheHitMock.mockResolvedValue(null)
    cacheMissMock.mockReset()
    cacheMissMock.mockResolvedValue(undefined)

    const summaryWithBots = await getProductTrafficSummary("prod-bot", {
      rangeDays: 1,
      includeAdvanced: false,
      includeBots: true,
    })

    expect(summaryWithBots.totalViews).toEqual(2)
    expect(summaryWithBots.botViews).toEqual(1)
    expect(summaryWithBots.filters.includeBots).toBe(true)
    expect(prismaMocks.clickFindMany).not.toHaveBeenCalled()
    expect(prismaMocks.upvoteFindMany).not.toHaveBeenCalled()
  })

  it("returns cached traffic summary when available", async () => {
    const cachedSummary = {
      rangeDays: 7,
      totalViews: 0,
      previousViews: 0,
      totalViewsChange: 0,
      uniqueVisitors: 0,
      previousUniqueVisitors: 0,
      uniqueVisitorsChange: 0,
      averageViewsPerDay: 0,
      viewsToday: 0,
      viewsSevenDays: 0,
      clicksInRange: 0,
      previousClicks: 0,
      clicksChange: 0,
      clickThroughRate: 0,
      clickThroughRateChange: 0,
      upvotesInRange: 0,
      previousUpvotes: 0,
      upvotesChange: 0,
      upvoteConversionRate: 0,
      upvoteConversionRateChange: 0,
      botViews: 0,
      previousBotViews: 0,
      viewsOverTime: [],
      deviceBreakdown: [],
      deviceConversionBreakdown: [],
      browserBreakdown: [],
      browserConversionBreakdown: [],
      userAgentBreakdown: [],
      countryBreakdown: [],
      referrerBreakdown: [],
      referrerConversionBreakdown: [],
      osConversionBreakdown: [],
      engagementOverTime: [],
      advanced: {
        uniqueVisitorsOverTime: [],
        pathBreakdown: [],
        osBreakdown: [],
        regionBreakdown: [],
        cityBreakdown: [],
        referrerCategoryBreakdown: [],
        newVsReturning: {
          newVisitors: 0,
          returningVisitors: 0,
          unknownVisitors: 0,
          returningRate: 0,
        },
        anomalies: [],
      },
      filters: {
        includeBots: false,
      },
    } as unknown as import("@/types/analytics").ProductTrafficSummary

    cacheHitMock.mockResolvedValueOnce(cachedSummary)

    const result = await getProductTrafficSummary("prod-1")

    expect(cacheHitMock).toHaveBeenCalledTimes(1)
    expect(result).toBe(cachedSummary)
    expect(prismaMocks.findMany).not.toHaveBeenCalled()
    expect(cacheMissMock).not.toHaveBeenCalled()
  })
})

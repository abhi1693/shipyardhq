import { describe, expect, it, beforeEach, afterEach, vi } from "vitest"

import { getProductAnalyticsNarrative } from "@/lib/server/analytics/productAnalyticsNarrative"
import type { ProductTrafficSummary } from "@/types/analytics"
import * as cache from "@/lib/server/cache"

function createSummary(
  overrides: Partial<ProductTrafficSummary> = {},
): ProductTrafficSummary {
  const base: ProductTrafficSummary = {
    rangeDays: 7,
    totalViews: 120,
    previousViews: 100,
    totalViewsChange: 20,
    uniqueVisitors: 80,
    previousUniqueVisitors: 70,
    uniqueVisitorsChange: 14.3,
    averageViewsPerDay: 17.1,
    viewsToday: 12,
    viewsSevenDays: 120,
    clicksInRange: 30,
    previousClicks: 20,
    clicksChange: 50,
    clickThroughRate: 25,
    clickThroughRateChange: 3,
    upvotesInRange: 6,
    previousUpvotes: 4,
    upvotesChange: 50,
    upvoteConversionRate: 5,
    upvoteConversionRateChange: 1,
    topCountry: { country: "US", views: 60 },
    topReferrer: { referrer: "Google", views: 40 },
    viewsOverTime: [
      { date: "2024-07-01", label: "Jul 1", views: 15, uniqueVisitors: 10 },
      { date: "2024-07-02", label: "Jul 2", views: 18, uniqueVisitors: 12 },
      { date: "2024-07-03", label: "Jul 3", views: 20, uniqueVisitors: 14 },
    ],
    deviceBreakdown: [
      { device: "desktop", label: "Desktop", views: 70 },
      { device: "mobile", label: "Mobile", views: 40 },
    ],
    deviceConversionBreakdown: [
      {
        device: "desktop",
        label: "Desktop",
        views: 70,
        clicks: 20,
        clickThroughRate: 28,
      },
      {
        device: "mobile",
        label: "Mobile",
        views: 40,
        clicks: 10,
        clickThroughRate: 25,
      },
    ],
    countryBreakdown: [
      { country: "US", views: 60 },
      { country: "CA", views: 20 },
    ],
    browserBreakdown: [
      { browser: "Chrome", views: 70 },
      { browser: "Safari", views: 30 },
    ],
    userAgentBreakdown: [
      { browser: "Chrome", os: "macOS", device: "desktop", views: 40 },
      { browser: "Safari", os: "iOS", device: "mobile", views: 25 },
    ],
    browserConversionBreakdown: [
      { browser: "Chrome", views: 70, clicks: 20, clickThroughRate: 28 },
    ],
    referrerBreakdown: [
      { referrer: "Google", views: 40 },
      { referrer: "", views: 30 },
    ],
    referrerConversionBreakdown: [
      {
        referrer: "Google",
        views: 40,
        clicks: 15,
        clickThroughRate: 37.5,
        assistedUpvotes: 2,
        assistedConversionRate: 5,
      },
    ],
    osConversionBreakdown: [
      { os: "macOS", views: 50, clicks: 18, clickThroughRate: 36 },
    ],
    engagementOverTime: [
      { date: "2024-07-01", label: "Jul 1", clicks: 4, upvotes: 1 },
      { date: "2024-07-02", label: "Jul 2", clicks: 5, upvotes: 1 },
      { date: "2024-07-03", label: "Jul 3", clicks: 6, upvotes: 2 },
    ],
    advanced: {
      uniqueVisitorsOverTime: [
        { date: "2024-07-01", label: "Jul 1", views: 10, uniqueVisitors: 10 },
      ],
      pathBreakdown: [],
      osBreakdown: [
        { os: "macOS", views: 50 },
        { os: "Windows", views: 25 },
      ],
      regionBreakdown: [],
      cityBreakdown: [],
      referrerCategoryBreakdown: [
        { category: "search", label: "Search", views: 50 },
        { category: "direct", label: "Direct", views: 40 },
      ],
      newVsReturning: {
        newVisitors: 50,
        returningVisitors: 30,
        unknownVisitors: 10,
        returningRate: 0.375,
      },
      anomalies: [],
      topProducts: [],
      referrerProductMatrix: [],
    },
  }

  return {
    ...base,
    ...overrides,
    advanced: {
      ...base.advanced,
      ...(overrides.advanced ?? {}),
      uniqueVisitorsOverTime:
        overrides.advanced?.uniqueVisitorsOverTime ??
        base.advanced.uniqueVisitorsOverTime,
      pathBreakdown:
        overrides.advanced?.pathBreakdown ?? base.advanced.pathBreakdown,
      osBreakdown: overrides.advanced?.osBreakdown ?? base.advanced.osBreakdown,
      regionBreakdown:
        overrides.advanced?.regionBreakdown ?? base.advanced.regionBreakdown,
      cityBreakdown:
        overrides.advanced?.cityBreakdown ?? base.advanced.cityBreakdown,
      referrerCategoryBreakdown:
        overrides.advanced?.referrerCategoryBreakdown ??
        base.advanced.referrerCategoryBreakdown,
      newVsReturning:
        overrides.advanced?.newVsReturning ?? base.advanced.newVsReturning,
      anomalies: overrides.advanced?.anomalies ?? base.advanced.anomalies,
      topProducts: overrides.advanced?.topProducts ?? base.advanced.topProducts,
      referrerProductMatrix:
        overrides.advanced?.referrerProductMatrix ??
        base.advanced.referrerProductMatrix,
    },
  }
}

const originalKey = process.env.OPENAI_API_KEY

beforeEach(() => {
  delete process.env.OPENAI_API_KEY
})

afterEach(() => {
  if (originalKey === undefined) {
    delete process.env.OPENAI_API_KEY
  } else {
    process.env.OPENAI_API_KEY = originalKey
  }
  vi.restoreAllMocks()
})

describe("getProductAnalyticsNarrative", () => {
  it("returns a fallback narrative when AI is not configured", async () => {
    vi.spyOn(cache, "cacheHit").mockResolvedValue(null)
    vi.spyOn(cache, "cacheMiss").mockResolvedValue()

    const summary = createSummary()
    const narrative = await getProductAnalyticsNarrative(
      "prod_123",
      "Test Product",
      summary,
    )

    expect(narrative.source).toBe("fallback")
    expect(narrative.highlights.length).toBeGreaterThan(0)
    expect(narrative.headline.length).toBeGreaterThan(0)
  })

  it("adds watchouts when performance softens", async () => {
    vi.spyOn(cache, "cacheHit").mockResolvedValue(null)
    vi.spyOn(cache, "cacheMiss").mockResolvedValue()

    const summary = createSummary({
      totalViewsChange: -12,
      clicksChange: -15,
      clickThroughRate: 3,
    })

    const narrative = await getProductAnalyticsNarrative(
      "prod_123",
      "Test Product",
      summary,
    )

    expect(narrative.watchouts).toBeDefined()
    expect(narrative.watchouts && narrative.watchouts.length).toBeGreaterThan(0)
    expect(
      narrative.watchouts?.some((item) => item.toLowerCase().includes("views")),
    ).toBe(true)
  })

  it("caches narratives using range-specific TTLs", async () => {
    vi.spyOn(cache, "cacheHit").mockResolvedValue(null)
    const missSpy = vi.spyOn(cache, "cacheMiss").mockResolvedValue()

    const summary = createSummary({ rangeDays: 30 })

    await getProductAnalyticsNarrative("prod_456", "Test Product", summary)

    const args = missSpy.mock.calls.at(-1)?.[0]
    expect(args?.ttlSeconds).toBe(7 * 24 * 60 * 60)
  })
})

import { beforeEach, describe, expect, it, vi } from "vitest"

const analyticsMocks = vi.hoisted(() => ({
  getAnalyticsIngestionCoveredRange: vi.fn(),
  hasAnalyticsIngestionCoverage: vi.fn(),
  siteTrafficDailyFindMany: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({
  default: {
    siteTrafficDaily: {
      findMany: analyticsMocks.siteTrafficDailyFindMany,
    },
  },
}))

vi.mock("@/lib/server/analytics/ingestion/coverage", () => ({
  getAnalyticsIngestionCoveredRange:
    analyticsMocks.getAnalyticsIngestionCoveredRange,
  hasAnalyticsIngestionCoverage: analyticsMocks.hasAnalyticsIngestionCoverage,
}))

import { dbAnalyticsProvider } from "@/lib/server/analytics/providers/db"

describe("dbAnalyticsProvider Cloudflare boundary", () => {
  beforeEach(() => {
    analyticsMocks.getAnalyticsIngestionCoveredRange.mockReset()
    analyticsMocks.hasAnalyticsIngestionCoverage.mockReset()
    analyticsMocks.siteTrafficDailyFindMany.mockReset()
    analyticsMocks.siteTrafficDailyFindMany.mockResolvedValue([])
  })

  it("returns an empty historical result when database coverage is missing", async () => {
    analyticsMocks.getAnalyticsIngestionCoveredRange.mockResolvedValue(null)
    analyticsMocks.hasAnalyticsIngestionCoverage.mockResolvedValue(false)

    await expect(dbAnalyticsProvider.getHomepageTraffic()).resolves.toEqual({
      windowDays: 1,
      pageViews: 0,
      visitors: 0,
      trafficSeries: [],
    })
  })

  it("builds homepage traffic from site daily coverage only", async () => {
    analyticsMocks.getAnalyticsIngestionCoveredRange.mockResolvedValue({
      days: 2,
      start: new Date("2026-07-19T00:00:00.000Z"),
      end: new Date("2026-07-20T00:00:00.000Z"),
    })
    analyticsMocks.hasAnalyticsIngestionCoverage.mockResolvedValue(true)
    analyticsMocks.siteTrafficDailyFindMany.mockResolvedValue([
      {
        date: new Date("2026-07-19T00:00:00.000Z"),
        pageViews: 120,
        uniqueVisitors: 45,
      },
      {
        date: new Date("2026-07-20T00:00:00.000Z"),
        pageViews: 180,
        uniqueVisitors: 70,
      },
    ])

    await expect(dbAnalyticsProvider.getHomepageTraffic()).resolves.toEqual({
      windowDays: 2,
      pageViews: 300,
      visitors: 115,
      trafficSeries: [
        {
          date: "2026-07-19T00:00:00.000Z",
          pageViews: 120,
          visitors: 45,
        },
        {
          date: "2026-07-20T00:00:00.000Z",
          pageViews: 180,
          visitors: 70,
        },
      ],
    })

    expect(analyticsMocks.hasAnalyticsIngestionCoverage).toHaveBeenCalledWith(
      "site_traffic_daily",
      {
        days: 2,
        start: new Date("2026-07-19T00:00:00.000Z"),
        end: new Date("2026-07-20T00:00:00.000Z"),
      },
    )
  })
})

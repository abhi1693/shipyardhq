import { beforeEach, describe, expect, it, vi } from "vitest"

const analyticsMocks = vi.hoisted(() => ({
  fetchRecentVisitorsFromCloudflare: vi.fn(),
  hasAnalyticsIngestionCoverage: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({ default: {} }))

vi.mock("@/lib/server/analytics/ingestion/coverage", () => ({
  hasAnalyticsIngestionCoverage: analyticsMocks.hasAnalyticsIngestionCoverage,
}))

vi.mock("@/lib/server/analytics/cloudflareAnalytics", () => ({
  fetchRecentVisitorsFromCloudflare:
    analyticsMocks.fetchRecentVisitorsFromCloudflare,
}))

import { dbAnalyticsProvider } from "@/lib/server/analytics/providers/db"
import { ANALYTICS_REPORTING_WINDOW_DAYS } from "@/lib/analytics/reportingWindow"

describe("dbAnalyticsProvider Cloudflare boundary", () => {
  beforeEach(() => {
    analyticsMocks.fetchRecentVisitorsFromCloudflare.mockReset()
    analyticsMocks.hasAnalyticsIngestionCoverage.mockReset()
  })

  it("returns an empty historical result when database coverage is missing", async () => {
    analyticsMocks.hasAnalyticsIngestionCoverage.mockResolvedValue(false)

    await expect(dbAnalyticsProvider.getHomepageTraffic()).resolves.toEqual({
      windowDays: ANALYTICS_REPORTING_WINDOW_DAYS,
      pageViews: 0,
      visitors: 0,
      trafficSeries: [],
    })
    expect(
      analyticsMocks.fetchRecentVisitorsFromCloudflare,
    ).not.toHaveBeenCalled()
  })

  it("calls Cloudflare for realtime visitors", async () => {
    analyticsMocks.fetchRecentVisitorsFromCloudflare.mockResolvedValue(42)

    await expect(dbAnalyticsProvider.getRealtimeVisitors()).resolves.toBe(42)
    expect(
      analyticsMocks.fetchRecentVisitorsFromCloudflare,
    ).toHaveBeenCalledOnce()
  })
})

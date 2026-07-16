import { beforeEach, describe, expect, it, vi } from "vitest"

const analyticsMocks = vi.hoisted(() => ({
  getAnalyticsIngestionCoveredRange: vi.fn(),
  hasAnalyticsIngestionCoverage: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({ default: {} }))

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
})

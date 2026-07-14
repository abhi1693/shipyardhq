import { beforeEach, describe, expect, it, vi } from "vitest"

const cacheMocks = vi.hoisted(() => ({
  buildCacheKey: vi.fn(
    (...parts: Array<string | number | boolean | null | undefined>) =>
      parts
        .filter(
          (part): part is string | number | boolean =>
            part !== null && part !== undefined && `${part}`.length > 0,
        )
        .map((part) => `${part}`)
        .join(":"),
  ),
  cacheHit: vi.fn(),
  cacheMiss: vi.fn(),
}))

const cloudflareMocks = vi.hoisted(() => ({
  fetchRecentVisitorsFromCloudflare: vi.fn(),
}))

vi.mock("@/lib/server/cache", () => cacheMocks)

vi.mock("@/lib/server/analytics/cloudflareAnalytics", () => ({
  fetchRecentVisitorsFromCloudflare:
    cloudflareMocks.fetchRecentVisitorsFromCloudflare,
  hasCloudflareAnalyticsConfig: () => true,
  isTransientCloudflareError: (error: unknown) => {
    return String((error as { message?: unknown }).message ?? "")
      .toLowerCase()
      .includes("timeout")
  },
}))

vi.mock("@/lib/server/analytics/providers/db", () => ({
  dbAnalyticsProvider: {
    getProductTraffic: vi.fn(),
    getProductTrafficMap: vi.fn(),
    getSiteAnalyticsSnapshot: vi.fn(),
    getHomepageTraffic: vi.fn(),
    getRealtimeVisitors: vi.fn(),
  },
}))

import { cacheAnalyticsProvider } from "@/lib/server/analytics/providers/cache"

describe("cacheAnalyticsProvider realtime visitors", () => {
  beforeEach(() => {
    cacheMocks.cacheHit.mockReset()
    cacheMocks.cacheMiss.mockReset().mockResolvedValue(undefined)
    cloudflareMocks.fetchRecentVisitorsFromCloudflare.mockReset()
  })

  it("uses cached recent visitors without calling Cloudflare", async () => {
    cacheMocks.cacheHit.mockResolvedValueOnce(7)

    await expect(cacheAnalyticsProvider.getRealtimeVisitors()).resolves.toBe(7)

    expect(
      cloudflareMocks.fetchRecentVisitorsFromCloudflare,
    ).not.toHaveBeenCalled()
    expect(cacheMocks.cacheMiss).not.toHaveBeenCalled()
  })

  it("stores a short fallback when Cloudflare times out", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    cacheMocks.cacheHit.mockResolvedValueOnce(null)
    cloudflareMocks.fetchRecentVisitorsFromCloudflare.mockRejectedValueOnce(
      new Error("request timeout"),
    )

    await expect(cacheAnalyticsProvider.getRealtimeVisitors()).resolves.toBe(0)

    expect(errorSpy).not.toHaveBeenCalled()
    expect(cacheMocks.cacheMiss).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "analytics:realtime:visitors:v3",
        value: 0,
        ttlSeconds: 120,
      }),
    )

    errorSpy.mockRestore()
  })

  it("logs unexpected Cloudflare failures before falling back", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    const error = new Error("Cloudflare token is invalid")
    cacheMocks.cacheHit.mockResolvedValueOnce(null)
    cloudflareMocks.fetchRecentVisitorsFromCloudflare.mockRejectedValueOnce(
      error,
    )

    await expect(cacheAnalyticsProvider.getRealtimeVisitors()).resolves.toBe(0)

    expect(errorSpy).toHaveBeenCalledWith(
      "[analytics] failed to fetch recent Cloudflare traffic",
      { error },
    )
    expect(cacheMocks.cacheMiss).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "analytics:realtime:visitors:v3",
        value: 0,
        ttlSeconds: 120,
      }),
    )

    errorSpy.mockRestore()
  })
})

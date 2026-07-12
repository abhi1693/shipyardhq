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

const gaMocks = vi.hoisted(() => ({
  fetchRealtimeVisitorsFromGa: vi.fn(),
}))

vi.mock("@/lib/server/cache", () => cacheMocks)

vi.mock("@/lib/server/analytics/googleAnalytics", () => ({
  fetchRealtimeVisitorsFromGa: gaMocks.fetchRealtimeVisitorsFromGa,
  hasGaAnalyticsConfig: () => true,
  isTransientGaError: (error: unknown) => {
    const errorLike = error as { code?: unknown; message?: unknown }
    return (
      errorLike.code === 14 ||
      String(errorLike.message ?? "")
        .toLowerCase()
        .includes("deadline exceeded")
    )
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

vi.mock("@/lib/server/analytics/providers/ga", () => ({
  gaAnalyticsProvider: {
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
    gaMocks.fetchRealtimeVisitorsFromGa.mockReset()
  })

  it("uses cached realtime visitors without calling GA", async () => {
    cacheMocks.cacheHit.mockResolvedValueOnce(7)

    await expect(cacheAnalyticsProvider.getRealtimeVisitors()).resolves.toBe(7)

    expect(gaMocks.fetchRealtimeVisitorsFromGa).not.toHaveBeenCalled()
    expect(cacheMocks.cacheMiss).not.toHaveBeenCalled()
  })

  it("stores a short fallback when GA realtime times out", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    cacheMocks.cacheHit.mockResolvedValueOnce(null)
    gaMocks.fetchRealtimeVisitorsFromGa.mockRejectedValueOnce(
      new Error("deadline exceeded"),
    )

    await expect(cacheAnalyticsProvider.getRealtimeVisitors()).resolves.toBe(1)

    expect(errorSpy).not.toHaveBeenCalled()
    expect(cacheMocks.cacheMiss).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "analytics:realtime:visitors:v1",
        value: 0,
        ttlSeconds: 120,
      }),
    )

    errorSpy.mockRestore()
  })

  it("logs unexpected GA realtime failures before falling back", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    const error = new Error("GA_PROPERTY_ID is missing")
    cacheMocks.cacheHit.mockResolvedValueOnce(null)
    gaMocks.fetchRealtimeVisitorsFromGa.mockRejectedValueOnce(error)

    await expect(cacheAnalyticsProvider.getRealtimeVisitors()).resolves.toBe(1)

    expect(errorSpy).toHaveBeenCalledWith(
      "[analytics] failed to fetch realtime visitors from GA",
      { error },
    )
    expect(cacheMocks.cacheMiss).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "analytics:realtime:visitors:v1",
        value: 0,
        ttlSeconds: 120,
      }),
    )

    errorSpy.mockRestore()
  })
})

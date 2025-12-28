import { buildCacheKey, cacheHit, cacheMiss } from "@/lib/server/cache"
import type { AnalyticsProvider } from "@/lib/server/analytics/providerTypes"
import { dbAnalyticsProvider } from "@/lib/server/analytics/providers/db"
import { fetchRealtimeVisitorsFromGa } from "@/lib/server/analytics/googleAnalytics"

const REALTIME_VISITORS_CACHE_KEY = buildCacheKey(
  "analytics:realtime:visitors:v1",
)
const REALTIME_VISITORS_TTL_SECONDS = 120
const REALTIME_VISITORS_IN_PROCESS_TTL_MS = 30_000

function normalizeRealtimeVisitors(value: number) {
  return value === 0 ? 1 : value
}

async function getCachedRealtimeVisitors(): Promise<number | null> {
  const cached = await cacheHit<number>({
    key: REALTIME_VISITORS_CACHE_KEY,
    deserialize: (value) => Number(value),
    onError: (error) => {
      console.error("[analytics] failed to read realtime cache", { error })
    },
    inProcessTtlMs: REALTIME_VISITORS_IN_PROCESS_TTL_MS,
  })

  if (!Number.isFinite(cached ?? NaN)) {
    return null
  }

  return cached ?? null
}

async function storeRealtimeVisitors(value: number) {
  await cacheMiss({
    key: REALTIME_VISITORS_CACHE_KEY,
    value,
    ttlSeconds: REALTIME_VISITORS_TTL_SECONDS,
    serialize: (payload) => String(payload),
    onError: (error) => {
      console.error("[analytics] failed to write realtime cache", { error })
    },
    inProcessTtlMs: REALTIME_VISITORS_IN_PROCESS_TTL_MS,
  })
}

async function fetchRealtimeVisitorsWithCache(): Promise<number> {
  const cached = await getCachedRealtimeVisitors()
  if (cached !== null) {
    return normalizeRealtimeVisitors(cached)
  }

  try {
    const fresh = await fetchRealtimeVisitorsFromGa()
    await storeRealtimeVisitors(fresh)
    return normalizeRealtimeVisitors(fresh)
  } catch (error) {
    console.error("[analytics] failed to fetch realtime visitors from GA", {
      error,
    })
    return normalizeRealtimeVisitors(0)
  }
}

export const cacheAnalyticsProvider: AnalyticsProvider = {
  getProductTraffic: (args) => dbAnalyticsProvider.getProductTraffic(args),
  getProductTrafficMap: (args) => dbAnalyticsProvider.getProductTrafficMap(args),
  getSiteAnalyticsSnapshot: (args) =>
    dbAnalyticsProvider.getSiteAnalyticsSnapshot(args),
  getHomepageTraffic: () => dbAnalyticsProvider.getHomepageTraffic(),
  getRealtimeVisitors: () => fetchRealtimeVisitorsWithCache(),
}

export function createCacheAnalyticsProvider(): AnalyticsProvider {
  return cacheAnalyticsProvider
}

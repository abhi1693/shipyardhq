import { createHash } from "crypto"
import { format, subDays } from "date-fns"

import { buildCacheKey, cacheHit, cacheMiss } from "@/lib/server/cache"
import type {
  AnalyticsProvider,
  AnalyticsDateRange,
  ProductTrafficMapEntry,
  ProductTrafficSummary,
} from "@/lib/server/analytics/providerTypes"
import { dbAnalyticsProvider } from "@/lib/server/analytics/providers/db"
import { gaAnalyticsProvider } from "@/lib/server/analytics/providers/ga"
import {
  fetchRealtimeVisitorsFromGa,
  hasGaAnalyticsConfig,
  isTransientGaError,
  type HomepageTraffic,
  type SiteAnalyticsSnapshot,
} from "@/lib/server/analytics/googleAnalytics"

const REALTIME_VISITORS_CACHE_KEY = buildCacheKey(
  "analytics:realtime:visitors:v1",
)
const REALTIME_VISITORS_TTL_SECONDS = 120
const REALTIME_VISITORS_IN_PROCESS_TTL_MS = 30_000
const PRODUCT_TRAFFIC_TTL_SECONDS = 300
const PRODUCT_TRAFFIC_IN_PROCESS_TTL_MS = 60_000
const PRODUCT_TRAFFIC_MAP_TTL_SECONDS = 300
const PRODUCT_TRAFFIC_MAP_IN_PROCESS_TTL_MS = 60_000
const SITE_SNAPSHOT_TTL_SECONDS = 900
const SITE_SNAPSHOT_IN_PROCESS_TTL_MS = 60_000
const HOMEPAGE_TRAFFIC_TTL_SECONDS = 900
const HOMEPAGE_TRAFFIC_IN_PROCESS_TTL_MS = 60_000

function normalizeRealtimeVisitors(value: number) {
  return value === 0 ? 1 : value
}

function normalizeKeyParts(parts: string[]): string[] {
  return Array.from(
    new Set(parts.map((part) => part.trim()).filter((part) => part.length > 0)),
  ).sort((a, b) => a.localeCompare(b))
}

function hashValues(values: string[]) {
  const payload = values.join("|")
  return createHash("sha256").update(payload).digest("hex").slice(0, 12)
}

function cacheKeyForProductTraffic(args: {
  pagePaths: string[]
  dateRange: AnalyticsDateRange
  includeAdvanced?: boolean
}) {
  const paths = normalizeKeyParts(args.pagePaths)
  const advancedKey = args.includeAdvanced === false ? "basic" : "advanced"
  return buildCacheKey(
    "analytics:cache:product-traffic:v2",
    args.dateRange.startDate,
    args.dateRange.endDate,
    advancedKey,
    ...paths,
  )
}

function cacheKeyForProductTrafficMap(args: {
  products: Array<{ id: string; slug: string }>
  dateRange: AnalyticsDateRange
}) {
  const ids = normalizeKeyParts(args.products.map((product) => product.id))
  const signature = ids.length > 0 ? hashValues(ids) : "empty"
  return buildCacheKey(
    "analytics:cache:product-traffic-map:v2",
    args.dateRange.startDate,
    args.dateRange.endDate,
    `n${ids.length}`,
    `h${signature}`,
  )
}

function defaultSiteDateRange(): AnalyticsDateRange {
  const end = subDays(new Date(), 0)
  const start = subDays(end, 29)
  return {
    startDate: format(start, "yyyy-MM-dd"),
    endDate: format(end, "yyyy-MM-dd"),
  }
}

function cacheKeyForSiteSnapshot(args?: {
  dateRange?: AnalyticsDateRange
  topProductLimit?: number
}) {
  const range = args?.dateRange ?? defaultSiteDateRange()
  const topProductLimit = Math.max(1, args?.topProductLimit ?? 6)
  return buildCacheKey(
    "analytics:cache:site-snapshot:v2",
    range.startDate,
    range.endDate,
    `top${topProductLimit}`,
  )
}

const HOMEPAGE_TRAFFIC_CACHE_KEY = buildCacheKey(
  "analytics:cache:homepage-traffic:v2",
)

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

  if (!hasGaAnalyticsConfig()) {
    await storeRealtimeVisitors(0)
    return normalizeRealtimeVisitors(0)
  }

  try {
    const fresh = await fetchRealtimeVisitorsFromGa()
    await storeRealtimeVisitors(fresh)
    return normalizeRealtimeVisitors(fresh)
  } catch (error) {
    if (!isTransientGaError(error)) {
      console.error("[analytics] failed to fetch realtime visitors from GA", {
        error,
      })
    }
    await storeRealtimeVisitors(0)
    return normalizeRealtimeVisitors(0)
  }
}

async function fetchProductTrafficWithCache(args: {
  pagePaths: string[]
  dateRange: AnalyticsDateRange
  includeAdvanced?: boolean
}): Promise<ProductTrafficSummary> {
  const cacheKey = cacheKeyForProductTraffic(args)
  const cached = await cacheHit<ProductTrafficSummary>({
    key: cacheKey,
    onError: (error) => {
      console.error("[analytics] failed to read product traffic cache", {
        error,
      })
    },
    inProcessTtlMs: PRODUCT_TRAFFIC_IN_PROCESS_TTL_MS,
  })

  if (cached) {
    return cached
  }

  let fresh: ProductTrafficSummary
  try {
    fresh = await dbAnalyticsProvider.getProductTraffic(args)
  } catch (error) {
    console.error("[analytics] failed to fetch product traffic", { error })
    fresh = await gaAnalyticsProvider.getProductTraffic(args)
  }

  await cacheMiss({
    key: cacheKey,
    value: fresh,
    ttlSeconds: PRODUCT_TRAFFIC_TTL_SECONDS,
    onError: (error) => {
      console.error("[analytics] failed to write product traffic cache", {
        error,
      })
    },
    inProcessTtlMs: PRODUCT_TRAFFIC_IN_PROCESS_TTL_MS,
  })

  return fresh
}

type CachedTrafficMap = Record<string, ProductTrafficMapEntry>

function mapToRecord(
  map: Map<string, ProductTrafficMapEntry>,
): CachedTrafficMap {
  const record: CachedTrafficMap = {}
  for (const [key, value] of map.entries()) {
    record[key] = value
  }
  return record
}

function recordToMap(
  record: CachedTrafficMap,
): Map<string, ProductTrafficMapEntry> {
  const map = new Map<string, ProductTrafficMapEntry>()
  for (const [key, value] of Object.entries(record)) {
    map.set(key, value)
  }
  return map
}

async function fetchProductTrafficMapWithCache(args: {
  products: Array<{ id: string; slug: string }>
  dateRange: AnalyticsDateRange
}): Promise<Map<string, ProductTrafficMapEntry>> {
  const cacheKey = cacheKeyForProductTrafficMap(args)
  const cached = await cacheHit<CachedTrafficMap>({
    key: cacheKey,
    deserialize: (value) => JSON.parse(value) as CachedTrafficMap,
    onError: (error) => {
      console.error("[analytics] failed to read product map cache", { error })
    },
    inProcessTtlMs: PRODUCT_TRAFFIC_MAP_IN_PROCESS_TTL_MS,
  })

  if (cached) {
    return recordToMap(cached)
  }

  let fresh: Map<string, ProductTrafficMapEntry>
  try {
    fresh = await dbAnalyticsProvider.getProductTrafficMap(args)
  } catch (error) {
    console.error("[analytics] failed to fetch product map", { error })
    fresh = await gaAnalyticsProvider.getProductTrafficMap(args)
  }

  await cacheMiss({
    key: cacheKey,
    value: mapToRecord(fresh),
    ttlSeconds: PRODUCT_TRAFFIC_MAP_TTL_SECONDS,
    serialize: (value) => JSON.stringify(value),
    onError: (error) => {
      console.error("[analytics] failed to write product map cache", { error })
    },
    inProcessTtlMs: PRODUCT_TRAFFIC_MAP_IN_PROCESS_TTL_MS,
  })

  return fresh
}

async function fetchSiteSnapshotWithCache(args?: {
  dateRange?: AnalyticsDateRange
  topProductLimit?: number
}): Promise<SiteAnalyticsSnapshot> {
  const cacheKey = cacheKeyForSiteSnapshot(args)
  const cached = await cacheHit<SiteAnalyticsSnapshot>({
    key: cacheKey,
    onError: (error) => {
      console.error("[analytics] failed to read site snapshot cache", { error })
    },
    inProcessTtlMs: SITE_SNAPSHOT_IN_PROCESS_TTL_MS,
  })

  if (cached) {
    return cached
  }

  let fresh: SiteAnalyticsSnapshot
  try {
    fresh = await dbAnalyticsProvider.getSiteAnalyticsSnapshot(args)
  } catch (error) {
    console.error("[analytics] failed to fetch site snapshot", { error })
    fresh = await gaAnalyticsProvider.getSiteAnalyticsSnapshot(args)
  }

  await cacheMiss({
    key: cacheKey,
    value: fresh,
    ttlSeconds: SITE_SNAPSHOT_TTL_SECONDS,
    onError: (error) => {
      console.error("[analytics] failed to write site snapshot cache", {
        error,
      })
    },
    inProcessTtlMs: SITE_SNAPSHOT_IN_PROCESS_TTL_MS,
  })

  return fresh
}

async function fetchHomepageTrafficWithCache(): Promise<HomepageTraffic> {
  const cached = await cacheHit<HomepageTraffic>({
    key: HOMEPAGE_TRAFFIC_CACHE_KEY,
    onError: (error) => {
      console.error("[analytics] failed to read homepage traffic cache", {
        error,
      })
    },
    inProcessTtlMs: HOMEPAGE_TRAFFIC_IN_PROCESS_TTL_MS,
  })

  if (cached) {
    return cached
  }

  let fresh: HomepageTraffic
  try {
    fresh = await dbAnalyticsProvider.getHomepageTraffic()
  } catch (error) {
    if (!hasGaAnalyticsConfig()) {
      fresh = { pageViews30: 0, visitors30: 0, trafficSeries: [] }
    } else {
      console.error("[analytics] failed to fetch homepage traffic", { error })
      fresh = await gaAnalyticsProvider.getHomepageTraffic()
    }
  }

  await cacheMiss({
    key: HOMEPAGE_TRAFFIC_CACHE_KEY,
    value: fresh,
    ttlSeconds: HOMEPAGE_TRAFFIC_TTL_SECONDS,
    onError: (error) => {
      console.error("[analytics] failed to write homepage traffic cache", {
        error,
      })
    },
    inProcessTtlMs: HOMEPAGE_TRAFFIC_IN_PROCESS_TTL_MS,
  })

  return fresh
}

export const cacheAnalyticsProvider: AnalyticsProvider = {
  getProductTraffic: (args) => fetchProductTrafficWithCache(args),
  getProductTrafficMap: (args) => fetchProductTrafficMapWithCache(args),
  getSiteAnalyticsSnapshot: (args) => fetchSiteSnapshotWithCache(args),
  getHomepageTraffic: () => fetchHomepageTrafficWithCache(),
  getRealtimeVisitors: () => fetchRealtimeVisitorsWithCache(),
}

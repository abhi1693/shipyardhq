import { createHash } from "crypto"

import {
  ANALYTICS_REPORTING_WINDOW_DAYS,
  getAnalyticsReportingWindow,
} from "@/lib/analytics/reportingWindow"

import {
  buildCacheKey,
  cacheHit,
  cacheMiss,
  invalidateCacheByPrefix,
} from "@/lib/server/cache"
import type {
  AnalyticsProvider,
  AnalyticsDateRange,
  HomepageTraffic,
  ProductTrafficMapEntry,
  ProductTrafficSummary,
  SiteAnalyticsSnapshot,
} from "@/lib/server/analytics/providerTypes"
import { dbAnalyticsProvider } from "@/lib/server/analytics/providers/db"
import {
  fetchRecentVisitorsFromCloudflare,
  hasCloudflareAnalyticsConfig,
  isTransientCloudflareError,
} from "@/lib/server/analytics/cloudflareAnalytics"
import { getAvailableSiteAnalyticsReportingWindow } from "@/lib/server/analytics/reportingWindow"

const REALTIME_VISITORS_CACHE_KEY = buildCacheKey(
  "analytics:realtime:visitors:v3",
)
const DAILY_TRAFFIC_TTL_SECONDS = 60 * 60 * 24
const REALTIME_VISITORS_TTL_SECONDS = 60
const PRODUCT_TRAFFIC_TTL_SECONDS = DAILY_TRAFFIC_TTL_SECONDS
const PRODUCT_TRAFFIC_MAP_TTL_SECONDS = DAILY_TRAFFIC_TTL_SECONDS
const SITE_SNAPSHOT_TTL_SECONDS = DAILY_TRAFFIC_TTL_SECONDS
const HOMEPAGE_TRAFFIC_TTL_SECONDS = DAILY_TRAFFIC_TTL_SECONDS

function normalizeRealtimeVisitors(value: number) {
  return Math.max(0, value)
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
    "analytics:cache:product-traffic:v6",
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
    "analytics:cache:product-traffic-map:v5",
    args.dateRange.startDate,
    args.dateRange.endDate,
    `n${ids.length}`,
    `h${signature}`,
  )
}

function defaultSiteDateRange(): AnalyticsDateRange {
  const { startDate, endDate } = getAnalyticsReportingWindow()
  return {
    startDate,
    endDate,
  }
}

function cacheKeyForSiteSnapshot(args?: {
  dateRange?: AnalyticsDateRange
  topProductLimit?: number
}) {
  const range = args?.dateRange ?? defaultSiteDateRange()
  const topProductLimit = Math.max(1, args?.topProductLimit ?? 6)
  return buildCacheKey(
    "analytics:cache:site-snapshot:v10",
    `${ANALYTICS_REPORTING_WINDOW_DAYS}d`,
    range.startDate,
    range.endDate,
    `top${topProductLimit}`,
  )
}

const ANALYTICS_CACHE_PREFIX = buildCacheKey("analytics:cache")
const ANALYTICS_PAGE_CACHE_PREFIX = buildCacheKey("analytics:page")

function cacheKeyForHomepageTraffic(dateRange: AnalyticsDateRange) {
  return buildCacheKey(
    "analytics:cache:homepage-traffic:v8",
    dateRange.startDate,
    dateRange.endDate,
  )
}

function emptyProductTrafficSummary(): ProductTrafficSummary {
  return {
    pageViews: 0,
    uniqueVisitors: 0,
    newUsers: 0,
    returningVisitors: 0,
    sessions: 0,
    bounceRate: 0,
    averageSessionDuration: 0,
    browsers: [],
    operatingSystems: [],
    cities: [],
    countries: [],
    devices: [],
    timeseries: [],
  }
}

function emptySiteAnalyticsSnapshot(): SiteAnalyticsSnapshot {
  return {
    pageViews: 0,
    uniqueVisitors: 0,
    sessions: 0,
    bounceRate: 0,
    averageSessionDuration: 0,
    newUsers: 0,
    engagementRate: 0,
    pagesPerSession: 0,
    timeseries: [],
    browsers: [],
    operatingSystems: [],
    devices: [],
    countries: [],
    regions: [],
    cities: [],
    hourlyActivity: [],
    aiCrawlerAttention: {
      totalRequests: 0,
      shareOfTraffic: 0,
      successfulRequests: 0,
      successRate: 0,
      categories: [],
      crawlStatuses: [],
      responseStatuses: [],
      endpoints: [],
    },
    trafficComposition: {
      totalRequests: 0,
      browserRequests: 0,
      verifiedAutomatedRequests: 0,
      otherRequests: 0,
      verifiedCategories: [],
    },
    topProductPages: [],
  }
}

export async function invalidateAnalyticsCache(reason = "manual") {
  const [analytics, pages] = await Promise.all([
    invalidateCacheByPrefix({
      keyPrefix: ANALYTICS_CACHE_PREFIX,
      onError: (error) => {
        console.error("[analytics] failed to invalidate provider cache", {
          reason,
          error,
        })
      },
    }),
    invalidateCacheByPrefix({
      keyPrefix: ANALYTICS_PAGE_CACHE_PREFIX,
      onError: (error) => {
        console.error("[analytics] failed to invalidate page cache", {
          reason,
          error,
        })
      },
    }),
  ])

  console.info(
    `[analytics] cache invalidated (${reason}): ${analytics.redisKeysDeleted.toLocaleString(
      "en-US",
    )} analytics keys, ${pages.redisKeysDeleted.toLocaleString(
      "en-US",
    )} page keys`,
  )

  return { analytics, pages }
}

async function getCachedRealtimeVisitors(): Promise<number | null> {
  const cached = await cacheHit<number>({
    key: REALTIME_VISITORS_CACHE_KEY,
    deserialize: (value) => Number(value),
    onError: (error) => {
      console.error("[analytics] failed to read realtime cache", { error })
    },
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
  })
}

async function fetchRealtimeVisitorsWithCache(): Promise<number> {
  const cached = await getCachedRealtimeVisitors()
  if (cached !== null) {
    return normalizeRealtimeVisitors(cached)
  }

  if (!hasCloudflareAnalyticsConfig()) {
    await storeRealtimeVisitors(0)
    return normalizeRealtimeVisitors(0)
  }

  try {
    const fresh = await fetchRecentVisitorsFromCloudflare()
    await storeRealtimeVisitors(fresh)
    return normalizeRealtimeVisitors(fresh)
  } catch (error) {
    if (!isTransientCloudflareError(error)) {
      console.error("[analytics] failed to fetch recent Cloudflare traffic", {
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
  })

  if (cached) {
    return cached
  }

  let fresh: ProductTrafficSummary
  try {
    fresh = await dbAnalyticsProvider.getProductTraffic(args)
  } catch (error) {
    console.error("[analytics] failed to fetch product traffic", { error })
    return emptyProductTrafficSummary()
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
  })

  if (cached) {
    return recordToMap(cached)
  }

  let fresh: Map<string, ProductTrafficMapEntry>
  try {
    fresh = await dbAnalyticsProvider.getProductTrafficMap(args)
  } catch (error) {
    console.error("[analytics] failed to fetch product map", { error })
    return new Map(
      args.products.map((product) => [
        product.id,
        { pageViews: 0, uniqueVisitors: 0, sessions: 0 },
      ]),
    )
  }

  await cacheMiss({
    key: cacheKey,
    value: mapToRecord(fresh),
    ttlSeconds: PRODUCT_TRAFFIC_MAP_TTL_SECONDS,
    serialize: (value) => JSON.stringify(value),
    onError: (error) => {
      console.error("[analytics] failed to write product map cache", { error })
    },
  })

  return fresh
}

async function fetchSiteSnapshotWithCache(args?: {
  dateRange?: AnalyticsDateRange
  topProductLimit?: number
}): Promise<SiteAnalyticsSnapshot> {
  const resolvedArgs = args?.dateRange
    ? args
    : {
        ...args,
        dateRange: await getAvailableSiteAnalyticsReportingWindow(),
      }
  const cacheKey = cacheKeyForSiteSnapshot(resolvedArgs)
  const cached = await cacheHit<SiteAnalyticsSnapshot>({
    key: cacheKey,
    onError: (error) => {
      console.error("[analytics] failed to read site snapshot cache", { error })
    },
  })

  if (cached) {
    return cached
  }

  let fresh: SiteAnalyticsSnapshot
  try {
    fresh = await dbAnalyticsProvider.getSiteAnalyticsSnapshot(resolvedArgs)
  } catch (error) {
    console.error("[analytics] failed to fetch site snapshot", { error })
    return emptySiteAnalyticsSnapshot()
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
  })

  return fresh
}

async function fetchHomepageTrafficWithCache(): Promise<HomepageTraffic> {
  const reportingWindow = await getAvailableSiteAnalyticsReportingWindow()
  const dateRange = {
    startDate: reportingWindow.startDate,
    endDate: reportingWindow.endDate,
  }
  const cacheKey = cacheKeyForHomepageTraffic(dateRange)
  const cached = await cacheHit<HomepageTraffic>({
    key: cacheKey,
    onError: (error) => {
      console.error("[analytics] failed to read homepage traffic cache", {
        error,
      })
    },
  })

  if (cached) {
    return cached
  }

  let fresh: HomepageTraffic
  try {
    const snapshot = await dbAnalyticsProvider.getSiteAnalyticsSnapshot({
      dateRange,
    })
    fresh = {
      windowDays: reportingWindow.days,
      pageViews: snapshot.pageViews,
      visitors: snapshot.uniqueVisitors,
      trafficSeries: snapshot.timeseries.map((point) => ({
        date: point.date,
        pageViews: point.pageViews,
        visitors: point.uniqueVisitors,
      })),
    }
  } catch (error) {
    console.error("[analytics] failed to fetch homepage traffic", { error })
    return {
      windowDays: 1,
      pageViews: 0,
      visitors: 0,
      trafficSeries: [],
    }
  }

  await cacheMiss({
    key: cacheKey,
    value: fresh,
    ttlSeconds: HOMEPAGE_TRAFFIC_TTL_SECONDS,
    onError: (error) => {
      console.error("[analytics] failed to write homepage traffic cache", {
        error,
      })
    },
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

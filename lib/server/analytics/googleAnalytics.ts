import { BetaAnalyticsDataClient, protos } from "@google-analytics/data"
import { format, subDays } from "date-fns"

import { buildCacheKey, cacheHit, cacheMiss } from "@/lib/server/cache"
import { getRedisClient } from "@/lib/server/redis"
import { productPath } from "@/lib/routes"
import {
  andGaDimensionFilters,
  buildPagePathFilter,
  buildGaHostnameExclusionFilter,
  extractProductSlug,
  normalizeBounceRate,
  normalizePath,
  parseDateString,
  parseMetricValue,
  resolveMetricValue,
  resolveReferrerDomain,
} from "@/lib/server/analytics/providers/ga/helpers"

export type HomepageTraffic = {
  pageViews30: number
  visitors30: number
  trafficSeries: Array<{ date: string; pageViews: number; visitors: number }>
}

function emptyHomepageTraffic(): HomepageTraffic {
  return { pageViews30: 0, visitors30: 0, trafficSeries: [] }
}

export type SiteAnalyticsSnapshot = {
  pageViews: number
  uniqueVisitors: number
  sessions: number
  bounceRate: number
  averageSessionDuration: number
  newUsers: number
  engagementRate: number
  pagesPerSession: number
  referrers: Array<{ referrer: string; views: number; share: number }>
  timeseries: Array<{
    date: string
    label: string
    pageViews: number
    uniqueVisitors: number
  }>
  browsers: Array<{ browser: string; visitors: number; share: number }>
  operatingSystems: Array<{ os: string; visitors: number; share: number }>
  devices: Array<{ deviceCategory: string; visitors: number; share: number }>
  countries: Array<{
    country: string
    code?: string | null
    visitors: number
    share: number
  }>
  regions: Array<{
    region: string
    country?: string | null
    code?: string | null
    visitors: number
    share: number
  }>
  cities: Array<{
    city: string
    region?: string | null
    country?: string | null
    code?: string | null
    visitors: number
    share: number
  }>
  topProductPages: Array<{
    path: string
    slug: string | null
    pageViews: number
    uniqueVisitors: number
    sessions: number
    bounceRate: number
    averageSessionDuration: number
    shareOfViews: number
  }>
}

const CACHE_KEY = buildCacheKey("analytics:homepage:traffic:v2")
const DAILY_TRAFFIC_CACHE_TTL_SECONDS = 60 * 60 * 24
const CACHE_TTL_SECONDS = DAILY_TRAFFIC_CACHE_TTL_SECONDS
const REALTIME_CACHE_KEY = buildCacheKey("analytics:homepage:realtime:v1")
const REALTIME_CACHE_TTL_SECONDS = 120
const SITE_SNAPSHOT_CACHE_PREFIX = "analytics:site:snapshot:v3"
const SITE_SNAPSHOT_CACHE_TTL_SECONDS = DAILY_TRAFFIC_CACHE_TTL_SECONDS
const PRODUCT_TRAFFIC_CACHE_PREFIX = "analytics:product:traffic:v2"
const PRODUCT_TRAFFIC_CACHE_TTL_SECONDS = DAILY_TRAFFIC_CACHE_TTL_SECONDS
const DEFAULT_GA_REPORT_TIMEOUT_MS = 10_000
const DEFAULT_GA_REALTIME_REPORT_TIMEOUT_MS = 4_000
const CACHE_KEY_JITTER_BUCKETS = Math.max(
  1,
  Number.isFinite(
    Number.parseInt(process.env.GA_CACHE_KEY_JITTER_BUCKETS ?? "", 10),
  )
    ? Number.parseInt(process.env.GA_CACHE_KEY_JITTER_BUCKETS ?? "", 10)
    : 4,
)
const CACHE_KEY_JITTER_BUCKET = Math.floor(
  Math.random() * CACHE_KEY_JITTER_BUCKETS,
)
const GA_REPORT_TIMEOUT_MS = parsePositiveIntegerEnv(
  "GA_REPORT_TIMEOUT_MS",
  DEFAULT_GA_REPORT_TIMEOUT_MS,
)
const GA_REALTIME_REPORT_TIMEOUT_MS = parsePositiveIntegerEnv(
  "GA_REALTIME_REPORT_TIMEOUT_MS",
  DEFAULT_GA_REALTIME_REPORT_TIMEOUT_MS,
)
let clientPromise: Promise<BetaAnalyticsDataClient> | null = null

type ErrorLike = {
  code?: unknown
  details?: unknown
  message?: unknown
}

const TRANSIENT_GA_ERROR_CODES = new Set<unknown>([
  4,
  8,
  10,
  13,
  14,
  "4",
  "8",
  "10",
  "13",
  "14",
  "DEADLINE_EXCEEDED",
  "RESOURCE_EXHAUSTED",
  "ABORTED",
  "INTERNAL",
  "UNAVAILABLE",
])
const TRANSIENT_GA_ERROR_PATTERNS = [
  "deadline exceeded",
  "econnreset",
  "etimedout",
  "socket hang up",
  "unavailable",
  "resource exhausted",
]

export function isTransientGaError(error: unknown): boolean {
  const errorLike = error as ErrorLike
  if (TRANSIENT_GA_ERROR_CODES.has(errorLike?.code)) {
    return true
  }

  const detailText = `${errorLike?.details ?? ""} ${errorLike?.message ?? ""}`
    .trim()
    .toLowerCase()
  return TRANSIENT_GA_ERROR_PATTERNS.some((pattern) =>
    detailText.includes(pattern),
  )
}

export type GaDateRange = {
  startDate: string
  endDate: string
}

export const GA_MIN_START_DATE = "2025-07-20"

export type GaProductTrafficSummary = {
  pageViews: number
  uniqueVisitors: number
  newUsers: number
  returningVisitors: number
  sessions: number
  bounceRate: number
  averageSessionDuration: number
  referrers: Array<{
    referrer: string
    views: number
    share: number
  }>
  referrerCategories: Array<{
    category: string
    views: number
    share: number
  }>
  browsers: Array<{
    browser: string
    visitors: number
  }>
  operatingSystems: Array<{
    os: string
    visitors: number
  }>
  countries: Array<{
    country: string
    code?: string | null
    visitors: number
    share: number
  }>
  cities: Array<{
    city: string
    region?: string | null
    country?: string | null
    code?: string | null
    visitors: number
  }>
  devices: Array<{
    deviceCategory: string
    visitors: number
  }>
  timeseries: Array<{
    date: string
    label: string
    pageViews: number
    uniqueVisitors: number
  }>
}

function emptyProductTrafficSummary(): GaProductTrafficSummary {
  return {
    pageViews: 0,
    uniqueVisitors: 0,
    newUsers: 0,
    returningVisitors: 0,
    sessions: 0,
    bounceRate: 0,
    averageSessionDuration: 0,
    referrers: [],
    referrerCategories: [],
    browsers: [],
    operatingSystems: [],
    cities: [],
    countries: [],
    devices: [],
    timeseries: [],
  }
}

function isGaConfigError(error: unknown) {
  const message = String((error as ErrorLike)?.message ?? "").toLowerCase()
  return (
    message.includes("ga_credentials_json is missing or invalid") ||
    message.includes("ga_property_id") ||
    (message.includes("google analytics") && message.includes("not configured"))
  )
}

function jitterCacheKey(baseKey: string) {
  return `${baseKey}:j${CACHE_KEY_JITTER_BUCKET}`
}

type RedisClient = NonNullable<Awaited<ReturnType<typeof getRedisClient>>>

async function readRedisCache(
  redis: RedisClient,
  key: string,
): Promise<string | null> {
  try {
    return await redis.get(key)
  } catch {
    return null
  }
}

async function writeRedisCache(
  redis: RedisClient,
  key: string,
  value: string,
  ttlSeconds: number,
) {
  try {
    await redis.set(key, value, { EX: ttlSeconds })
  } catch {
    // Redis is best-effort for GA cache reads and writes.
  }
}

function parsePositiveIntegerEnv(name: string, fallback: number): number {
  const raw = process.env[name]?.trim()
  if (!raw) return fallback

  const parsed = Number.parseInt(raw, 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

function normalizeGaDateRange(range: GaDateRange): GaDateRange {
  const minStart = new Date(GA_MIN_START_DATE)
  const parsedStart = new Date(range.startDate)
  const parsedEnd = new Date(range.endDate)

  const validStart = Number.isFinite(parsedStart.getTime())
  const validEnd = Number.isFinite(parsedEnd.getTime())

  let start = validStart ? parsedStart : minStart
  let end = validEnd ? parsedEnd : start

  if (start < minStart) start = minStart
  if (end < minStart) end = minStart
  if (end < start) end = start

  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  }
}

function parseCredentials(): Record<string, any> | null {
  const raw = process.env.GA_CREDENTIALS_JSON?.trim()
  if (!raw) return null

  const tryParse = (value: string) => {
    try {
      return JSON.parse(value)
    } catch {
      return null
    }
  }

  // 1) Direct parse (preferred when private_key uses \n escapes)
  const direct = tryParse(raw)
  if (direct) return direct

  // 2) Base64-encoded JSON
  const base64Decoded = (() => {
    try {
      return Buffer.from(raw, "base64").toString("utf8")
    } catch {
      return null
    }
  })()
  if (base64Decoded) {
    const parsed = tryParse(base64Decoded)
    if (parsed) return parsed
  }

  // 3) Normalize literal newlines in env (multiline private_key pasted without \n)
  const escapedNewlines = tryParse(raw.replace(/\n/g, "\\n"))
  if (escapedNewlines) return escapedNewlines

  try {
    const maskedSnippet = raw.slice(0, 32)
    console.warn("[analytics] failed to parse GA_CREDENTIALS_JSON", {
      maskedSnippet,
    })
  } catch {
    console.warn("[analytics] failed to parse GA_CREDENTIALS_JSON")
  }
  return null
}

function resolveProperty(): string | null {
  const raw = process.env.GA_PROPERTY_ID?.trim()
  if (!raw) return null
  return raw.startsWith("properties/") ? raw : `properties/${raw}`
}

export function hasGaAnalyticsConfig(): boolean {
  return Boolean(process.env.GA_CREDENTIALS_JSON?.trim() && resolveProperty())
}

async function runReportWithQuota(
  client: BetaAnalyticsDataClient,
  request: Parameters<BetaAnalyticsDataClient["runReport"]>[0],
): Promise<protos.google.analytics.data.v1beta.IRunReportResponse> {
  const hostnameExclusionFilter = buildGaHostnameExclusionFilter()
  const [response] = await client.runReport(
    {
      ...request,
      dimensionFilter: andGaDimensionFilters(
        request.dimensionFilter,
        hostnameExclusionFilter,
      ),
      returnPropertyQuota: true,
    },
    { timeout: GA_REPORT_TIMEOUT_MS },
  )
  return response
}

async function runRealtimeReportWithQuota(
  client: BetaAnalyticsDataClient,
  request: Parameters<BetaAnalyticsDataClient["runRealtimeReport"]>[0],
): Promise<protos.google.analytics.data.v1beta.IRunRealtimeReportResponse> {
  const [response] = await client.runRealtimeReport(
    {
      ...request,
      returnPropertyQuota: true,
    },
    { timeout: GA_REALTIME_REPORT_TIMEOUT_MS },
  )
  return response
}

async function getClient(): Promise<BetaAnalyticsDataClient> {
  if (!clientPromise) {
    const credentials = parseCredentials()
    if (!credentials) {
      throw new Error("GA_CREDENTIALS_JSON is missing or invalid")
    }
    clientPromise = Promise.resolve(
      new BetaAnalyticsDataClient({ credentials }),
    )
  }
  return clientPromise
}

function normalizePagePathsForCache(pagePaths: string[]) {
  const normalized = pagePaths
    .map((path) => {
      if (!path) return "/"
      const base = path.split(/[?#]/)[0] || "/"
      return base.length > 0 ? base : "/"
    })
    .filter((path) => path.length > 0)
  return Array.from(new Set(normalized)).sort()
}

function buildProductTrafficCacheKey(args: {
  pagePaths: string[]
  dateRange: GaDateRange
  includeAdvanced: boolean
}) {
  const pathKey = normalizePagePathsForCache(args.pagePaths).join("|")
  const property = resolveProperty()
  return buildCacheKey(
    PRODUCT_TRAFFIC_CACHE_PREFIX,
    property,
    args.includeAdvanced ? "advanced" : "basic",
    args.dateRange.startDate,
    args.dateRange.endDate,
    pathKey,
  )
}

async function fetchProductTrafficFromGa({
  pagePaths,
  dateRange: rawDateRange,
  includeAdvanced = true,
}: {
  pagePaths: string[]
  dateRange: GaDateRange
  includeAdvanced?: boolean
}): Promise<GaProductTrafficSummary> {
  const client = await getClient()
  const property = resolveProperty()
  if (!property) {
    throw new Error("GA_PROPERTY_ID is missing")
  }

  const dateRange = normalizeGaDateRange(rawDateRange)

  const dimensionFilter = buildPagePathFilter(pagePaths)
  const metrics = [
    { name: "screenPageViews" },
    { name: "activeUsers" },
    { name: "sessions" },
    { name: "bounceRate" },
    { name: "averageSessionDuration" },
    { name: "newUsers" },
    { name: "engagementRate" },
    { name: "screenPageViewsPerSession" },
    { name: "engagedSessions" },
  ]

  const runReport = (
    request: Parameters<typeof client.runReport>[0],
  ): Promise<protos.google.analytics.data.v1beta.IRunReportResponse> =>
    runReportWithQuota(client, request)

  const emptyReport: protos.google.analytics.data.v1beta.IRunReportResponse = {
    rows: [],
    totals: [],
  }

  let trendReport = emptyReport
  let referrerReport = emptyReport
  let referrerCategoryReport = emptyReport
  let browserReport = emptyReport
  let osReport = emptyReport
  let countryReport = emptyReport
  let cityReport = emptyReport
  let deviceReport = emptyReport

  if (includeAdvanced) {
    ;[
      trendReport,
      referrerReport,
      referrerCategoryReport,
      browserReport,
      osReport,
      countryReport,
      cityReport,
      deviceReport,
    ] = await Promise.all([
      runReport({
        property,
        dateRanges: [dateRange],
        metrics,
        dimensions: [{ name: "date" }],
        dimensionFilter,
        metricAggregations: [
          protos.google.analytics.data.v1beta.MetricAggregation.TOTAL,
        ],
        orderBys: [{ dimension: { dimensionName: "date" } }],
      }),
      runReport({
        property,
        dateRanges: [dateRange],
        metrics: [{ name: "screenPageViews" }],
        dimensions: [{ name: "pageReferrer" }],
        dimensionFilter,
        limit: 8,
        orderBys: [
          {
            metric: {
              metricName: "screenPageViews",
            },
            desc: true,
          },
        ],
      }),
      runReport({
        property,
        dateRanges: [dateRange],
        metrics: [{ name: "screenPageViews" }],
        dimensions: [{ name: "sessionDefaultChannelGrouping" }],
        dimensionFilter,
        limit: 8,
        orderBys: [
          {
            metric: {
              metricName: "screenPageViews",
            },
            desc: true,
          },
        ],
      }),
      runReport({
        property,
        dateRanges: [dateRange],
        metrics: [{ name: "activeUsers" }],
        dimensions: [{ name: "browser" }],
        dimensionFilter,
        limit: 8,
        orderBys: [
          {
            metric: { metricName: "activeUsers" },
            desc: true,
          },
        ],
      }),
      runReport({
        property,
        dateRanges: [dateRange],
        metrics: [{ name: "activeUsers" }],
        dimensions: [{ name: "operatingSystem" }],
        dimensionFilter,
        limit: 8,
        orderBys: [
          {
            metric: { metricName: "activeUsers" },
            desc: true,
          },
        ],
      }),
      runReport({
        property,
        dateRanges: [dateRange],
        metrics: [{ name: "activeUsers" }],
        dimensions: [{ name: "country" }, { name: "countryId" }],
        dimensionFilter,
        limit: 8,
        orderBys: [
          {
            metric: { metricName: "activeUsers" },
            desc: true,
          },
        ],
      }),
      runReport({
        property,
        dateRanges: [dateRange],
        metrics: [{ name: "activeUsers" }],
        dimensions: [
          { name: "city" },
          { name: "region" },
          { name: "country" },
          { name: "countryId" },
        ],
        dimensionFilter,
        limit: 8,
        orderBys: [
          {
            metric: { metricName: "activeUsers" },
            desc: true,
          },
        ],
      }),
      runReport({
        property,
        dateRanges: [dateRange],
        metrics: [{ name: "activeUsers" }],
        dimensions: [{ name: "deviceCategory" }],
        dimensionFilter,
        limit: 8,
        orderBys: [
          {
            metric: { metricName: "activeUsers" },
            desc: true,
          },
        ],
      }),
    ])
  } else {
    trendReport = await runReport({
      property,
      dateRanges: [dateRange],
      metrics,
      dimensions: [{ name: "date" }],
      dimensionFilter,
      metricAggregations: [
        protos.google.analytics.data.v1beta.MetricAggregation.TOTAL,
      ],
      orderBys: [{ dimension: { dimensionName: "date" } }],
    })
  }

  const trendResponse = trendReport
  const referrerResponseParsed = referrerReport
  const referrerCategoryResponseParsed = referrerCategoryReport
  const browserResponseParsed = browserReport
  const osResponseParsed = osReport
  const cityResponseParsed = cityReport
  const countryResponseParsed = countryReport
  const deviceResponseParsed = deviceReport

  const totals = trendResponse.totals?.[0]?.metricValues ?? undefined
  const rows = trendResponse.rows ?? []
  const referrerRows = includeAdvanced
    ? (referrerResponseParsed.rows ?? [])
    : []
  const referrerCategoryRows = includeAdvanced
    ? (referrerCategoryResponseParsed.rows ?? [])
    : []
  const browserRows = includeAdvanced ? (browserResponseParsed.rows ?? []) : []
  const osRows = includeAdvanced ? (osResponseParsed.rows ?? []) : []
  const cityRows = includeAdvanced ? (cityResponseParsed.rows ?? []) : []
  const countryRows = includeAdvanced ? (countryResponseParsed.rows ?? []) : []
  const deviceRows = includeAdvanced ? (deviceResponseParsed.rows ?? []) : []

  const pageViews = resolveMetricValue(totals, 0, rows, "sum")
  const uniqueVisitors = resolveMetricValue(totals, 1, rows, "sum")
  const sessions = resolveMetricValue(totals, 2, rows, "sum")
  const rawBounceRate = resolveMetricValue(totals, 3, rows, "avg")
  const bounceRate =
    rawBounceRate > 0 && rawBounceRate <= 1
      ? rawBounceRate * 100
      : rawBounceRate
  const averageSessionDuration = resolveMetricValue(totals, 4, rows, "avg")
  const newUsers = resolveMetricValue(totals, 5, rows, "sum")
  const returningVisitors = Math.max(uniqueVisitors - newUsers, 0)

  const timeseries =
    (rows ?? [])
      .map((row) => {
        const dateIso = parseDateString(row.dimensionValues?.[0]?.value)
        if (!dateIso) return null
        const date = new Date(dateIso)
        return {
          date: dateIso,
          label: format(date, "MMM d"),
          pageViews: parseMetricValue(row.metricValues?.[0]?.value),
          uniqueVisitors: parseMetricValue(row.metricValues?.[1]?.value),
        }
      })
      .filter(
        (
          entry,
        ): entry is {
          date: string
          label: string
          pageViews: number
          uniqueVisitors: number
        } => Boolean(entry),
      ) ?? []

  const referrersRaw =
    (referrerRows ?? []).map((row) => {
      const rawLabel = row.dimensionValues?.[0]?.value?.trim()
      const referrer = resolveReferrerDomain(rawLabel)
      const views = parseMetricValue(row.metricValues?.[0]?.value)
      return { referrer, views }
    }) ?? []

  const referrerTotals = referrersRaw.reduce((acc, entry) => {
    const key = entry.referrer || "Direct / none"
    const current = acc.get(key) ?? 0
    acc.set(key, current + entry.views)
    return acc
  }, new Map<string, number>())

  const referrers = Array.from(referrerTotals.entries())
    .map(([referrer, views]) => ({
      referrer,
      views,
      share: pageViews > 0 ? (views / pageViews) * 100 : 0,
    }))
    .sort((a, b) => b.views - a.views)

  const referrerCategories =
    (referrerCategoryRows ?? []).map((row) => {
      const rawLabel = row.dimensionValues?.[0]?.value?.trim()
      const category = rawLabel && rawLabel.length > 0 ? rawLabel : "Other"
      const views = parseMetricValue(row.metricValues?.[0]?.value)
      const share = pageViews > 0 ? (views / pageViews) * 100 : 0
      return { category, views, share }
    }) ?? []

  const browsers =
    (browserRows ?? []).map((row) => {
      const browserLabel = row.dimensionValues?.[0]?.value?.trim() || "Unknown"
      const visitors = parseMetricValue(row.metricValues?.[0]?.value)
      return { browser: browserLabel, visitors }
    }) ?? []

  const operatingSystems =
    (osRows ?? []).map((row) => {
      const osLabel = row.dimensionValues?.[0]?.value?.trim() || "Unknown"
      const visitors = parseMetricValue(row.metricValues?.[0]?.value)
      return { os: osLabel, visitors }
    }) ?? []

  const devices =
    (deviceRows ?? []).map((row) => {
      const deviceLabel =
        row.dimensionValues?.[0]?.value?.trim().toLowerCase() || "unknown"
      const visitors = parseMetricValue(row.metricValues?.[0]?.value)
      return { deviceCategory: deviceLabel, visitors }
    }) ?? []

  const countries =
    (countryRows ?? []).map((row) => {
      const countryLabel = row.dimensionValues?.[0]?.value?.trim() || "Unknown"
      const countryCode = row.dimensionValues?.[1]?.value?.trim() || null
      const visitors = parseMetricValue(row.metricValues?.[0]?.value)
      const share = uniqueVisitors > 0 ? (visitors / uniqueVisitors) * 100 : 0
      return { country: countryLabel, code: countryCode, visitors, share }
    }) ?? []

  const cities =
    (cityRows ?? []).map((row) => {
      const cityLabel = row.dimensionValues?.[0]?.value?.trim() || "Unknown"
      const regionLabel = row.dimensionValues?.[1]?.value?.trim() || null
      const countryLabel = row.dimensionValues?.[2]?.value?.trim() || null
      const countryCode = row.dimensionValues?.[3]?.value?.trim() || null
      const visitors = parseMetricValue(row.metricValues?.[0]?.value)
      return {
        city: cityLabel,
        region: regionLabel,
        country: countryLabel,
        code: countryCode,
        visitors,
      }
    }) ?? []

  return {
    pageViews,
    uniqueVisitors,
    sessions,
    bounceRate,
    averageSessionDuration,
    referrers,
    newUsers,
    returningVisitors,
    referrerCategories,
    browsers,
    operatingSystems,
    cities,
    countries,
    devices,
    timeseries,
  }
}

export async function getProductTrafficFromGa(args: {
  pagePaths: string[]
  dateRange: GaDateRange
  includeAdvanced?: boolean
}): Promise<GaProductTrafficSummary> {
  if (!hasGaAnalyticsConfig()) {
    return emptyProductTrafficSummary()
  }

  const includeAdvanced = args.includeAdvanced ?? true
  const dateRange = normalizeGaDateRange(args.dateRange)
  const cacheKey = buildProductTrafficCacheKey({
    pagePaths: args.pagePaths,
    dateRange,
    includeAdvanced,
  })

  const cached = await cacheHit<GaProductTrafficSummary>({
    key: cacheKey,
    onError: (error) => {
      console.error("[analytics] failed to read GA product traffic cache", {
        cacheKey,
        error,
      })
    },
  })

  if (cached) {
    return cached
  }

  try {
    const fresh = await fetchProductTrafficFromGa({
      pagePaths: args.pagePaths,
      dateRange,
      includeAdvanced,
    })
    await cacheMiss({
      key: cacheKey,
      value: fresh,
      ttlSeconds: PRODUCT_TRAFFIC_CACHE_TTL_SECONDS,
      onError: (error) => {
        console.error("[analytics] failed to cache GA product traffic", {
          cacheKey,
          error,
        })
      },
    })
    return fresh
  } catch (error) {
    if (!isGaConfigError(error) && !isTransientGaError(error)) {
      console.error("[analytics] failed to fetch GA product traffic", {
        pagePaths: args.pagePaths,
        dateRange,
        includeAdvanced,
        error,
      })
    }
    return emptyProductTrafficSummary()
  }
}

export async function getProductTrafficMapFromGa(args: {
  products: Array<{ id: string; slug: string }>
  dateRange: GaDateRange
}): Promise<
  Map<string, { pageViews: number; uniqueVisitors: number; sessions: number }>
> {
  const results = new Map<
    string,
    { pageViews: number; uniqueVisitors: number; sessions: number }
  >()
  if (!args.products.length || !hasGaAnalyticsConfig()) return results

  const client = await getClient()
  const property = resolveProperty()
  if (!property) {
    console.error(
      "[analytics] GA_PROPERTY_ID is missing; product traffic map unavailable",
    )
    return results
  }

  const dateRange = normalizeGaDateRange(args.dateRange)

  const pathToProductId = new Map<string, string>()
  for (const product of args.products) {
    const base = productPath(product.slug)
    pathToProductId.set(base, product.id)
    pathToProductId.set(`${base}/`, product.id)
  }

  const allPaths = Array.from(pathToProductId.keys())
  const CHUNK_SIZE = 150

  const metrics = [
    { name: "screenPageViews" },
    { name: "activeUsers" },
    { name: "sessions" },
  ]

  const parseValue = (value: string | null | undefined) =>
    Number(value ?? 0) || 0

  for (let i = 0; i < allPaths.length; i += CHUNK_SIZE) {
    const chunk = allPaths.slice(i, i + CHUNK_SIZE)
    if (!chunk.length) continue

    try {
      const response = await runReportWithQuota(client, {
        property,
        dateRanges: [dateRange],
        dimensions: [{ name: "pagePath" }],
        metrics,
        dimensionFilter: {
          filter: {
            fieldName: "pagePath",
            inListFilter: {
              values: chunk,
            },
          },
        },
      })

      const rows = response.rows ?? []
      for (const row of rows) {
        const path = row.dimensionValues?.[0]?.value ?? ""
        const productId = pathToProductId.get(path)
        if (!productId) continue

        const pageViews = parseValue(row.metricValues?.[0]?.value)
        const uniqueVisitors = parseValue(row.metricValues?.[1]?.value)
        const sessions = parseValue(row.metricValues?.[2]?.value)

        const current = results.get(productId) ?? {
          pageViews: 0,
          uniqueVisitors: 0,
          sessions: 0,
        }
        results.set(productId, {
          pageViews: current.pageViews + pageViews,
          uniqueVisitors: current.uniqueVisitors + uniqueVisitors,
          sessions: current.sessions + sessions,
        })
      }
    } catch (error) {
      console.error("[analytics] failed to fetch GA traffic map for products", {
        chunkSize: chunk.length,
        error,
      })
    }
  }

  return results
}

function defaultSiteDateRange(): GaDateRange {
  const end = subDays(new Date(), 1)
  const start = subDays(end, 29)
  return {
    startDate: format(start, "yyyy-MM-dd"),
    endDate: format(end, "yyyy-MM-dd"),
  }
}

const EMPTY_SITE_SNAPSHOT: SiteAnalyticsSnapshot = {
  pageViews: 0,
  uniqueVisitors: 0,
  sessions: 0,
  bounceRate: 0,
  averageSessionDuration: 0,
  newUsers: 0,
  engagementRate: 0,
  pagesPerSession: 0,
  referrers: [],
  timeseries: [],
  browsers: [],
  operatingSystems: [],
  devices: [],
  countries: [],
  regions: [],
  cities: [],
  topProductPages: [],
}

async function fetchSiteAnalyticsSnapshot({
  dateRange: rawDateRange,
  topProductLimit,
}: {
  dateRange: GaDateRange
  topProductLimit: number
}): Promise<SiteAnalyticsSnapshot> {
  const client = await getClient()
  const property = resolveProperty()
  if (!property) {
    throw new Error("GA_PROPERTY_ID is missing")
  }

  const dateRange = normalizeGaDateRange(rawDateRange)

  const metrics = [
    { name: "screenPageViews" },
    { name: "activeUsers" },
    { name: "sessions" },
    { name: "bounceRate" },
    { name: "averageSessionDuration" },
    { name: "newUsers" },
    { name: "engagementRate" },
    { name: "screenPageViewsPerSession" },
    { name: "engagedSessions" },
  ]

  const [
    trendResponse,
    referrerResponse,
    productPagesResponse,
    countryResponse,
    regionResponse,
    cityResponse,
    browserResponse,
    osResponse,
    deviceResponse,
  ] = await Promise.all([
    runReportWithQuota(client, {
      property,
      dateRanges: [dateRange],
      metrics,
      dimensions: [{ name: "date" }],
      metricAggregations: [
        protos.google.analytics.data.v1beta.MetricAggregation.TOTAL,
      ],
      orderBys: [{ dimension: { dimensionName: "date" } }],
    }),
    runReportWithQuota(client, {
      property,
      dateRanges: [dateRange],
      metrics: [{ name: "screenPageViews" }],
      dimensions: [{ name: "sessionSource" }],
      orderBys: [
        {
          metric: { metricName: "screenPageViews" },
          desc: true,
        },
      ],
      limit: 12,
    }),
    runReportWithQuota(client, {
      property,
      dateRanges: [dateRange],
      metrics,
      dimensions: [{ name: "pagePath" }],
      dimensionFilter: {
        andGroup: {
          expressions: [
            {
              filter: {
                fieldName: "pagePath",
                stringFilter: {
                  matchType:
                    protos.google.analytics.data.v1beta.Filter.StringFilter
                      .MatchType.BEGINS_WITH,
                  value: "/products/",
                },
              },
            },
          ],
        },
      },
      orderBys: [
        {
          metric: { metricName: "screenPageViews" },
          desc: true,
        },
      ],
      limit: Math.max(10, topProductLimit * 4),
    }),
    runReportWithQuota(client, {
      property,
      dateRanges: [dateRange],
      metrics: [{ name: "activeUsers" }],
      dimensions: [{ name: "country" }, { name: "countryId" }],
      orderBys: [
        {
          metric: { metricName: "activeUsers" },
          desc: true,
        },
      ],
      limit: 10,
    }),
    runReportWithQuota(client, {
      property,
      dateRanges: [dateRange],
      metrics: [{ name: "activeUsers" }],
      dimensions: [
        { name: "region" },
        { name: "country" },
        { name: "countryId" },
      ],
      orderBys: [
        {
          metric: { metricName: "activeUsers" },
          desc: true,
        },
      ],
      limit: 10,
    }),
    runReportWithQuota(client, {
      property,
      dateRanges: [dateRange],
      metrics: [{ name: "activeUsers" }],
      dimensions: [
        { name: "city" },
        { name: "region" },
        { name: "country" },
        { name: "countryId" },
      ],
      orderBys: [
        {
          metric: { metricName: "activeUsers" },
          desc: true,
        },
      ],
      limit: 10,
    }),
    runReportWithQuota(client, {
      property,
      dateRanges: [dateRange],
      metrics: [{ name: "activeUsers" }],
      dimensions: [{ name: "browser" }],
      orderBys: [
        {
          metric: { metricName: "activeUsers" },
          desc: true,
        },
      ],
      limit: 8,
    }),
    runReportWithQuota(client, {
      property,
      dateRanges: [dateRange],
      metrics: [{ name: "activeUsers" }],
      dimensions: [{ name: "operatingSystem" }],
      orderBys: [
        {
          metric: { metricName: "activeUsers" },
          desc: true,
        },
      ],
      limit: 8,
    }),
    runReportWithQuota(client, {
      property,
      dateRanges: [dateRange],
      metrics: [{ name: "activeUsers" }],
      dimensions: [{ name: "deviceCategory" }],
      orderBys: [
        {
          metric: { metricName: "activeUsers" },
          desc: true,
        },
      ],
      limit: 5,
    }),
  ])
  const totals = trendResponse.totals?.[0]?.metricValues ?? undefined
  const rows = trendResponse.rows ?? []
  const referrerRows = referrerResponse.rows ?? []
  const productRows = productPagesResponse.rows ?? []
  const countryRows = countryResponse.rows ?? []
  const regionRows = regionResponse.rows ?? []
  const cityRows = cityResponse.rows ?? []
  const browserRows = browserResponse.rows ?? []
  const osRows = osResponse.rows ?? []
  const deviceRows = deviceResponse.rows ?? []

  const pageViews = resolveMetricValue(totals, 0, rows, "sum")
  const uniqueVisitors = resolveMetricValue(totals, 1, rows, "sum")
  const sessions = resolveMetricValue(totals, 2, rows, "sum")
  const bounceRate = normalizeBounceRate(
    resolveMetricValue(totals, 3, rows, "avg"),
  )
  const averageSessionDuration = resolveMetricValue(totals, 4, rows, "avg")
  const newUsersRaw = resolveMetricValue(totals, 5, rows, "sum")
  const rawEngagementRate = resolveMetricValue(totals, 6, rows, "avg")
  const pagesPerSessionMetric = resolveMetricValue(totals, 7, rows, "avg")
  const engagedSessions = resolveMetricValue(totals, 8, rows, "sum")

  const engagementRateFromMetric =
    rawEngagementRate <= 1 ? rawEngagementRate * 100 : rawEngagementRate
  const engagementRateFallback =
    sessions > 0 ? (engagedSessions / sessions) * 100 : 0
  const engagementRate =
    engagementRateFromMetric > 0
      ? engagementRateFromMetric
      : engagementRateFallback

  const newUsers =
    newUsersRaw > 0 ? newUsersRaw : Math.min(uniqueVisitors, sessions)

  const pagesPerSession =
    pagesPerSessionMetric > 0
      ? pagesPerSessionMetric
      : sessions > 0
        ? pageViews / sessions
        : 0

  const timeseries =
    (rows ?? [])
      .map((row) => {
        const dateIso = parseDateString(row.dimensionValues?.[0]?.value)
        if (!dateIso) return null
        const date = new Date(dateIso)
        return {
          date: dateIso,
          label: format(date, "MMM d"),
          pageViews: parseMetricValue(row.metricValues?.[0]?.value),
          uniqueVisitors: parseMetricValue(row.metricValues?.[1]?.value),
        }
      })
      .filter(
        (
          entry,
        ): entry is {
          date: string
          label: string
          pageViews: number
          uniqueVisitors: number
        } => Boolean(entry),
      ) ?? []

  const referrers =
    (referrerRows ?? []).map((row) => {
      const rawLabel = row.dimensionValues?.[0]?.value?.trim()
      const referrer =
        rawLabel && rawLabel.length > 0 ? rawLabel : "Direct / none"
      const views = parseMetricValue(row.metricValues?.[0]?.value)
      const share = pageViews > 0 ? (views / pageViews) * 100 : 0
      return { referrer, views, share }
    }) ?? []

  type AggregatedProduct = {
    path: string
    slug: string | null
    pageViews: number
    uniqueVisitors: number
    sessions: number
    bounceWeighted: number
    durationTotal: number
  }

  const aggregatedProducts = new Map<string, AggregatedProduct>()

  for (const row of productRows) {
    const path = normalizePath(row.dimensionValues?.[0]?.value?.trim())
    const slug = extractProductSlug(path)
    const views = parseMetricValue(row.metricValues?.[0]?.value)
    const visitors = parseMetricValue(row.metricValues?.[1]?.value)
    const rowSessions = parseMetricValue(row.metricValues?.[2]?.value)
    const rowBounce = normalizeBounceRate(
      parseMetricValue(row.metricValues?.[3]?.value),
    )
    const avgSessionDuration = parseMetricValue(row.metricValues?.[4]?.value)
    const key = slug ?? path

    const current = aggregatedProducts.get(key) ?? {
      path,
      slug,
      pageViews: 0,
      uniqueVisitors: 0,
      sessions: 0,
      bounceWeighted: 0,
      durationTotal: 0,
    }

    current.pageViews += views
    current.uniqueVisitors += visitors
    current.sessions += rowSessions
    current.bounceWeighted +=
      rowSessions > 0 ? (rowBounce / 100) * rowSessions : 0
    current.durationTotal += avgSessionDuration * rowSessions

    if (!current.path) current.path = path
    if (!current.slug) current.slug = slug

    aggregatedProducts.set(key, current)
  }

  const topProductPages = Array.from(aggregatedProducts.values())
    .filter((entry) => entry.slug)
    .map((entry) => {
      const bounceRateValue =
        entry.sessions > 0 ? (entry.bounceWeighted / entry.sessions) * 100 : 0
      const avgSessionDuration =
        entry.sessions > 0 ? entry.durationTotal / entry.sessions : 0
      return {
        path: entry.path,
        slug: entry.slug,
        pageViews: entry.pageViews,
        uniqueVisitors: entry.uniqueVisitors,
        sessions: entry.sessions,
        bounceRate: bounceRateValue,
        averageSessionDuration: avgSessionDuration,
        shareOfViews: pageViews > 0 ? (entry.pageViews / pageViews) * 100 : 0,
      }
    })
    .sort((a, b) => b.pageViews - a.pageViews)
    .slice(0, topProductLimit)

  const browsers =
    (browserRows ?? []).map((row) => {
      const browser = row.dimensionValues?.[0]?.value?.trim() || "Unknown"
      const visitors = parseMetricValue(row.metricValues?.[0]?.value)
      const share = uniqueVisitors > 0 ? (visitors / uniqueVisitors) * 100 : 0
      return { browser, visitors, share }
    }) ?? []

  const operatingSystems =
    (osRows ?? []).map((row) => {
      const os = row.dimensionValues?.[0]?.value?.trim() || "Unknown"
      const visitors = parseMetricValue(row.metricValues?.[0]?.value)
      const share = uniqueVisitors > 0 ? (visitors / uniqueVisitors) * 100 : 0
      return { os, visitors, share }
    }) ?? []

  const devices =
    (deviceRows ?? []).map((row) => {
      const deviceCategory =
        row.dimensionValues?.[0]?.value?.trim().toLowerCase() || "unknown"
      const visitors = parseMetricValue(row.metricValues?.[0]?.value)
      const share = uniqueVisitors > 0 ? (visitors / uniqueVisitors) * 100 : 0
      return { deviceCategory, visitors, share }
    }) ?? []

  const countries =
    (countryRows ?? []).map((row) => {
      const countryLabel = row.dimensionValues?.[0]?.value?.trim() || "Unknown"
      const code = row.dimensionValues?.[1]?.value?.trim() || null
      const visitors = parseMetricValue(row.metricValues?.[0]?.value)
      const share = uniqueVisitors > 0 ? (visitors / uniqueVisitors) * 100 : 0
      return { country: countryLabel, code, visitors, share }
    }) ?? []

  const regions =
    (regionRows ?? []).map((row) => {
      const regionLabel = row.dimensionValues?.[0]?.value?.trim() || "Unknown"
      const countryLabel = row.dimensionValues?.[1]?.value?.trim() || null
      const code = row.dimensionValues?.[2]?.value?.trim() || null
      const visitors = parseMetricValue(row.metricValues?.[0]?.value)
      const share = uniqueVisitors > 0 ? (visitors / uniqueVisitors) * 100 : 0
      return {
        region: regionLabel,
        country: countryLabel,
        code,
        visitors,
        share,
      }
    }) ?? []

  const cities =
    (cityRows ?? []).map((row) => {
      const cityLabel = row.dimensionValues?.[0]?.value?.trim() || "Unknown"
      const regionLabel = row.dimensionValues?.[1]?.value?.trim() || null
      const countryLabel = row.dimensionValues?.[2]?.value?.trim() || null
      const code = row.dimensionValues?.[3]?.value?.trim() || null
      const visitors = parseMetricValue(row.metricValues?.[0]?.value)
      const share = uniqueVisitors > 0 ? (visitors / uniqueVisitors) * 100 : 0
      return {
        city: cityLabel,
        region: regionLabel,
        country: countryLabel,
        code,
        visitors,
        share,
      }
    }) ?? []

  return {
    pageViews,
    uniqueVisitors,
    sessions,
    bounceRate,
    averageSessionDuration,
    newUsers,
    engagementRate,
    pagesPerSession,
    referrers,
    timeseries,
    browsers,
    operatingSystems,
    devices,
    countries,
    regions,
    cities,
    topProductPages,
  }
}

export async function getSiteAnalyticsSnapshot(args?: {
  dateRange?: GaDateRange
  topProductLimit?: number
}): Promise<SiteAnalyticsSnapshot> {
  const requestedDateRange = args?.dateRange ?? defaultSiteDateRange()
  const dateRange = normalizeGaDateRange(requestedDateRange)
  const topProductLimit = Math.max(1, args?.topProductLimit ?? 6)
  const cacheKey = jitterCacheKey(
    buildCacheKey(
      SITE_SNAPSHOT_CACHE_PREFIX,
      dateRange.startDate,
      dateRange.endDate,
      `top${topProductLimit}`,
    ),
  )

  const redis = await getRedisClient().catch(() => null)
  let cachedPayload: SiteAnalyticsSnapshot | null = null

  if (redis) {
    const cached = await readRedisCache(redis, cacheKey)
    if (cached) {
      try {
        cachedPayload = JSON.parse(cached) as SiteAnalyticsSnapshot
      } catch (error) {
        console.error("[analytics] failed to parse cached site snapshot", {
          error,
        })
      }
    }
  }

  try {
    const fresh = await fetchSiteAnalyticsSnapshot({
      dateRange,
      topProductLimit,
    })
    if (redis) {
      await writeRedisCache(
        redis,
        cacheKey,
        JSON.stringify(fresh),
        SITE_SNAPSHOT_CACHE_TTL_SECONDS,
      )
    }
    return fresh
  } catch (error) {
    console.error("[analytics] failed to fetch GA site snapshot", {
      dateRange,
      error,
    })
    if (cachedPayload) {
      return cachedPayload
    }
    return EMPTY_SITE_SNAPSHOT
  }
}

export async function runGaReport(
  request: Omit<
    Parameters<BetaAnalyticsDataClient["runReport"]>[0],
    "property"
  > & { property?: string },
): Promise<protos.google.analytics.data.v1beta.IRunReportResponse> {
  const client = await getClient()
  const property = request.property ?? resolveProperty()
  if (!property) {
    throw new Error("GA_PROPERTY_ID is missing")
  }

  return runReportWithQuota(client, {
    ...request,
    property,
  })
}

async function fetchHomepageTrafficFromGa(): Promise<HomepageTraffic> {
  const client = await getClient()
  const property = resolveProperty()
  if (!property) {
    throw new Error("GA_PROPERTY_ID is missing")
  }

  const end = subDays(new Date(), 1)
  const start = subDays(end, 29)

  const response = await runReportWithQuota(client, {
    property,
    dateRanges: [
      {
        startDate: format(start, "yyyy-MM-dd"),
        endDate: format(end, "yyyy-MM-dd"),
      },
    ],
    dimensions: [{ name: "date" }],
    metrics: [{ name: "screenPageViews" }, { name: "activeUsers" }],
    orderBys: [{ dimension: { dimensionName: "date" } }],
    metricAggregations: [
      protos.google.analytics.data.v1beta.MetricAggregation.TOTAL,
    ],
  })

  const totals = response.totals?.[0]?.metricValues ?? []
  const summedFromRows = (index: number) =>
    (response.rows ?? []).reduce((sum, row) => {
      const raw = row.metricValues?.[index]?.value
      const value = Number(raw ?? 0)
      return sum + (Number.isFinite(value) ? value : 0)
    }, 0)

  const pageViews30 = Number(totals?.[0]?.value ?? 0) || summedFromRows(0) || 0
  const visitors30 = Number(totals?.[1]?.value ?? 0) || summedFromRows(1) || 0

  const trafficSeries =
    response.rows?.map((row) => {
      const date = parseDateString(row.dimensionValues?.[0]?.value)
      const pageViews = Number(row.metricValues?.[0]?.value ?? 0)
      const visitors = Number(row.metricValues?.[1]?.value ?? 0)
      return date
        ? {
            date,
            pageViews,
            visitors,
          }
        : null
    }) ?? []

  return {
    pageViews30,
    visitors30,
    trafficSeries: trafficSeries.filter(
      (entry): entry is NonNullable<(typeof trafficSeries)[number]> =>
        Boolean(entry),
    ),
  }
}

export async function getHomepageTrafficFromGa(): Promise<HomepageTraffic> {
  if (!hasGaAnalyticsConfig()) {
    return emptyHomepageTraffic()
  }

  const redis = await getRedisClient().catch(() => null)
  let cachedPayload: HomepageTraffic | null = null
  const cacheKey = jitterCacheKey(CACHE_KEY)

  if (redis) {
    const cached = await readRedisCache(redis, cacheKey)
    if (cached) {
      try {
        cachedPayload = JSON.parse(cached) as HomepageTraffic
      } catch (error) {
        console.error(
          "[analytics] failed to parse cached GA homepage traffic",
          {
            error,
          },
        )
      }
    }
  }

  try {
    const fresh = await fetchHomepageTrafficFromGa()
    if (redis) {
      await writeRedisCache(
        redis,
        cacheKey,
        JSON.stringify(fresh),
        CACHE_TTL_SECONDS,
      )
    }
    return fresh
  } catch (error) {
    if (!isGaConfigError(error) && !isTransientGaError(error)) {
      console.error("[analytics] failed to fetch GA homepage traffic", error)
    }
    if (cachedPayload) {
      return cachedPayload
    }
    return emptyHomepageTraffic()
  }
}

export async function fetchRealtimeVisitorsFromGa(): Promise<number> {
  const client = await getClient()
  const property = resolveProperty()
  if (!property) {
    throw new Error("GA_PROPERTY_ID is missing")
  }

  const response = await runRealtimeReportWithQuota(client, {
    property,
    metrics: [{ name: "activeUsers" }],
  })

  const total = Number(response.totals?.[0]?.metricValues?.[0]?.value ?? 0)
  const summedRows =
    response.rows?.reduce((sum, row) => {
      const value = Number(row.metricValues?.[0]?.value ?? 0)
      return sum + (Number.isFinite(value) ? value : 0)
    }, 0) ?? 0

  return total || summedRows || 0
}

function normalizeRealtimeVisitors(value: number) {
  return value === 0 ? 1 : value
}

export async function getRealtimeVisitorsFromGa(): Promise<number> {
  const redis = await getRedisClient().catch(() => null)
  let cachedValue: number | null = null
  const cacheKey = jitterCacheKey(REALTIME_CACHE_KEY)

  if (redis) {
    const cached = await readRedisCache(redis, cacheKey)
    if (cached) {
      const parsed = Number(cached)
      if (Number.isFinite(parsed)) {
        cachedValue = parsed
      }
    }
  }

  try {
    const fresh = await fetchRealtimeVisitorsFromGa()
    if (redis) {
      await writeRedisCache(
        redis,
        cacheKey,
        String(fresh),
        REALTIME_CACHE_TTL_SECONDS,
      )
    }
    return normalizeRealtimeVisitors(fresh)
  } catch (error) {
    if (!isTransientGaError(error)) {
      console.error("[analytics] failed to fetch GA realtime visitors", error)
    }
    const fallback = cachedValue ?? 0
    return normalizeRealtimeVisitors(fallback)
  }
}

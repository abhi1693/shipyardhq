import { BetaAnalyticsDataClient, protos } from "@google-analytics/data"
import { format, subDays } from "date-fns"

import { buildCacheKey } from "@/lib/server/cache"
import { getRedisClient } from "@/lib/server/redis"
import { productPath } from "@/lib/routes"

type HomepageTraffic = {
  pageViews30: number
  visitors30: number
  trafficSeries: Array<{ date: string; pageViews: number; visitors: number }>
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

const CACHE_KEY = buildCacheKey("analytics:homepage:traffic:v1")
const CACHE_TTL_SECONDS = 900
const REALTIME_CACHE_KEY = buildCacheKey("analytics:homepage:realtime:v1")
const REALTIME_CACHE_TTL_SECONDS = 120
const SITE_SNAPSHOT_CACHE_PREFIX = "analytics:site:snapshot:v2"
const SITE_SNAPSHOT_CACHE_TTL_SECONDS = 900
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

let clientPromise: Promise<BetaAnalyticsDataClient> | null = null

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

function jitterCacheKey(baseKey: string) {
  return `${baseKey}:j${CACHE_KEY_JITTER_BUCKET}`
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
    console.error("[analytics] failed to parse GA_CREDENTIALS_JSON", {
      maskedSnippet,
    })
  } catch {
    console.error("[analytics] failed to parse GA_CREDENTIALS_JSON")
  }
  return null
}

function resolveProperty(): string | null {
  const raw = process.env.GA_PROPERTY_ID?.trim()
  if (!raw) return null
  return raw.startsWith("properties/") ? raw : `properties/${raw}`
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

function parseDateString(value: string | null | undefined): string | null {
  if (!value || value.length !== 8) return null
  const year = Number(value.slice(0, 4))
  const month = Number(value.slice(4, 6))
  const day = Number(value.slice(6, 8))
  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
    return null
  }
  return new Date(Date.UTC(year, month - 1, day)).toISOString()
}

function normalizeBounceRate(raw: number) {
  if (!Number.isFinite(raw)) return 0
  return raw > 0 && raw <= 1 ? raw * 100 : raw
}

function normalizePath(value: string | undefined | null) {
  if (!value) return "/"
  const base = value.split(/[?#]/)[0] || "/"
  if (base !== "/" && base.endsWith("/")) {
    return base.slice(0, -1)
  }
  return base
}

function resolveReferrerDomain(value?: string | null) {
  const raw = value?.trim()
  if (!raw || raw === "(direct)") return "direct"

  const cleaned = raw
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .trim()
    .toLowerCase()

  const domain = cleaned.split(/[/#?]/)[0]
  if (domain) return domain

  return "direct"
}

function extractProductSlug(path: string | null | undefined) {
  if (!path) return null
  const normalized = normalizePath(path)
  const match = normalized.match(/^\/products\/([^/]+)/)
  return match ? match[1].toLowerCase() : null
}

function buildPagePathFilter(
  pagePaths: string[],
): protos.google.analytics.data.v1beta.IFilterExpression {
  if (pagePaths.length === 0) {
    throw new Error("No page paths provided for GA product traffic")
  }

  if (pagePaths.length === 1) {
    return {
      filter: {
        fieldName: "pagePath",
        stringFilter: {
          matchType:
            protos.google.analytics.data.v1beta.Filter.StringFilter.MatchType
              .EXACT,
          value: pagePaths[0],
        },
      },
    }
  }

  return {
    orGroup: {
      expressions: pagePaths.map((path) => ({
        filter: {
          fieldName: "pagePath",
          stringFilter: {
            matchType:
              protos.google.analytics.data.v1beta.Filter.StringFilter.MatchType
                .EXACT,
            value: path,
          },
        },
      })),
    },
  }
}

function parseMetricValue(value?: string | null) {
  const numeric = Number(value ?? 0)
  return Number.isFinite(numeric) ? numeric : 0
}

function resolveMetricValue(
  totals: protos.google.analytics.data.v1beta.IMetricValue[] | undefined,
  index: number,
  rows:
    | protos.google.analytics.data.v1beta.IRow[]
    | null
    | undefined = undefined,
  mode: "sum" | "avg" = "sum",
) {
  const totalEntry = totals?.[index]
  const totalValue =
    totalEntry && "value" in totalEntry
      ? parseMetricValue(totalEntry.value)
      : null

  if (totalValue !== null) {
    return totalValue
  }

  if (!rows?.length) return 0

  if (mode === "avg") {
    const values = rows.map((row) =>
      parseMetricValue(row.metricValues?.[index]?.value),
    )
    const sum = values.reduce((acc, val) => acc + val, 0)
    return values.length ? sum / values.length : 0
  }

  return rows.reduce(
    (acc, row) => acc + parseMetricValue(row.metricValues?.[index]?.value),
    0,
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

  const runReport = async (
    request: Parameters<typeof client.runReport>[0],
  ): Promise<protos.google.analytics.data.v1beta.IRunReportResponse> => {
    const [response] = await client.runReport(request)
    return response
  }

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
  try {
    return await fetchProductTrafficFromGa(args)
  } catch (error) {
    console.error("[analytics] failed to fetch GA product traffic", {
      pagePaths: args.pagePaths,
      dateRange: args.dateRange,
      error,
    })
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
  if (!args.products.length) return results

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
      const response = await client.runReport({
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

      const rows = response?.[0]?.rows ?? []
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
  const end = subDays(new Date(), 0)
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
    client
      .runReport({
        property,
        dateRanges: [dateRange],
        metrics,
        dimensions: [{ name: "date" }],
        metricAggregations: [
          protos.google.analytics.data.v1beta.MetricAggregation.TOTAL,
        ],
        orderBys: [{ dimension: { dimensionName: "date" } }],
      })
      .then((res) => res[0]),
    client
      .runReport({
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
      })
      .then((res) => res[0]),
    client
      .runReport({
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
              {
                notExpression: {
                  filter: {
                    fieldName: "pagePath",
                    stringFilter: {
                      matchType:
                        protos.google.analytics.data.v1beta.Filter.StringFilter
                          .MatchType.BEGINS_WITH,
                      value: "/admin",
                    },
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
      })
      .then((res) => res[0]),
    client
      .runReport({
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
      })
      .then((res) => res[0]),
    client
      .runReport({
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
      })
      .then((res) => res[0]),
    client
      .runReport({
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
      })
      .then((res) => res[0]),
    client
      .runReport({
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
      })
      .then((res) => res[0]),
    client
      .runReport({
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
      })
      .then((res) => res[0]),
    client
      .runReport({
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
      })
      .then((res) => res[0]),
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
    const cached = await redis.get(cacheKey)
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
      await redis.set(cacheKey, JSON.stringify(fresh), {
        EX: SITE_SNAPSHOT_CACHE_TTL_SECONDS,
      })
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

async function fetchHomepageTrafficFromGa(): Promise<HomepageTraffic> {
  const client = await getClient()
  const property = resolveProperty()
  if (!property) {
    throw new Error("GA_PROPERTY_ID is missing")
  }

  const reportResponse = await client.runReport({
    property,
    dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
    dimensions: [{ name: "date" }],
    metrics: [{ name: "screenPageViews" }, { name: "activeUsers" }],
    orderBys: [{ dimension: { dimensionName: "date" } }],
    metricAggregations: [
      protos.google.analytics.data.v1beta.MetricAggregation.TOTAL,
    ],
  })
  const response =
    Array.isArray(reportResponse) && reportResponse.length > 0
      ? reportResponse[0]
      : (reportResponse as protos.google.analytics.data.v1beta.IRunReportResponse)

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
  const redis = await getRedisClient().catch(() => null)
  let cachedPayload: HomepageTraffic | null = null
  const cacheKey = jitterCacheKey(CACHE_KEY)

  if (redis) {
    const cached = await redis.get(cacheKey)
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
      await redis.set(cacheKey, JSON.stringify(fresh), {
        EX: CACHE_TTL_SECONDS,
      })
    }
    return fresh
  } catch (error) {
    console.error("[analytics] failed to fetch GA homepage traffic", error)
    if (cachedPayload) {
      return cachedPayload
    }
    return { pageViews30: 0, visitors30: 0, trafficSeries: [] }
  }
}

async function fetchRealtimeVisitorsFromGa(): Promise<number> {
  const client = await getClient()
  const property = resolveProperty()
  if (!property) {
    throw new Error("GA_PROPERTY_ID is missing")
  }

  const rtResponse = await client.runRealtimeReport({
    property,
    metrics: [{ name: "activeUsers" }],
  })
  const response =
    Array.isArray(rtResponse) && rtResponse.length > 0
      ? rtResponse[0]
      : (rtResponse as protos.google.analytics.data.v1beta.IRunRealtimeReportResponse)

  const total = Number(response.totals?.[0]?.metricValues?.[0]?.value ?? 0)
  const summedRows =
    response.rows?.reduce((sum, row) => {
      const value = Number(row.metricValues?.[0]?.value ?? 0)
      return sum + (Number.isFinite(value) ? value : 0)
    }, 0) ?? 0

  return total || summedRows || 0
}

export async function getRealtimeVisitorsFromGa(): Promise<number> {
  const redis = await getRedisClient().catch(() => null)
  let cachedValue: number | null = null
  const cacheKey = jitterCacheKey(REALTIME_CACHE_KEY)

  if (redis) {
    const cached = await redis.get(cacheKey)
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
      await redis.set(cacheKey, String(fresh), {
        EX: REALTIME_CACHE_TTL_SECONDS,
      })
    }
    return fresh
  } catch (error) {
    console.error("[analytics] failed to fetch GA realtime visitors", error)
    if (cachedValue != null) return cachedValue
    return 0
  }
}

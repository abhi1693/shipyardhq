import { BetaAnalyticsDataClient, protos } from "@google-analytics/data"
import { format } from "date-fns"

import { getRedisClient } from "@/lib/server/redis"

type HomepageTraffic = {
  pageViews30: number
  visitors30: number
  trafficSeries: Array<{ date: string; pageViews: number; visitors: number }>
}

const CACHE_KEY = "analytics:homepage:traffic:v1"
const CACHE_TTL_SECONDS = 300
const REALTIME_CACHE_KEY = "analytics:homepage:realtime:v1"
const REALTIME_CACHE_TTL_SECONDS = 30

let clientPromise: Promise<BetaAnalyticsDataClient> | null = null

export type GaDateRange = {
  startDate: string
  endDate: string
}

export type GaProductTrafficSummary = {
  pageViews: number
  uniqueVisitors: number
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
  dateRange,
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

  const dimensionFilter = buildPagePathFilter(pagePaths)
  const metrics = [
    { name: "screenPageViews" },
    { name: "activeUsers" },
    { name: "sessions" },
    { name: "bounceRate" },
    { name: "averageSessionDuration" },
  ]

  let trendReport:
    | protos.google.analytics.data.v1beta.IRunReportResponse
    | protos.google.analytics.data.v1beta.IRunReportResponse[] = []
  let referrerReport:
    | protos.google.analytics.data.v1beta.IRunReportResponse
    | protos.google.analytics.data.v1beta.IRunReportResponse[] = []
  let referrerCategoryReport:
    | protos.google.analytics.data.v1beta.IRunReportResponse
    | protos.google.analytics.data.v1beta.IRunReportResponse[] = []
  let browserReport:
    | protos.google.analytics.data.v1beta.IRunReportResponse
    | protos.google.analytics.data.v1beta.IRunReportResponse[] = []
  let osReport:
    | protos.google.analytics.data.v1beta.IRunReportResponse
    | protos.google.analytics.data.v1beta.IRunReportResponse[] = []
  let countryReport:
    | protos.google.analytics.data.v1beta.IRunReportResponse
    | protos.google.analytics.data.v1beta.IRunReportResponse[] = []
  let cityReport:
    | protos.google.analytics.data.v1beta.IRunReportResponse
    | protos.google.analytics.data.v1beta.IRunReportResponse[] = []
  let deviceReport:
    | protos.google.analytics.data.v1beta.IRunReportResponse
    | protos.google.analytics.data.v1beta.IRunReportResponse[] = []

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
      client.runReport({
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
      client.runReport({
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
          },
        ],
      }),
      client.runReport({
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
          },
        ],
      }),
      client.runReport({
        property,
        dateRanges: [dateRange],
        metrics: [{ name: "activeUsers" }],
        dimensions: [{ name: "browser" }],
        dimensionFilter,
        limit: 8,
        orderBys: [
          {
            metric: { metricName: "activeUsers" },
          },
        ],
      }),
      client.runReport({
        property,
        dateRanges: [dateRange],
        metrics: [{ name: "activeUsers" }],
        dimensions: [{ name: "operatingSystem" }],
        dimensionFilter,
        limit: 8,
        orderBys: [
          {
            metric: { metricName: "activeUsers" },
          },
        ],
      }),
      client.runReport({
        property,
        dateRanges: [dateRange],
        metrics: [{ name: "activeUsers" }],
        dimensions: [{ name: "country" }, { name: "countryId" }],
        dimensionFilter,
        limit: 8,
        orderBys: [
          {
            metric: { metricName: "activeUsers" },
          },
        ],
      }),
      client.runReport({
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
          },
        ],
      }),
      client.runReport({
        property,
        dateRanges: [dateRange],
        metrics: [{ name: "activeUsers" }],
        dimensions: [{ name: "deviceCategory" }],
        dimensionFilter,
        limit: 8,
        orderBys: [
          {
            metric: { metricName: "activeUsers" },
          },
        ],
      }),
    ])
  } else {
    trendReport = await client.runReport({
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

  const trendResponse =
    Array.isArray(trendReport) && trendReport.length > 0
      ? trendReport[0]
      : (trendReport as protos.google.analytics.data.v1beta.IRunReportResponse)

  const referrerResponseParsed =
    Array.isArray(referrerReport) && referrerReport.length > 0
      ? referrerReport[0]
      : (referrerReport as protos.google.analytics.data.v1beta.IRunReportResponse)
  const referrerCategoryResponseParsed =
    Array.isArray(referrerCategoryReport) && referrerCategoryReport.length > 0
      ? referrerCategoryReport[0]
      : (referrerCategoryReport as protos.google.analytics.data.v1beta.IRunReportResponse)
  const browserResponseParsed =
    Array.isArray(browserReport) && browserReport.length > 0
      ? browserReport[0]
      : (browserReport as protos.google.analytics.data.v1beta.IRunReportResponse)
  const osResponseParsed =
    Array.isArray(osReport) && osReport.length > 0
      ? osReport[0]
      : (osReport as protos.google.analytics.data.v1beta.IRunReportResponse)
  const cityResponseParsed =
    Array.isArray(cityReport) && cityReport.length > 0
      ? cityReport[0]
      : (cityReport as protos.google.analytics.data.v1beta.IRunReportResponse)
  const countryResponseParsed =
    Array.isArray(countryReport) && countryReport.length > 0
      ? countryReport[0]
      : (countryReport as protos.google.analytics.data.v1beta.IRunReportResponse)
  const deviceResponseParsed =
    Array.isArray(deviceReport) && deviceReport.length > 0
      ? deviceReport[0]
      : (deviceReport as protos.google.analytics.data.v1beta.IRunReportResponse)

  const totals = trendResponse.totals?.[0]?.metricValues
  const rows = trendResponse.rows ?? []
  const referrerRows = includeAdvanced ? referrerResponseParsed.rows ?? [] : []
  const referrerCategoryRows = includeAdvanced
    ? referrerCategoryResponseParsed.rows ?? []
    : []
  const browserRows = includeAdvanced ? browserResponseParsed.rows ?? [] : []
  const osRows = includeAdvanced ? osResponseParsed.rows ?? [] : []
  const cityRows = includeAdvanced ? cityResponseParsed.rows ?? [] : []
  const countryRows = includeAdvanced ? countryResponseParsed.rows ?? [] : []
  const deviceRows = includeAdvanced ? deviceResponseParsed.rows ?? [] : []

  const pageViews = resolveMetricValue(totals, 0, rows, "sum")
  const uniqueVisitors = resolveMetricValue(totals, 1, rows, "sum")
  const sessions = resolveMetricValue(totals, 2, rows, "sum")
  const rawBounceRate = resolveMetricValue(totals, 3, rows, "avg")
  const bounceRate =
    rawBounceRate > 0 && rawBounceRate <= 1
      ? rawBounceRate * 100
      : rawBounceRate
  const averageSessionDuration = resolveMetricValue(totals, 4, rows, "avg")

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
      const share =
        uniqueVisitors > 0 ? (visitors / uniqueVisitors) * 100 : 0
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

  if (redis) {
    const cached = await redis.get(CACHE_KEY)
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
      await redis.set(CACHE_KEY, JSON.stringify(fresh), {
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

  if (redis) {
    const cached = await redis.get(REALTIME_CACHE_KEY)
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
      await redis.set(REALTIME_CACHE_KEY, String(fresh), {
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

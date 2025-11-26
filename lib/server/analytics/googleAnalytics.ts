import { BetaAnalyticsDataClient, protos } from "@google-analytics/data"

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

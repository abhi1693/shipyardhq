import { format } from "date-fns"

import {
  ANALYTICS_REPORTING_WINDOW_DAYS,
  getAnalyticsReportingWindow,
} from "@/lib/analytics/reportingWindow"
import { formatCountryName } from "@/lib/geo"
import { extractProductSlug } from "@/lib/server/analytics/helpers"
import type {
  AnalyticsDateRange,
  HomepageTraffic,
  ProductTrafficMapEntry,
  ProductTrafficSummary,
  SiteAnalyticsSnapshot,
} from "@/lib/server/analytics/providerTypes"

const CLOUDFLARE_GRAPHQL_ENDPOINT =
  "https://api.cloudflare.com/client/v4/graphql"
const DEFAULT_QUERY_TIMEOUT_MS = 10_000
const DEFAULT_GROUP_LIMIT = 10_000
const DEFAULT_RETENTION_DAYS = 8
const MAX_QUERY_WINDOW_MS = 24 * 60 * 60 * 1000
const MIN_QUERY_SPLIT_WINDOW_MS = 60 * 1000
export const CLOUDFLARE_ANALYTICS_DATASET =
  "httpRequestsAdaptiveGroups:v1" as const
export const CLOUDFLARE_ANALYTICS_MIN_START_DATE =
  process.env.CLOUDFLARE_ANALYTICS_START_DATE?.trim() || "2026-01-15"

const HTTP_DIMENSIONS = [
  "date",
  "datetimeHour",
  "datetimeMinute",
  "clientDeviceType",
  "clientRequestHTTPHost",
  "clientRequestPath",
  "apiGatewayMatchedEndpoint",
  "edgeResponseStatus",
  "payPerCrawlStatus",
  "webAssetsLabelsManaged",
  "userAgentBrowser",
  "userAgentOS",
  "userAgent",
  "clientCountryName",
  "verifiedBotCategory",
  "requestSource",
] as const

export type CloudflareHttpDimension = (typeof HTTP_DIMENSIONS)[number]

type CloudflareStringHttpDimension = Exclude<
  CloudflareHttpDimension,
  "edgeResponseStatus" | "webAssetsLabelsManaged"
>

type CloudflareHttpDimensions = Partial<
  Record<CloudflareStringHttpDimension, string | null>
> & {
  edgeResponseStatus?: number | null
  webAssetsLabelsManaged?: string[] | null
}

export type CloudflareHttpGroup = {
  count: number
  sum?: { visits?: number | null } | null
  dimensions?: CloudflareHttpDimensions | null
}

type CloudflareGraphqlError = {
  message?: string
}

type CloudflareGraphqlResponse = {
  data?: {
    viewer?: {
      zones?: Array<{
        groups?: CloudflareHttpGroup[] | null
      }> | null
    } | null
  } | null
  errors?: CloudflareGraphqlError[] | null
}

type CloudflareConfig = {
  apiToken: string
  zoneId: string
}

class CloudflareAnalyticsError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message)
    this.name = "CloudflareAnalyticsError"
  }
}

function readCloudflareConfig(): CloudflareConfig | null {
  const apiToken = (
    process.env.CLOUDFLARE_API_TOKEN ?? process.env.CF_API_TOKEN
  )?.trim()
  const zoneId = process.env.CLOUDFLARE_ZONE_ID?.trim()

  if (!apiToken || !zoneId) return null
  return { apiToken, zoneId }
}

export function hasCloudflareAnalyticsConfig() {
  return Boolean(readCloudflareConfig())
}

export function isTransientCloudflareError(error: unknown) {
  if (error instanceof CloudflareAnalyticsError) {
    return error.status === 429 || (error.status ?? 0) >= 500
  }

  const errorDetails = error as { message?: unknown; name?: unknown }
  if (String(errorDetails?.name ?? "").toLowerCase() === "aborterror") {
    return true
  }

  const message = String(errorDetails?.message ?? "")
    .toLowerCase()
    .trim()
  return [
    "aborterror",
    "econnreset",
    "etimedout",
    "fetch failed",
    "network",
    "socket hang up",
    "timeout",
  ].some((pattern) => message.includes(pattern))
}

function parsePositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

function normalizeDateRange(range: AnalyticsDateRange): AnalyticsDateRange {
  const start = new Date(`${range.startDate}T00:00:00Z`)
  const end = new Date(`${range.endDate}T00:00:00Z`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error("Invalid analytics date range")
  }

  const orderedStart = start <= end ? start : end
  const orderedEnd = start <= end ? end : start
  return {
    startDate: orderedStart.toISOString().slice(0, 10),
    endDate: orderedEnd.toISOString().slice(0, 10),
  }
}

function dateRangeTimes(range: AnalyticsDateRange) {
  const normalized = normalizeDateRange(range)
  const endExclusive = new Date(`${normalized.endDate}T00:00:00Z`)
  endExclusive.setUTCDate(endExclusive.getUTCDate() + 1)
  return {
    start: `${normalized.startDate}T00:00:00.000Z`,
    end: endExclusive.toISOString(),
  }
}

function buildHttpFilter(args: {
  start: string
  end: string
  pagePaths?: string[]
  pathPrefix?: string
  verifiedBotCategories?: string[]
}) {
  const expressions: Array<Record<string, unknown>> = [
    { datetime_geq: args.start, datetime_lt: args.end },
  ]

  if (args.pagePaths) {
    const pagePaths = Array.from(
      new Set(args.pagePaths.map((path) => path.trim()).filter(Boolean)),
    )
    if (pagePaths.length === 0) return null
    expressions.push({
      OR: pagePaths.map((clientRequestPath) => ({ clientRequestPath })),
    })
  } else if (args.pathPrefix) {
    expressions.push({ clientRequestPath_like: `${args.pathPrefix}%` })
  }

  const verifiedBotCategories = Array.from(
    new Set(
      (args.verifiedBotCategories ?? [])
        .map((category) => category.trim())
        .filter(Boolean),
    ),
  )
  if (verifiedBotCategories.length > 0) {
    expressions.push({ verifiedBotCategory_in: verifiedBotCategories })
  }

  return { AND: expressions }
}

function splitQueryWindows(times: { start: string; end: string }) {
  const requestedStart = new Date(times.start)
  const requestedEnd = new Date(times.end)
  if (
    Number.isNaN(requestedStart.getTime()) ||
    Number.isNaN(requestedEnd.getTime())
  ) {
    throw new Error("Invalid Cloudflare analytics time range")
  }

  const now = new Date()
  const earliestAvailable = new Date(now)
  earliestAvailable.setUTCHours(0, 0, 0, 0)
  earliestAvailable.setUTCDate(
    earliestAvailable.getUTCDate() -
      (parsePositiveInteger(
        process.env.CLOUDFLARE_ANALYTICS_RETENTION_DAYS,
        DEFAULT_RETENTION_DAYS,
      ) -
        1),
  )

  const start = new Date(
    Math.max(requestedStart.getTime(), earliestAvailable.getTime()),
  )
  const end = new Date(Math.min(requestedEnd.getTime(), now.getTime()))
  if (start >= end) return []

  const windows: Array<{ start: string; end: string }> = []
  for (
    let cursor = start.getTime();
    cursor < end.getTime();
    cursor += MAX_QUERY_WINDOW_MS
  ) {
    windows.push({
      start: new Date(cursor).toISOString(),
      end: new Date(
        Math.min(cursor + MAX_QUERY_WINDOW_MS, end.getTime()),
      ).toISOString(),
    })
  }
  return windows
}

function mergeHttpGroups(
  groupSets: CloudflareHttpGroup[][],
  dimensions: CloudflareHttpDimension[],
) {
  const merged = new Map<string, CloudflareHttpGroup>()

  for (const groups of groupSets) {
    for (const group of groups) {
      const key = dimensions
        .map((dimension) =>
          JSON.stringify(group.dimensions?.[dimension] ?? null),
        )
        .join("|")
      const current = merged.get(key)
      if (!current) {
        merged.set(key, {
          count: Number(group.count) || 0,
          sum: { visits: Number(group.sum?.visits) || 0 },
          dimensions: group.dimensions,
        })
        continue
      }

      current.count += Number(group.count) || 0
      current.sum = {
        visits:
          (Number(current.sum?.visits) || 0) + (Number(group.sum?.visits) || 0),
      }
    }
  }

  return Array.from(merged.values()).sort((a, b) => b.count - a.count)
}

export type CloudflareHttpQuery = {
  dimensions?: CloudflareHttpDimension[]
  dateRange?: AnalyticsDateRange
  startTime?: string
  endTime?: string
  pagePaths?: string[]
  pathPrefix?: string
  verifiedBotCategories?: string[]
  limit?: number
  limitScope?: "total" | "per-window"
  splitOnLimit?: boolean
  onWindowProgress?: (event: CloudflareHttpWindowProgressEvent) => void
}

export type CloudflareHttpWindowProgressEvent = {
  action: "completed" | "split"
  groups: number
  limit: number
  windowEnd: string
  windowStart: string
  windowsQueried: number
}

export type CloudflareHttpQueryResult = {
  groups: CloudflareHttpGroup[]
  truncated: boolean
  windowsQueried: number
}

export async function queryCloudflareHttpGroupsWithMetadata(
  args: CloudflareHttpQuery,
): Promise<CloudflareHttpQueryResult> {
  const config = readCloudflareConfig()
  if (!config) {
    throw new CloudflareAnalyticsError(
      "Cloudflare analytics is not configured. Set CLOUDFLARE_ZONE_ID and CLOUDFLARE_API_TOKEN.",
    )
  }

  const times =
    args.startTime && args.endTime
      ? { start: args.startTime, end: args.endTime }
      : dateRangeTimes(args.dateRange ?? getAnalyticsReportingWindow())
  const dimensions = Array.from(new Set(args.dimensions ?? []))
  const invalidDimension = dimensions.find(
    (dimension) => !HTTP_DIMENSIONS.includes(dimension),
  )
  if (invalidDimension) {
    throw new Error(
      `Unsupported Cloudflare HTTP dimension: ${invalidDimension}`,
    )
  }

  const limit = Math.min(
    Math.max(1, Math.floor(args.limit ?? DEFAULT_GROUP_LIMIT)),
    DEFAULT_GROUP_LIMIT,
  )
  const dimensionSelection = dimensions.length
    ? `dimensions { ${dimensions.join(" ")} }`
    : ""
  const query = `
    query HttpGroups(
      $zoneTag: string
      $filter: ZoneHttpRequestsAdaptiveGroupsFilter_InputObject
    ) {
      viewer {
        zones(filter: { zoneTag: $zoneTag }) {
          groups: httpRequestsAdaptiveGroups(
            filter: $filter
            limit: ${limit}
            orderBy: [count_DESC]
          ) {
            count
            sum { visits }
            ${dimensionSelection}
          }
        }
      }
    }
  `

  const windows = splitQueryWindows(times)
  const groupSets: CloudflareHttpGroup[][] = []
  let truncated = false
  let windowsQueried = 0

  const fetchWindow = async (window: { start: string; end: string }) => {
    const filter = buildHttpFilter({
      ...window,
      pagePaths: args.pagePaths,
      pathPrefix: args.pathPrefix,
      verifiedBotCategories: args.verifiedBotCategories,
    })
    if (!filter) return

    const controller = new AbortController()
    const timeout = setTimeout(
      () => controller.abort(),
      parsePositiveInteger(
        process.env.CLOUDFLARE_ANALYTICS_TIMEOUT_MS,
        DEFAULT_QUERY_TIMEOUT_MS,
      ),
    )

    try {
      windowsQueried += 1
      const response = await fetch(CLOUDFLARE_GRAPHQL_ENDPOINT, {
        method: "POST",
        headers: {
          authorization: `Bearer ${config.apiToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          query,
          variables: { zoneTag: config.zoneId, filter },
        }),
        cache: "no-store",
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new CloudflareAnalyticsError(
          `Cloudflare analytics request failed with status ${response.status}`,
          response.status,
        )
      }

      const payload = (await response.json()) as CloudflareGraphqlResponse
      if (payload.errors?.length) {
        throw new CloudflareAnalyticsError(
          `Cloudflare analytics query failed: ${payload.errors
            .map((error) => error.message || "unknown error")
            .join("; ")}`,
        )
      }

      const groups = payload.data?.viewer?.zones?.[0]?.groups ?? []
      if (args.splitOnLimit && groups.length >= limit) {
        const startMs = new Date(window.start).getTime()
        const endMs = new Date(window.end).getTime()
        if (endMs - startMs > MIN_QUERY_SPLIT_WINDOW_MS) {
          args.onWindowProgress?.({
            action: "split",
            groups: groups.length,
            limit,
            windowEnd: window.end,
            windowStart: window.start,
            windowsQueried,
          })
          const midpoint = new Date(
            startMs + Math.floor((endMs - startMs) / 2),
          ).toISOString()
          await fetchWindow({ start: window.start, end: midpoint })
          await fetchWindow({ start: midpoint, end: window.end })
          return
        }
      }

      groupSets.push(groups)
      truncated ||= groups.length >= limit
      args.onWindowProgress?.({
        action: "completed",
        groups: groups.length,
        limit,
        windowEnd: window.end,
        windowStart: window.start,
        windowsQueried,
      })
    } finally {
      clearTimeout(timeout)
    }
  }

  for (const window of windows) {
    await fetchWindow(window)
  }

  const mergedGroups = mergeHttpGroups(groupSets, dimensions)
  const enforceTotalLimit = args.limitScope !== "per-window"

  return {
    groups: enforceTotalLimit ? mergedGroups.slice(0, limit) : mergedGroups,
    truncated: truncated || (enforceTotalLimit && mergedGroups.length > limit),
    windowsQueried,
  }
}

export async function queryCloudflareHttpGroups(
  args: CloudflareHttpQuery,
): Promise<CloudflareHttpGroup[]> {
  const result = await queryCloudflareHttpGroupsWithMetadata(args)
  return result.groups
}

function pageViews(group: CloudflareHttpGroup) {
  return Math.max(0, Math.round(Number(group.count) || 0))
}

function visits(group: CloudflareHttpGroup) {
  return Math.max(0, Math.round(Number(group.sum?.visits) || 0))
}

function emptyProductTraffic(): ProductTrafficSummary {
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
    countries: [],
    cities: [],
    devices: [],
    timeseries: [],
  }
}

function topDimension(
  groups: CloudflareHttpGroup[],
  dimension: CloudflareStringHttpDimension,
) {
  return groups.map((group) => ({
    label: group.dimensions?.[dimension]?.trim() || "Unknown",
    pageViews: pageViews(group),
    visits: visits(group),
  }))
}

function buildCompleteTimeseries(
  range: AnalyticsDateRange,
  groups: CloudflareHttpGroup[],
) {
  const normalized = normalizeDateRange(range)
  const values = new Map(
    groups.map((group) => [
      group.dimensions?.date ?? "",
      { pageViews: pageViews(group), visits: visits(group) },
    ]),
  )
  const start = new Date(`${normalized.startDate}T00:00:00Z`)
  const end = new Date(`${normalized.endDate}T00:00:00Z`)
  const timeseries: ProductTrafficSummary["timeseries"] = []

  for (
    const cursor = new Date(start);
    cursor <= end;
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  ) {
    const key = cursor.toISOString().slice(0, 10)
    const value = values.get(key)
    timeseries.push({
      date: cursor.toISOString(),
      label: format(cursor, "MMM d"),
      pageViews: value?.pageViews ?? 0,
      uniqueVisitors: value?.visits ?? 0,
    })
  }

  return timeseries
}

export async function getProductTrafficFromCloudflare(args: {
  pagePaths: string[]
  dateRange: AnalyticsDateRange
  includeAdvanced?: boolean
}): Promise<ProductTrafficSummary> {
  if (!hasCloudflareAnalyticsConfig() || args.pagePaths.length === 0) {
    return emptyProductTraffic()
  }

  const includeAdvanced = args.includeAdvanced ?? true
  const dailyPromise = queryCloudflareHttpGroups({
    dateRange: args.dateRange,
    pagePaths: args.pagePaths,
    dimensions: ["date"],
  })
  const breakdownPromises = includeAdvanced
    ? Promise.all([
        queryCloudflareHttpGroups({
          dateRange: args.dateRange,
          pagePaths: args.pagePaths,
          dimensions: ["userAgentBrowser"],
          limit: 8,
        }),
        queryCloudflareHttpGroups({
          dateRange: args.dateRange,
          pagePaths: args.pagePaths,
          dimensions: ["userAgentOS"],
          limit: 8,
        }),
        queryCloudflareHttpGroups({
          dateRange: args.dateRange,
          pagePaths: args.pagePaths,
          dimensions: ["clientDeviceType"],
          limit: 8,
        }),
        queryCloudflareHttpGroups({
          dateRange: args.dateRange,
          pagePaths: args.pagePaths,
          dimensions: ["clientCountryName"],
          limit: 12,
        }),
      ])
    : Promise.resolve([[], [], [], []] as CloudflareHttpGroup[][])

  const [dailyGroups, breakdowns] = await Promise.all([
    dailyPromise,
    breakdownPromises,
  ])
  const [browserGroups, osGroups, deviceGroups, countryGroups] = breakdowns
  const timeseries = buildCompleteTimeseries(args.dateRange, dailyGroups)
  const totalViews = timeseries.reduce((sum, point) => sum + point.pageViews, 0)
  const totalVisits = timeseries.reduce(
    (sum, point) => sum + point.uniqueVisitors,
    0,
  )
  return {
    pageViews: totalViews,
    uniqueVisitors: totalVisits,
    sessions: totalVisits,
    newUsers: 0,
    returningVisitors: 0,
    bounceRate: 0,
    averageSessionDuration: 0,
    browsers: topDimension(browserGroups, "userAgentBrowser").map((entry) => ({
      browser: entry.label,
      visitors: entry.pageViews,
    })),
    operatingSystems: topDimension(osGroups, "userAgentOS").map((entry) => ({
      os: entry.label,
      visitors: entry.pageViews,
    })),
    devices: topDimension(deviceGroups, "clientDeviceType").map((entry) => ({
      deviceCategory: entry.label.toLowerCase(),
      visitors: entry.pageViews,
    })),
    countries: topDimension(countryGroups, "clientCountryName").map(
      (entry) => ({
        country: formatCountryName(entry.label),
        code: entry.label,
        visitors: entry.pageViews,
        share: totalViews > 0 ? (entry.pageViews / totalViews) * 100 : 0,
      }),
    ),
    cities: [],
    timeseries,
  }
}

export async function getProductTrafficMapFromCloudflare(args: {
  products: Array<{ id: string; slug: string }>
  dateRange: AnalyticsDateRange
}): Promise<Map<string, ProductTrafficMapEntry>> {
  const results = new Map(
    args.products.map((product) => [
      product.id,
      { pageViews: 0, uniqueVisitors: 0, sessions: 0 },
    ]),
  )
  if (!hasCloudflareAnalyticsConfig() || args.products.length === 0) {
    return results
  }

  const idBySlug = new Map(
    args.products.map((product) => [product.slug.toLowerCase(), product.id]),
  )
  const groups = await queryCloudflareHttpGroups({
    dateRange: args.dateRange,
    pathPrefix: "/products/",
    dimensions: ["clientRequestPath"],
  })

  for (const group of groups) {
    const slug = extractProductSlug(group.dimensions?.clientRequestPath)
    const productId = slug ? idBySlug.get(slug) : null
    if (!productId) continue
    const current = results.get(productId)!
    const groupVisits = visits(group)
    results.set(productId, {
      pageViews: current.pageViews + pageViews(group),
      uniqueVisitors: current.uniqueVisitors + groupVisits,
      sessions: current.sessions + groupVisits,
    })
  }

  return results
}

function defaultSiteDateRange(): AnalyticsDateRange {
  const { startDate, endDate } = getAnalyticsReportingWindow()
  return { startDate, endDate }
}

export async function getSiteAnalyticsSnapshotFromCloudflare(args?: {
  dateRange?: AnalyticsDateRange
  topProductLimit?: number
}): Promise<SiteAnalyticsSnapshot> {
  const dateRange = args?.dateRange ?? defaultSiteDateRange()
  if (!hasCloudflareAnalyticsConfig()) {
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

  const [
    daily,
    browserGroups,
    osGroups,
    deviceGroups,
    countryGroups,
    productGroups,
  ] = await Promise.all([
    queryCloudflareHttpGroups({ dateRange, dimensions: ["date"] }),
    queryCloudflareHttpGroups({
      dateRange,
      dimensions: ["userAgentBrowser"],
      limit: 12,
    }),
    queryCloudflareHttpGroups({
      dateRange,
      dimensions: ["userAgentOS"],
      limit: 12,
    }),
    queryCloudflareHttpGroups({
      dateRange,
      dimensions: ["clientDeviceType"],
      limit: 8,
    }),
    queryCloudflareHttpGroups({
      dateRange,
      dimensions: ["clientCountryName"],
      limit: 50,
    }),
    queryCloudflareHttpGroups({
      dateRange,
      pathPrefix: "/products/",
      dimensions: ["clientRequestPath"],
      limit: Math.max(25, (args?.topProductLimit ?? 6) * 4),
    }),
  ])
  const timeseries = buildCompleteTimeseries(dateRange, daily)
  const totalViews = timeseries.reduce((sum, point) => sum + point.pageViews, 0)
  const totalVisits = timeseries.reduce(
    (sum, point) => sum + point.uniqueVisitors,
    0,
  )
  const withShare = (entryViews: number) =>
    totalViews > 0 ? (entryViews / totalViews) * 100 : 0

  return {
    pageViews: totalViews,
    uniqueVisitors: totalVisits,
    sessions: totalVisits,
    bounceRate: 0,
    averageSessionDuration: 0,
    newUsers: 0,
    engagementRate: 0,
    pagesPerSession: totalVisits > 0 ? totalViews / totalVisits : 0,
    timeseries,
    browsers: topDimension(browserGroups, "userAgentBrowser").map((entry) => ({
      browser: entry.label,
      visitors: entry.pageViews,
      share: withShare(entry.pageViews),
    })),
    operatingSystems: topDimension(osGroups, "userAgentOS").map((entry) => ({
      os: entry.label,
      visitors: entry.pageViews,
      share: withShare(entry.pageViews),
    })),
    devices: topDimension(deviceGroups, "clientDeviceType").map((entry) => ({
      deviceCategory: entry.label.toLowerCase(),
      visitors: entry.pageViews,
      share: withShare(entry.pageViews),
    })),
    countries: topDimension(countryGroups, "clientCountryName").map(
      (entry) => ({
        country: formatCountryName(entry.label),
        code: entry.label,
        visitors: entry.pageViews,
        share: totalViews > 0 ? (entry.pageViews / totalViews) * 100 : 0,
      }),
    ),
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
      totalRequests: totalViews,
      browserRequests: 0,
      verifiedAutomatedRequests: 0,
      otherRequests: totalViews,
      verifiedCategories: [],
    },
    topProductPages: productGroups
      .map((group) => {
        const path = group.dimensions?.clientRequestPath || "/"
        const groupViews = pageViews(group)
        const groupVisits = visits(group)
        return {
          path,
          slug: extractProductSlug(path),
          pageViews: groupViews,
          uniqueVisitors: groupVisits,
          sessions: groupVisits,
          bounceRate: 0,
          averageSessionDuration: 0,
          shareOfViews: totalViews > 0 ? (groupViews / totalViews) * 100 : 0,
        }
      })
      .filter((entry) => entry.slug)
      .sort((a, b) => b.pageViews - a.pageViews)
      .slice(0, Math.max(1, args?.topProductLimit ?? 6)),
  }
}

export async function getHomepageTrafficFromCloudflare(): Promise<HomepageTraffic> {
  const dateRange = defaultSiteDateRange()
  if (!hasCloudflareAnalyticsConfig()) {
    return {
      windowDays: ANALYTICS_REPORTING_WINDOW_DAYS,
      pageViews: 0,
      visitors: 0,
      trafficSeries: [],
    }
  }

  const groups = await queryCloudflareHttpGroups({
    dateRange,
    dimensions: ["date"],
  })
  const timeseries = buildCompleteTimeseries(dateRange, groups)
  return {
    windowDays: ANALYTICS_REPORTING_WINDOW_DAYS,
    pageViews: timeseries.reduce((sum, point) => sum + point.pageViews, 0),
    visitors: timeseries.reduce((sum, point) => sum + point.uniqueVisitors, 0),
    trafficSeries: timeseries.map((point) => ({
      date: point.date,
      pageViews: point.pageViews,
      visitors: point.uniqueVisitors,
    })),
  }
}

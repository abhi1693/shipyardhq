import { format } from "date-fns"

import prisma from "@/lib/prisma"
import { productPath } from "@/lib/routes"
import { hasAnalyticsIngestionCoverage } from "@/lib/server/analytics/ingestion/coverage"
import { getAvailableSiteAnalyticsReportingWindow } from "@/lib/server/analytics/reportingWindow"
import type {
  AnalyticsDateRange,
  AnalyticsProvider,
  HomepageTraffic,
  ProductTrafficSummary,
  SiteAnalyticsSnapshot,
} from "@/lib/server/analytics/providerTypes"
import { extractProductSlug } from "@/lib/server/analytics/helpers"
import { buildHourlyActivity } from "@/lib/server/analytics/hourlyActivity"
import { buildAiCrawlerAttention } from "@/lib/server/analytics/aiCrawlerAttention"

type RangeBounds = {
  start: Date
  end: Date
  days: number
}

type BrowserRow = { browser: string; _sum: { visitors: number | null } }
type OperatingSystemRow = {
  operatingSystem: string
  _sum: { visitors: number | null }
}
type DeviceRow = { deviceCategory: string; _sum: { visitors: number | null } }
type CountryRow = {
  country: string
  countryCode: string
  _sum: { visitors: number | null }
}
type TrafficCompositionRow = {
  segment: string
  category: string
  _sum: { requests: number | null }
}
type TopProductCandidateRow = {
  productId: string
  _sum: { pageViews: number | null }
}
type ProductBrowserRow = { browser: string; _sum: { visitors: number | null } }
type ProductOperatingSystemRow = {
  operatingSystem: string
  _sum: { visitors: number | null }
}
type ProductDeviceRow = {
  deviceCategory: string
  _sum: { visitors: number | null }
}
type ProductCountryRow = {
  country: string
  countryCode: string
  _sum: { visitors: number | null }
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
    countries: [],
    cities: [],
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

function emptyProductTrafficMap(
  products: Array<{ id: string }>,
): Map<
  string,
  { pageViews: number; uniqueVisitors: number; sessions: number }
> {
  return new Map(
    products.map((product) => [
      product.id,
      { pageViews: 0, uniqueVisitors: 0, sessions: 0 },
    ]),
  )
}

function toUtcDate(value: string): Date | null {
  const parsed = new Date(`${value}T00:00:00Z`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function addUtcDays(date: Date, days: number): Date {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate() + days,
    ),
  )
}

function resolveRangeBounds(range: AnalyticsDateRange): RangeBounds | null {
  const start = toUtcDate(range.startDate)
  const end = toUtcDate(range.endDate)
  if (!start || !end) return null

  const orderedStart = start <= end ? start : end
  const orderedEnd = start <= end ? end : start
  const days =
    Math.round(
      (orderedEnd.getTime() - orderedStart.getTime()) / (1000 * 60 * 60 * 24),
    ) + 1

  return {
    start: orderedStart,
    end: orderedEnd,
    days: Math.max(1, days),
  }
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

function resolveSlugsFromPaths(pagePaths: string[]): string[] {
  return Array.from(
    new Set(pagePaths.map((path) => extractProductSlug(path)).filter(Boolean)),
  ) as string[]
}

async function defaultSiteDateRange(): Promise<AnalyticsDateRange> {
  const { startDate, endDate } =
    await getAvailableSiteAnalyticsReportingWindow()
  return {
    startDate,
    endDate,
  }
}

async function getSiteAnalyticsSnapshotFromDb(args?: {
  dateRange?: AnalyticsDateRange
  topProductLimit?: number
}) {
  const requestedRange = args?.dateRange ?? (await defaultSiteDateRange())
  const bounds = resolveRangeBounds(requestedRange)
  if (!bounds) return null

  const [hasSiteDaily, hasSiteBreakdowns, hasProductDaily] = await Promise.all([
    hasAnalyticsIngestionCoverage("site_traffic_daily", bounds),
    hasAnalyticsIngestionCoverage("site_traffic_breakdowns", bounds),
    hasAnalyticsIngestionCoverage("product_traffic_daily", bounds),
  ])

  if (!hasSiteDaily || !hasSiteBreakdowns || !hasProductDaily) {
    return null
  }

  const dailyRows = await prisma.siteTrafficDaily.findMany({
    where: {
      source: "cloudflare",
      date: { gte: bounds.start, lte: bounds.end },
    },
    orderBy: { date: "asc" },
  })

  const dailyByDate = new Map<
    string,
    { pageViews: number; uniqueVisitors: number }
  >()
  for (const row of dailyRows) {
    const key = dateKey(row.date)
    const current = dailyByDate.get(key) ?? {
      pageViews: 0,
      uniqueVisitors: 0,
    }
    dailyByDate.set(key, {
      pageViews: current.pageViews + row.pageViews,
      uniqueVisitors: current.uniqueVisitors + row.uniqueVisitors,
    })
  }

  let pageViews = 0
  let uniqueVisitors = 0
  let sessions = 0
  let newUsers = 0
  let bounceWeighted = 0
  let durationWeighted = 0
  let engagementWeighted = 0

  for (const row of dailyRows) {
    pageViews += row.pageViews
    uniqueVisitors += row.uniqueVisitors
    sessions += row.sessions
    newUsers += row.newUsers
    bounceWeighted += row.bounceRate * row.sessions
    durationWeighted += row.averageSessionDuration * row.sessions
    engagementWeighted += row.engagementRate * row.sessions
  }

  const bounceRate = sessions > 0 ? bounceWeighted / sessions : 0
  const averageSessionDuration = sessions > 0 ? durationWeighted / sessions : 0
  const engagementRate = sessions > 0 ? engagementWeighted / sessions : 0
  const pagesPerSession = sessions > 0 ? pageViews / sessions : 0
  const resolvedNewUsers =
    newUsers > 0 ? newUsers : Math.min(uniqueVisitors, sessions)

  const timeseries = []
  for (let i = 0; i < bounds.days; i += 1) {
    const date = addUtcDays(bounds.start, i)
    const key = dateKey(date)
    const row = dailyByDate.get(key)
    timeseries.push({
      date: date.toISOString(),
      label: format(date, "MMM d"),
      pageViews: row?.pageViews ?? 0,
      uniqueVisitors: row?.uniqueVisitors ?? 0,
    })
  }

  const [
    browserRows,
    osRows,
    deviceRows,
    countryRows,
    hourlyRows,
    compositionRows,
    aiCrawlerStatusRows,
    aiCrawlerEndpointRows,
  ] = await Promise.all([
    prisma.siteTrafficBrowserDaily.groupBy({
      by: ["browser"],
      where: {
        source: "cloudflare",
        date: { gte: bounds.start, lte: bounds.end },
      },
      _sum: { visitors: true },
      orderBy: { _sum: { visitors: "desc" } },
      take: 8,
    }),
    prisma.siteTrafficOperatingSystemDaily.groupBy({
      by: ["operatingSystem"],
      where: {
        source: "cloudflare",
        date: { gte: bounds.start, lte: bounds.end },
      },
      _sum: { visitors: true },
      orderBy: { _sum: { visitors: "desc" } },
      take: 8,
    }),
    prisma.siteTrafficDeviceDaily.groupBy({
      by: ["deviceCategory"],
      where: {
        source: "cloudflare",
        date: { gte: bounds.start, lte: bounds.end },
      },
      _sum: { visitors: true },
      orderBy: { _sum: { visitors: "desc" } },
      take: 5,
    }),
    prisma.siteTrafficCountryDaily.groupBy({
      by: ["country", "countryCode"],
      where: {
        source: "cloudflare",
        date: { gte: bounds.start, lte: bounds.end },
      },
      _sum: { visitors: true },
      orderBy: { _sum: { visitors: "desc" } },
      take: 10,
    }),
    prisma.siteTrafficHourly.findMany({
      where: {
        source: "cloudflare",
        timestamp: {
          gte: bounds.start,
          lt: addUtcDays(bounds.end, 1),
        },
      },
      select: { timestamp: true, requests: true, visits: true },
      orderBy: { timestamp: "asc" },
    }),
    prisma.siteTrafficCompositionDaily.groupBy({
      by: ["segment", "category"],
      where: {
        source: "cloudflare",
        date: { gte: bounds.start, lte: bounds.end },
      },
      _sum: { requests: true },
      orderBy: { _sum: { requests: "desc" } },
    }),
    prisma.siteAiCrawlerStatusDaily.findMany({
      where: {
        source: "cloudflare",
        date: { gte: bounds.start, lte: bounds.end },
      },
      select: {
        category: true,
        crawlStatus: true,
        responseStatus: true,
        requests: true,
      },
    }),
    prisma.siteAiCrawlerEndpointDaily.groupBy({
      by: ["endpoint"],
      where: {
        source: "cloudflare",
        date: { gte: bounds.start, lte: bounds.end },
      },
      _sum: { requests: true },
      orderBy: { _sum: { requests: "desc" } },
      take: 12,
    }),
  ])

  const aiCrawlerEndpointMetadata =
    aiCrawlerEndpointRows.length > 0
      ? await prisma.siteAiCrawlerEndpointDaily.findMany({
          where: {
            source: "cloudflare",
            date: { gte: bounds.start, lte: bounds.end },
            endpoint: {
              in: aiCrawlerEndpointRows.map((row) => row.endpoint),
            },
            OR: [
              { managedLabels: { isEmpty: false } },
              { NOT: { matchedEndpoint: "" } },
            ],
          },
          select: {
            endpoint: true,
            matchedEndpoint: true,
            managedLabels: true,
          },
        })
      : []

  const browsers = browserRows.map((row: BrowserRow) => {
    const visitors = Number(row._sum.visitors ?? 0)
    return {
      browser: row.browser,
      visitors,
      share: uniqueVisitors > 0 ? (visitors / uniqueVisitors) * 100 : 0,
    }
  })

  const operatingSystems = osRows.map((row: OperatingSystemRow) => {
    const visitors = Number(row._sum.visitors ?? 0)
    return {
      os: row.operatingSystem,
      visitors,
      share: uniqueVisitors > 0 ? (visitors / uniqueVisitors) * 100 : 0,
    }
  })

  const devices = deviceRows.map((row: DeviceRow) => {
    const visitors = Number(row._sum.visitors ?? 0)
    return {
      deviceCategory: row.deviceCategory,
      visitors,
      share: uniqueVisitors > 0 ? (visitors / uniqueVisitors) * 100 : 0,
    }
  })

  const countries = countryRows.map((row: CountryRow) => {
    const visitors = Number(row._sum.visitors ?? 0)
    return {
      country: row.country,
      code: row.countryCode || null,
      visitors,
      share: uniqueVisitors > 0 ? (visitors / uniqueVisitors) * 100 : 0,
    }
  })

  const hourlyActivity = buildHourlyActivity(hourlyRows)

  let browserRequests = 0
  let verifiedAutomatedRequests = 0
  let otherRequests = 0
  const verifiedCategories: SiteAnalyticsSnapshot["trafficComposition"]["verifiedCategories"] =
    []

  for (const row of compositionRows as TrafficCompositionRow[]) {
    const requests = Math.max(0, Number(row._sum.requests ?? 0))
    if (row.segment === "browser") {
      browserRequests += requests
    } else if (row.segment === "verified_automated") {
      verifiedAutomatedRequests += requests
      verifiedCategories.push({
        category: row.category,
        requests,
        share: 0,
      })
    } else {
      otherRequests += requests
    }
  }

  const classifiedRequests =
    browserRequests + verifiedAutomatedRequests + otherRequests
  // Grouped adaptive estimates can drift slightly; the raw total is authoritative.
  otherRequests =
    pageViews > 0
      ? Math.max(0, pageViews - browserRequests - verifiedAutomatedRequests)
      : otherRequests
  const compositionTotal =
    pageViews > 0
      ? Math.max(pageViews, browserRequests + verifiedAutomatedRequests)
      : classifiedRequests
  const trafficComposition = {
    totalRequests: compositionTotal,
    browserRequests,
    verifiedAutomatedRequests,
    otherRequests,
    verifiedCategories: verifiedCategories
      .map((category) => ({
        ...category,
        share:
          compositionTotal > 0
            ? (category.requests / compositionTotal) * 100
            : 0,
      }))
      .sort((a, b) => b.requests - a.requests),
  }
  const aiCrawlerAttention = buildAiCrawlerAttention({
    totalSiteRequests: pageViews,
    categories: verifiedCategories,
    statuses: aiCrawlerStatusRows,
    endpoints: [
      ...aiCrawlerEndpointRows.map((row) => ({
        category: "AI Crawler",
        endpoint: row.endpoint,
        matchedEndpoint: "",
        managedLabels: [],
        requests: Number(row._sum.requests ?? 0),
      })),
      ...aiCrawlerEndpointMetadata.map((row) => ({
        category: "AI Crawler",
        endpoint: row.endpoint,
        matchedEndpoint: row.matchedEndpoint,
        managedLabels: row.managedLabels,
        requests: 0,
      })),
    ],
  })

  const topProductLimit = Math.max(1, args?.topProductLimit ?? 6)
  const topProductCandidates = await prisma.productTrafficDaily.groupBy({
    by: ["productId"],
    where: {
      source: "cloudflare",
      date: { gte: bounds.start, lte: bounds.end },
    },
    _sum: { pageViews: true },
    orderBy: { _sum: { pageViews: "desc" } },
    take: Math.max(topProductLimit, 1),
  })

  const candidateIds = topProductCandidates.map(
    (row: TopProductCandidateRow) => row.productId,
  )
  let topProductPages: Array<{
    path: string
    slug: string | null
    pageViews: number
    uniqueVisitors: number
    sessions: number
    bounceRate: number
    averageSessionDuration: number
    shareOfViews: number
  }> = []

  if (candidateIds.length > 0) {
    const [productRows, products] = await Promise.all([
      prisma.productTrafficDaily.findMany({
        where: {
          productId: { in: candidateIds },
          source: "cloudflare",
          date: { gte: bounds.start, lte: bounds.end },
        },
      }),
      prisma.product.findMany({
        where: { id: { in: candidateIds } },
        select: { id: true, slug: true },
      }),
    ])

    const slugById = new Map<string, string>(
      products.map((product: { id: string; slug: string }) => [
        product.id,
        product.slug,
      ]),
    )

    const aggregated = new Map<
      string,
      {
        pageViews: number
        uniqueVisitors: number
        sessions: number
        bounceWeighted: number
        durationWeighted: number
      }
    >()

    for (const row of productRows) {
      const current =
        aggregated.get(row.productId) ??
        ({
          pageViews: 0,
          uniqueVisitors: 0,
          sessions: 0,
          bounceWeighted: 0,
          durationWeighted: 0,
        } satisfies {
          pageViews: number
          uniqueVisitors: number
          sessions: number
          bounceWeighted: number
          durationWeighted: number
        })

      current.pageViews += row.pageViews
      current.uniqueVisitors += row.uniqueVisitors
      current.sessions += row.sessions
      current.bounceWeighted += row.bounceRate * row.sessions
      current.durationWeighted += row.averageSessionDuration * row.sessions

      aggregated.set(row.productId, current)
    }

    topProductPages = Array.from(aggregated.entries())
      .flatMap(([productId, metrics]) => {
        const slug = slugById.get(productId)
        if (!slug) return []
        const bounceRateValue =
          metrics.sessions > 0 ? metrics.bounceWeighted / metrics.sessions : 0
        const avgSessionDuration =
          metrics.sessions > 0 ? metrics.durationWeighted / metrics.sessions : 0
        return [
          {
            path: productPath(slug),
            slug,
            pageViews: metrics.pageViews,
            uniqueVisitors: metrics.uniqueVisitors,
            sessions: metrics.sessions,
            bounceRate: bounceRateValue,
            averageSessionDuration: avgSessionDuration,
            shareOfViews:
              pageViews > 0 ? (metrics.pageViews / pageViews) * 100 : 0,
          },
        ]
      })
      .sort((a, b) => b.pageViews - a.pageViews)
      .slice(0, topProductLimit)
  }

  return {
    pageViews,
    uniqueVisitors,
    sessions,
    bounceRate,
    averageSessionDuration,
    newUsers: resolvedNewUsers,
    engagementRate,
    pagesPerSession,
    timeseries,
    browsers,
    operatingSystems,
    devices,
    countries,
    regions: [],
    cities: [],
    hourlyActivity,
    aiCrawlerAttention,
    trafficComposition,
    topProductPages,
  }
}

async function getProductTrafficFromDb(args: {
  pagePaths: string[]
  dateRange: AnalyticsDateRange
  includeAdvanced?: boolean
}): Promise<ProductTrafficSummary | null> {
  const slugs = resolveSlugsFromPaths(args.pagePaths)
  if (slugs.length === 0) return null

  const products = await prisma.product.findMany({
    where: { slug: { in: slugs } },
    select: { id: true },
  })
  const productIds = products.map((product) => product.id)
  if (productIds.length === 0) return null

  const bounds = resolveRangeBounds(args.dateRange)
  if (!bounds) return null

  const includeAdvanced = args.includeAdvanced ?? true

  const dailyRows = await prisma.productTrafficDaily.findMany({
    where: {
      productId: { in: productIds },
      source: "cloudflare",
      date: { gte: bounds.start, lte: bounds.end },
    },
    orderBy: { date: "asc" },
  })

  const dailyByDate = new Map<
    string,
    { pageViews: number; uniqueVisitors: number }
  >()
  for (const row of dailyRows) {
    const key = dateKey(row.date)
    const current = dailyByDate.get(key) ?? {
      pageViews: 0,
      uniqueVisitors: 0,
    }
    dailyByDate.set(key, {
      pageViews: current.pageViews + row.pageViews,
      uniqueVisitors: current.uniqueVisitors + row.uniqueVisitors,
    })
  }

  let pageViews = 0
  let uniqueVisitors = 0
  let sessions = 0
  let newUsers = 0
  let returningVisitors = 0
  let bounceWeighted = 0
  let durationWeighted = 0

  for (const row of dailyRows) {
    pageViews += row.pageViews
    uniqueVisitors += row.uniqueVisitors
    sessions += row.sessions
    newUsers += row.newUsers
    returningVisitors += row.returningVisitors
    bounceWeighted += row.bounceRate * row.sessions
    durationWeighted += row.averageSessionDuration * row.sessions
  }

  const bounceRate = sessions > 0 ? bounceWeighted / sessions : 0
  const averageSessionDuration = sessions > 0 ? durationWeighted / sessions : 0

  const timeseries = []
  for (let i = 0; i < bounds.days; i += 1) {
    const date = addUtcDays(bounds.start, i)
    const key = dateKey(date)
    const row = dailyByDate.get(key)
    timeseries.push({
      date: date.toISOString(),
      label: format(date, "MMM d"),
      pageViews: row?.pageViews ?? 0,
      uniqueVisitors: row?.uniqueVisitors ?? 0,
    })
  }

  if (!includeAdvanced) {
    return {
      pageViews,
      uniqueVisitors,
      sessions,
      bounceRate,
      averageSessionDuration,
      newUsers,
      returningVisitors,
      browsers: [],
      operatingSystems: [],
      countries: [],
      cities: [],
      devices: [],
      timeseries,
    }
  }

  const [browserRows, osRows, deviceRows, countryRows] = await Promise.all([
    prisma.productTrafficBrowserDaily.groupBy({
      by: ["browser"],
      where: {
        productId: { in: productIds },
        source: "cloudflare",
        date: { gte: bounds.start, lte: bounds.end },
      },
      _sum: { visitors: true },
      orderBy: { _sum: { visitors: "desc" } },
      take: 8,
    }),
    prisma.productTrafficOperatingSystemDaily.groupBy({
      by: ["operatingSystem"],
      where: {
        productId: { in: productIds },
        source: "cloudflare",
        date: { gte: bounds.start, lte: bounds.end },
      },
      _sum: { visitors: true },
      orderBy: { _sum: { visitors: "desc" } },
      take: 8,
    }),
    prisma.productTrafficDeviceDaily.groupBy({
      by: ["deviceCategory"],
      where: {
        productId: { in: productIds },
        source: "cloudflare",
        date: { gte: bounds.start, lte: bounds.end },
      },
      _sum: { visitors: true },
      orderBy: { _sum: { visitors: "desc" } },
      take: 8,
    }),
    prisma.productTrafficCountryDaily.groupBy({
      by: ["country", "countryCode"],
      where: {
        productId: { in: productIds },
        source: "cloudflare",
        date: { gte: bounds.start, lte: bounds.end },
      },
      _sum: { visitors: true },
      orderBy: { _sum: { visitors: "desc" } },
      take: 8,
    }),
  ])

  const browsers = browserRows.map((row: ProductBrowserRow) => ({
    browser: row.browser,
    visitors: Number(row._sum.visitors ?? 0),
  }))

  const operatingSystems = osRows.map((row: ProductOperatingSystemRow) => ({
    os: row.operatingSystem,
    visitors: Number(row._sum.visitors ?? 0),
  }))

  const devices = deviceRows.map((row: ProductDeviceRow) => ({
    deviceCategory: row.deviceCategory,
    visitors: Number(row._sum.visitors ?? 0),
  }))

  const countries = countryRows.map((row: ProductCountryRow) => {
    const visitors = Number(row._sum.visitors ?? 0)
    return {
      country: row.country,
      code: row.countryCode || null,
      visitors,
      share: uniqueVisitors > 0 ? (visitors / uniqueVisitors) * 100 : 0,
    }
  })

  return {
    pageViews,
    uniqueVisitors,
    sessions,
    bounceRate,
    averageSessionDuration,
    newUsers,
    returningVisitors,
    browsers,
    operatingSystems,
    countries,
    cities: [],
    devices,
    timeseries,
  }
}

async function getProductTrafficMapFromDb(args: {
  products: Array<{ id: string; slug: string }>
  dateRange: AnalyticsDateRange
}): Promise<Map<
  string,
  { pageViews: number; uniqueVisitors: number; sessions: number }
> | null> {
  const bounds = resolveRangeBounds(args.dateRange)
  if (!bounds) return null

  const productIds = Array.from(
    new Set(args.products.map((product) => product.id).filter(Boolean)),
  )
  if (!productIds.length) {
    return new Map()
  }

  const rows = await prisma.productTrafficDaily.groupBy({
    by: ["productId"],
    where: {
      productId: { in: productIds },
      source: "cloudflare",
      date: { gte: bounds.start, lte: bounds.end },
    },
    _sum: {
      pageViews: true,
      uniqueVisitors: true,
      sessions: true,
    },
  })

  const results = new Map<
    string,
    { pageViews: number; uniqueVisitors: number; sessions: number }
  >()

  for (const productId of productIds) {
    results.set(productId, { pageViews: 0, uniqueVisitors: 0, sessions: 0 })
  }

  for (const row of rows) {
    const pageViews = Number(row._sum.pageViews ?? 0)
    const uniqueVisitors = Number(row._sum.uniqueVisitors ?? 0)
    const sessions = Number(row._sum.sessions ?? 0)
    results.set(row.productId, { pageViews, uniqueVisitors, sessions })
  }

  return results
}

async function getHomepageTrafficFromDb(): Promise<HomepageTraffic | null> {
  const reportingWindow = await getAvailableSiteAnalyticsReportingWindow()
  const snapshot = await getSiteAnalyticsSnapshotFromDb({
    dateRange: {
      startDate: reportingWindow.startDate,
      endDate: reportingWindow.endDate,
    },
  })
  if (!snapshot) return null

  return {
    windowDays: reportingWindow.days,
    pageViews: snapshot.pageViews,
    visitors: snapshot.uniqueVisitors,
    trafficSeries: snapshot.timeseries.map((point) => ({
      date: point.date,
      pageViews: point.pageViews,
      visitors: point.uniqueVisitors,
    })),
  }
}

export const dbAnalyticsProvider: AnalyticsProvider = {
  async getProductTraffic(args) {
    return (await getProductTrafficFromDb(args)) ?? emptyProductTrafficSummary()
  },
  async getProductTrafficMap(args) {
    return (
      (await getProductTrafficMapFromDb(args)) ??
      emptyProductTrafficMap(args.products)
    )
  },
  async getSiteAnalyticsSnapshot(args) {
    return (
      (await getSiteAnalyticsSnapshotFromDb(args)) ??
      emptySiteAnalyticsSnapshot()
    )
  },
  async getHomepageTraffic() {
    return (
      (await getHomepageTrafficFromDb()) ?? {
        windowDays: 1,
        pageViews: 0,
        visitors: 0,
        trafficSeries: [],
      }
    )
  },
}

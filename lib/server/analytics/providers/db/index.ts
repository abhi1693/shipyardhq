import { format, subDays } from "date-fns"

import prisma from "@/lib/prisma"
import { productPath } from "@/lib/routes"
import type {
  AnalyticsDateRange,
  AnalyticsProvider,
  ProductTrafficSummary,
} from "@/lib/server/analytics/providerTypes"
import { gaAnalyticsProvider } from "@/lib/server/analytics/providers/ga"
import { extractProductSlug } from "@/lib/server/analytics/providers/ga/helpers"

type IngestionJobKey =
  | "product_traffic_daily"
  | "product_traffic_breakdowns"
  | "site_traffic_daily"
  | "site_traffic_breakdowns"

type RangeBounds = {
  start: Date
  end: Date
  days: number
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
      (orderedEnd.getTime() - orderedStart.getTime()) /
        (1000 * 60 * 60 * 24),
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

function resolveSlugFromPaths(pagePaths: string[]): string | null {
  const slugs = new Set(
    pagePaths.map((path) => extractProductSlug(path)).filter(Boolean),
  )
  if (slugs.size !== 1) return null
  return Array.from(slugs.values())[0] ?? null
}

async function hasIngestionCoverage(
  job: IngestionJobKey,
  bounds: RangeBounds,
): Promise<boolean> {
  const run = await prisma.analyticsIngestionRun.findFirst({
    where: {
      source: "ga4",
      job,
      status: "completed",
      windowStart: { lte: bounds.start },
      windowEnd: { gte: bounds.end },
    },
    select: { id: true },
    orderBy: { finishedAt: "desc" },
  })

  return Boolean(run)
}

function defaultSiteDateRange(): AnalyticsDateRange {
  const end = subDays(new Date(), 0)
  const start = subDays(end, 29)
  return {
    startDate: format(start, "yyyy-MM-dd"),
    endDate: format(end, "yyyy-MM-dd"),
  }
}

async function getSiteAnalyticsSnapshotFromDb(args?: {
  dateRange?: AnalyticsDateRange
  topProductLimit?: number
}) {
  const requestedRange = args?.dateRange ?? defaultSiteDateRange()
  const bounds = resolveRangeBounds(requestedRange)
  if (!bounds) return null

  const [hasSiteDaily, hasSiteBreakdowns, hasProductDaily] =
    await Promise.all([
      hasIngestionCoverage("site_traffic_daily", bounds),
      hasIngestionCoverage("site_traffic_breakdowns", bounds),
      hasIngestionCoverage("product_traffic_daily", bounds),
    ])

  if (!hasSiteDaily || !hasSiteBreakdowns || !hasProductDaily) {
    return null
  }

  const dailyRows = await prisma.siteTrafficDaily.findMany({
    where: {
      source: "ga4",
      date: { gte: bounds.start, lte: bounds.end },
    },
    orderBy: { date: "asc" },
  })

  const dailyByDate = new Map<string, (typeof dailyRows)[number]>()
  for (const row of dailyRows) {
    dailyByDate.set(dateKey(row.date), row)
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
    referrerRows,
    browserRows,
    osRows,
    deviceRows,
    countryRows,
    regionRows,
    cityRows,
  ] = await Promise.all([
    prisma.siteTrafficReferrerDaily.groupBy({
      by: ["referrer"],
      where: {
        source: "ga4",
        date: { gte: bounds.start, lte: bounds.end },
      },
      _sum: { pageViews: true },
      orderBy: { _sum: { pageViews: "desc" } },
      take: 12,
    }),
    prisma.siteTrafficBrowserDaily.groupBy({
      by: ["browser"],
      where: {
        source: "ga4",
        date: { gte: bounds.start, lte: bounds.end },
      },
      _sum: { visitors: true },
      orderBy: { _sum: { visitors: "desc" } },
      take: 8,
    }),
    prisma.siteTrafficOperatingSystemDaily.groupBy({
      by: ["operatingSystem"],
      where: {
        source: "ga4",
        date: { gte: bounds.start, lte: bounds.end },
      },
      _sum: { visitors: true },
      orderBy: { _sum: { visitors: "desc" } },
      take: 8,
    }),
    prisma.siteTrafficDeviceDaily.groupBy({
      by: ["deviceCategory"],
      where: {
        source: "ga4",
        date: { gte: bounds.start, lte: bounds.end },
      },
      _sum: { visitors: true },
      orderBy: { _sum: { visitors: "desc" } },
      take: 5,
    }),
    prisma.siteTrafficCountryDaily.groupBy({
      by: ["country", "countryCode"],
      where: {
        source: "ga4",
        date: { gte: bounds.start, lte: bounds.end },
      },
      _sum: { visitors: true },
      orderBy: { _sum: { visitors: "desc" } },
      take: 10,
    }),
    prisma.siteTrafficRegionDaily.groupBy({
      by: ["region", "country", "countryCode"],
      where: {
        source: "ga4",
        date: { gte: bounds.start, lte: bounds.end },
      },
      _sum: { visitors: true },
      orderBy: { _sum: { visitors: "desc" } },
      take: 10,
    }),
    prisma.siteTrafficCityDaily.groupBy({
      by: ["city", "region", "country", "countryCode"],
      where: {
        source: "ga4",
        date: { gte: bounds.start, lte: bounds.end },
      },
      _sum: { visitors: true },
      orderBy: { _sum: { visitors: "desc" } },
      take: 10,
    }),
  ])

  const referrers = referrerRows.map((row) => {
    const views = Number(row._sum.pageViews ?? 0)
    return {
      referrer: row.referrer,
      views,
      share: pageViews > 0 ? (views / pageViews) * 100 : 0,
    }
  })

  const browsers = browserRows.map((row) => {
    const visitors = Number(row._sum.visitors ?? 0)
    return {
      browser: row.browser,
      visitors,
      share: uniqueVisitors > 0 ? (visitors / uniqueVisitors) * 100 : 0,
    }
  })

  const operatingSystems = osRows.map((row) => {
    const visitors = Number(row._sum.visitors ?? 0)
    return {
      os: row.operatingSystem,
      visitors,
      share: uniqueVisitors > 0 ? (visitors / uniqueVisitors) * 100 : 0,
    }
  })

  const devices = deviceRows.map((row) => {
    const visitors = Number(row._sum.visitors ?? 0)
    return {
      deviceCategory: row.deviceCategory,
      visitors,
      share: uniqueVisitors > 0 ? (visitors / uniqueVisitors) * 100 : 0,
    }
  })

  const countries = countryRows.map((row) => {
    const visitors = Number(row._sum.visitors ?? 0)
    return {
      country: row.country,
      code: row.countryCode || null,
      visitors,
      share: uniqueVisitors > 0 ? (visitors / uniqueVisitors) * 100 : 0,
    }
  })

  const regions = regionRows.map((row) => {
    const visitors = Number(row._sum.visitors ?? 0)
    return {
      region: row.region,
      country: row.country || null,
      code: row.countryCode || null,
      visitors,
      share: uniqueVisitors > 0 ? (visitors / uniqueVisitors) * 100 : 0,
    }
  })

  const cities = cityRows.map((row) => {
    const visitors = Number(row._sum.visitors ?? 0)
    return {
      city: row.city,
      region: row.region || null,
      country: row.country || null,
      code: row.countryCode || null,
      visitors,
      share: uniqueVisitors > 0 ? (visitors / uniqueVisitors) * 100 : 0,
    }
  })

  const topProductLimit = Math.max(1, args?.topProductLimit ?? 6)
  const topProductCandidates = await prisma.productTrafficDaily.groupBy({
    by: ["productId"],
    where: {
      source: "ga4",
      date: { gte: bounds.start, lte: bounds.end },
    },
    _sum: { pageViews: true },
    orderBy: { _sum: { pageViews: "desc" } },
    take: Math.max(topProductLimit, 1),
  })

  const candidateIds = topProductCandidates.map((row) => row.productId)
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
          source: "ga4",
          date: { gte: bounds.start, lte: bounds.end },
        },
      }),
      prisma.product.findMany({
        where: { id: { in: candidateIds } },
        select: { id: true, slug: true },
      }),
    ])

    const slugById = new Map(
      products.map((product) => [product.id, product.slug]),
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
      .map(([productId, metrics]) => {
        const slug = slugById.get(productId) ?? null
        if (!slug) return null
        const bounceRateValue =
          metrics.sessions > 0
            ? metrics.bounceWeighted / metrics.sessions
            : 0
        const avgSessionDuration =
          metrics.sessions > 0
            ? metrics.durationWeighted / metrics.sessions
            : 0
        return {
          path: productPath(slug),
          slug,
          pageViews: metrics.pageViews,
          uniqueVisitors: metrics.uniqueVisitors,
          sessions: metrics.sessions,
          bounceRate: bounceRateValue,
          averageSessionDuration: avgSessionDuration,
          shareOfViews: pageViews > 0 ? (metrics.pageViews / pageViews) * 100 : 0,
        }
      })
      .filter(
        (
          entry,
        ): entry is {
          path: string
          slug: string | null
          pageViews: number
          uniqueVisitors: number
          sessions: number
          bounceRate: number
          averageSessionDuration: number
          shareOfViews: number
        } => Boolean(entry),
      )
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

async function getProductTrafficFromDb(args: {
  pagePaths: string[]
  dateRange: AnalyticsDateRange
  includeAdvanced?: boolean
}): Promise<ProductTrafficSummary | null> {
  const slug = resolveSlugFromPaths(args.pagePaths)
  if (!slug) return null

  const product = await prisma.product.findUnique({
    where: { slug },
    select: { id: true },
  })
  if (!product) return null

  const bounds = resolveRangeBounds(args.dateRange)
  if (!bounds) return null

  const hasDailyCoverage = await hasIngestionCoverage(
    "product_traffic_daily",
    bounds,
  )
  if (!hasDailyCoverage) return null

  const includeAdvanced = args.includeAdvanced ?? true
  const hasBreakdownCoverage = includeAdvanced
    ? await hasIngestionCoverage("product_traffic_breakdowns", bounds)
    : false

  if (includeAdvanced && !hasBreakdownCoverage) {
    return null
  }

  const dailyRows = await prisma.productTrafficDaily.findMany({
    where: {
      productId: product.id,
      source: "ga4",
      date: { gte: bounds.start, lte: bounds.end },
    },
    orderBy: { date: "asc" },
  })

  const dailyByDate = new Map<string, (typeof dailyRows)[number]>()
  for (const row of dailyRows) {
    dailyByDate.set(dateKey(row.date), row)
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
      referrers: [],
      referrerCategories: [],
      browsers: [],
      operatingSystems: [],
      countries: [],
      cities: [],
      devices: [],
      timeseries,
    }
  }

  const [
    referrerRows,
    channelRows,
    browserRows,
    osRows,
    deviceRows,
    countryRows,
    cityRows,
  ] = await Promise.all([
    prisma.productTrafficReferrerDaily.groupBy({
      by: ["referrer"],
      where: {
        productId: product.id,
        source: "ga4",
        date: { gte: bounds.start, lte: bounds.end },
      },
      _sum: { pageViews: true },
      orderBy: { _sum: { pageViews: "desc" } },
      take: 8,
    }),
    prisma.productTrafficChannelDaily.groupBy({
      by: ["channel"],
      where: {
        productId: product.id,
        source: "ga4",
        date: { gte: bounds.start, lte: bounds.end },
      },
      _sum: { pageViews: true },
      orderBy: { _sum: { pageViews: "desc" } },
      take: 8,
    }),
    prisma.productTrafficBrowserDaily.groupBy({
      by: ["browser"],
      where: {
        productId: product.id,
        source: "ga4",
        date: { gte: bounds.start, lte: bounds.end },
      },
      _sum: { visitors: true },
      orderBy: { _sum: { visitors: "desc" } },
      take: 8,
    }),
    prisma.productTrafficOperatingSystemDaily.groupBy({
      by: ["operatingSystem"],
      where: {
        productId: product.id,
        source: "ga4",
        date: { gte: bounds.start, lte: bounds.end },
      },
      _sum: { visitors: true },
      orderBy: { _sum: { visitors: "desc" } },
      take: 8,
    }),
    prisma.productTrafficDeviceDaily.groupBy({
      by: ["deviceCategory"],
      where: {
        productId: product.id,
        source: "ga4",
        date: { gte: bounds.start, lte: bounds.end },
      },
      _sum: { visitors: true },
      orderBy: { _sum: { visitors: "desc" } },
      take: 8,
    }),
    prisma.productTrafficCountryDaily.groupBy({
      by: ["country", "countryCode"],
      where: {
        productId: product.id,
        source: "ga4",
        date: { gte: bounds.start, lte: bounds.end },
      },
      _sum: { visitors: true },
      orderBy: { _sum: { visitors: "desc" } },
      take: 8,
    }),
    prisma.productTrafficCityDaily.groupBy({
      by: ["city", "region", "country", "countryCode"],
      where: {
        productId: product.id,
        source: "ga4",
        date: { gte: bounds.start, lte: bounds.end },
      },
      _sum: { visitors: true },
      orderBy: { _sum: { visitors: "desc" } },
      take: 8,
    }),
  ])

  const referrers = referrerRows.map((row) => {
    const views = Number(row._sum.pageViews ?? 0)
    return {
      referrer: row.referrer,
      views,
      share: pageViews > 0 ? (views / pageViews) * 100 : 0,
    }
  })

  const referrerCategories = channelRows.map((row) => {
    const views = Number(row._sum.pageViews ?? 0)
    return {
      category: row.channel,
      views,
      share: pageViews > 0 ? (views / pageViews) * 100 : 0,
    }
  })

  const browsers = browserRows.map((row) => ({
    browser: row.browser,
    visitors: Number(row._sum.visitors ?? 0),
  }))

  const operatingSystems = osRows.map((row) => ({
    os: row.operatingSystem,
    visitors: Number(row._sum.visitors ?? 0),
  }))

  const devices = deviceRows.map((row) => ({
    deviceCategory: row.deviceCategory,
    visitors: Number(row._sum.visitors ?? 0),
  }))

  const countries = countryRows.map((row) => {
    const visitors = Number(row._sum.visitors ?? 0)
    return {
      country: row.country,
      code: row.countryCode || null,
      visitors,
      share: uniqueVisitors > 0 ? (visitors / uniqueVisitors) * 100 : 0,
    }
  })

  const cities = cityRows.map((row) => ({
    city: row.city,
    region: row.region || null,
    country: row.country || null,
    code: row.countryCode || null,
    visitors: Number(row._sum.visitors ?? 0),
  }))

  return {
    pageViews,
    uniqueVisitors,
    sessions,
    bounceRate,
    averageSessionDuration,
    newUsers,
    returningVisitors,
    referrers,
    referrerCategories,
    browsers,
    operatingSystems,
    countries,
    cities,
    devices,
    timeseries,
  }
}

async function getProductTrafficMapFromDb(args: {
  products: Array<{ id: string; slug: string }>
  dateRange: AnalyticsDateRange
}): Promise<Map<string, { pageViews: number; uniqueVisitors: number; sessions: number }> | null> {
  const bounds = resolveRangeBounds(args.dateRange)
  if (!bounds) return null

  const hasDailyCoverage = await hasIngestionCoverage(
    "product_traffic_daily",
    bounds,
  )
  if (!hasDailyCoverage) return null

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
      source: "ga4",
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

export const dbAnalyticsProvider: AnalyticsProvider = {
  async getProductTraffic(args) {
    try {
      const dbResult = await getProductTrafficFromDb(args)
      if (dbResult) {
        return dbResult
      }
    } catch (error) {
      console.error("[analytics] DB product traffic lookup failed", { error })
    }
    return gaAnalyticsProvider.getProductTraffic(args)
  },
  async getProductTrafficMap(args) {
    try {
      const dbResult = await getProductTrafficMapFromDb(args)
      if (dbResult) {
        return dbResult
      }
    } catch (error) {
      console.error("[analytics] DB traffic map lookup failed", { error })
    }
    return gaAnalyticsProvider.getProductTrafficMap(args)
  },
  async getSiteAnalyticsSnapshot(args) {
    try {
      const dbResult = await getSiteAnalyticsSnapshotFromDb(args)
      if (dbResult) {
        return dbResult
      }
    } catch (error) {
      console.error("[analytics] DB site snapshot lookup failed", { error })
    }
    return gaAnalyticsProvider.getSiteAnalyticsSnapshot(args)
  },
  getHomepageTraffic: () => gaAnalyticsProvider.getHomepageTraffic(),
  getRealtimeVisitors: () => gaAnalyticsProvider.getRealtimeVisitors(),
}

export function createDbAnalyticsProvider(): AnalyticsProvider {
  return dbAnalyticsProvider
}

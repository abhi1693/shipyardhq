import { format, startOfDay, subDays } from "date-fns"

import { ANALYTICS_REPORTING_WINDOW_DAYS } from "@/lib/analytics/reportingWindow"
import prisma from "@/lib/prisma"
import { productPath } from "@/lib/routes"
import type {
  AnalyticsDateRange,
  ProductTrafficSummary as ProviderProductTrafficSummary,
} from "@/lib/server/analytics/providerTypes"
import { getAvailableProductAnalyticsReportingWindow } from "@/lib/server/analytics/reportingWindow"
import { getAnalyticsProvider } from "@/lib/server/analytics/store"
import type {
  ProductTrafficAdvancedInsights,
  ProductTrafficSummary,
  ProductTrafficSummaryPoint,
} from "@/types/analytics"

type SummaryOptions = {
  rangeDays?: number
  includeAdvanced?: boolean
  productIds?: string[]
  previousComparison?: boolean
}

type AnalyticsSummary = ProviderProductTrafficSummary

function previousRange(range: AnalyticsDateRange): AnalyticsDateRange {
  const end = startOfDay(new Date(range.startDate))
  const spanDays =
    Math.max(
      Math.round(
        (startOfDay(new Date(range.endDate)).getTime() - end.getTime()) /
          (1000 * 60 * 60 * 24),
      ),
      0,
    ) + 1
  const prevEnd = subDays(end, 1)
  const prevStart = subDays(prevEnd, spanDays - 1)
  return {
    startDate: format(prevStart, "yyyy-MM-dd"),
    endDate: format(prevEnd, "yyyy-MM-dd"),
  }
}

function calcChange(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

function toSummaryPoints(timeseries: AnalyticsSummary["timeseries"]) {
  return timeseries.map<ProductTrafficSummaryPoint>((point) => ({
    date: point.date,
    label: point.label,
    views: point.pageViews,
    uniqueVisitors: point.uniqueVisitors,
  }))
}

function buildAdvanced(
  analytics: AnalyticsSummary,
): ProductTrafficAdvancedInsights {
  const regionTotals = analytics.cities.reduce((acc, entry) => {
    const region = entry.region || "Unknown region"
    const country = entry.country ?? null
    const key = `${country ?? "unknown"}|${region}`
    const current = acc.get(key) ?? { region, country, views: 0 }
    current.views += entry.visitors
    acc.set(key, current)
    return acc
  }, new Map<string, { region: string; country: string | null; views: number }>())

  return {
    uniqueVisitorsOverTime: toSummaryPoints(analytics.timeseries),
    pathBreakdown: [],
    osBreakdown: analytics.operatingSystems.map((os) => ({
      os: os.os,
      views: os.visitors,
    })),
    regionBreakdown: Array.from(regionTotals.values()).sort(
      (a, b) => b.views - a.views,
    ),
    cityBreakdown: analytics.cities.map((city) => ({
      country: city.country ?? null,
      region: city.region ?? null,
      city: city.city,
      views: city.visitors,
    })),
    newVsReturning: {
      newVisitors: analytics.newUsers,
      returningVisitors: analytics.returningVisitors,
      unknownVisitors: 0,
      returningRate:
        analytics.uniqueVisitors > 0
          ? (analytics.returningVisitors / analytics.uniqueVisitors) * 100
          : 0,
    },
    anomalies: [],
    topProducts: undefined,
  }
}

function buildSummary({
  analytics,
  previousAnalytics,
  rangeDays,
  upvotesInRange,
  previousUpvotes,
}: {
  analytics: AnalyticsSummary
  previousAnalytics: AnalyticsSummary | null
  rangeDays: number
  upvotesInRange: number
  previousUpvotes: number
}): ProductTrafficSummary {
  const totalViews = analytics.pageViews
  const previousViews = previousAnalytics?.pageViews ?? 0
  const uniqueVisitors = analytics.uniqueVisitors
  const previousUniqueVisitors = previousAnalytics?.uniqueVisitors ?? 0

  const viewsOverTime = toSummaryPoints(analytics.timeseries)
  const engagementsOverTime = viewsOverTime.map((point) => ({
    date: point.date,
    label: point.label,
    upvotes: 0,
  }))

  const viewsPreviousDay =
    viewsOverTime.length > 0 ? viewsOverTime[viewsOverTime.length - 1].views : 0
  const viewsInRange = viewsOverTime.reduce(
    (sum, point) => sum + point.views,
    0,
  )

  const deviceLabel = (device: string) => {
    switch (device) {
      case "desktop":
        return "Desktop"
      case "mobile":
        return "Mobile"
      case "tablet":
        return "Tablet"
      default:
        return "Unknown device"
    }
  }

  const deviceBreakdown = analytics.devices.map((device) => ({
    device: device.deviceCategory as any,
    label: deviceLabel(device.deviceCategory),
    views: device.visitors,
  }))

  const summary: ProductTrafficSummary = {
    rangeDays,
    totalViews,
    previousViews,
    totalViewsChange: calcChange(totalViews, previousViews),
    uniqueVisitors,
    previousUniqueVisitors,
    uniqueVisitorsChange: calcChange(uniqueVisitors, previousUniqueVisitors),
    averageViewsPerDay:
      rangeDays > 0 ? Math.round((totalViews / rangeDays) * 10) / 10 : 0,
    viewsToday: viewsPreviousDay,
    viewsInRange,
    upvotesInRange,
    previousUpvotes,
    upvotesChange: calcChange(upvotesInRange, previousUpvotes),
    upvoteConversionRate:
      totalViews > 0 ? (upvotesInRange / totalViews) * 100 : 0,
    upvoteConversionRateChange: calcChange(upvotesInRange, previousUpvotes),
    botViews: 0,
    previousBotViews: 0,
    topCountry: analytics.countries[0]
      ? {
          country: analytics.countries[0].country,
          views: analytics.countries[0].visitors,
        }
      : undefined,
    viewsOverTime,
    deviceBreakdown,
    countryBreakdown: analytics.countries.map((country) => ({
      country: country.country,
      views: country.visitors,
    })),
    browserBreakdown: analytics.browsers.map((browser) => ({
      browser: browser.browser,
      views: browser.visitors,
    })),
    userAgentBreakdown: [],
    engagementOverTime: engagementsOverTime,
    advanced: buildAdvanced(analytics),
    filters: { includeBots: false },
  }

  return summary
}

async function countUpvotes(
  productIds: string[],
  range: AnalyticsDateRange,
): Promise<number> {
  const start = new Date(range.startDate)
  const end = startOfDay(new Date(range.endDate))
  const rangeEnd = subDays(end, -1)
  return prisma.productUpvote.count({
    where: {
      productId: { in: productIds },
      createdAt: { gte: start, lt: rangeEnd },
    },
  })
}

export async function getProductTrafficSummary(
  productId: string,
  options: SummaryOptions = {},
): Promise<ProductTrafficSummary> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { slug: true },
  })
  if (!product) {
    throw new Error(`Product not found for id ${productId}`)
  }

  const maxRangeDays = Math.max(
    options.rangeDays ?? ANALYTICS_REPORTING_WINDOW_DAYS,
    1,
  )
  const reportingWindow = await getAvailableProductAnalyticsReportingWindow({
    includeAdvanced: options.includeAdvanced ?? true,
    maxDays: maxRangeDays,
  })
  const rangeDays = reportingWindow.days
  const dateRange = {
    startDate: reportingWindow.startDate,
    endDate: reportingWindow.endDate,
  }
  const prevRange =
    options.previousComparison === false ? null : previousRange(dateRange)

  const pagePaths = [productPath(product.slug), `${productPath(product.slug)}/`]

  const analyticsProvider = getAnalyticsProvider("cache")

  const [analytics, previousAnalytics, upvotesInRange, previousUpvotes] =
    await Promise.all([
      analyticsProvider.getProductTraffic({
        pagePaths,
        dateRange,
        includeAdvanced: options.includeAdvanced,
      }),
      prevRange
        ? analyticsProvider.getProductTraffic({
            pagePaths,
            dateRange: prevRange,
            includeAdvanced: options.includeAdvanced,
          })
        : Promise.resolve(null),
      countUpvotes([productId], dateRange),
      prevRange ? countUpvotes([productId], prevRange) : Promise.resolve(0),
    ])

  return buildSummary({
    analytics,
    previousAnalytics,
    rangeDays,
    upvotesInRange,
    previousUpvotes,
  })
}

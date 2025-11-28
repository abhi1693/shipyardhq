import { format, startOfDay, subDays } from "date-fns"

import prisma from "@/lib/prisma"
import { productPath } from "@/lib/routes"
import {
  type GaDateRange,
  getProductTrafficFromGa,
} from "@/lib/server/analytics/googleAnalytics"
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

type GaSummary = Awaited<ReturnType<typeof getProductTrafficFromGa>>

function emptyGaSummary(): GaSummary {
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

function buildDateRange(rangeDays: number): GaDateRange {
  const now = startOfDay(new Date())
  const start = subDays(now, Math.max(rangeDays - 1, 0))
  return {
    startDate: format(start, "yyyy-MM-dd"),
    endDate: format(now, "yyyy-MM-dd"),
  }
}

function previousRange(range: GaDateRange): GaDateRange {
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

function toSummaryPoints(timeseries: GaSummary["timeseries"]) {
  return timeseries.map<ProductTrafficSummaryPoint>((point) => ({
    date: point.date,
    label: point.label,
    views: point.pageViews,
    uniqueVisitors: point.uniqueVisitors,
  }))
}

function buildAdvanced(
  ga: GaSummary,
  rangeDays: number,
): ProductTrafficAdvancedInsights {
  return {
    uniqueVisitorsOverTime: toSummaryPoints(ga.timeseries),
    pathBreakdown: [],
    osBreakdown: ga.operatingSystems.map((os) => ({
      os: os.os,
      views: os.visitors,
    })),
    regionBreakdown: ga.regions.map((region) => ({
      country: region.country ?? null,
      region: region.region,
      views: region.visitors,
    })),
    cityBreakdown: ga.cities.map((city) => ({
      country: city.country ?? null,
      region: city.region ?? null,
      city: city.city,
      views: city.visitors,
    })),
    referrerCategoryBreakdown: ga.referrerCategories.map((entry) => ({
      category: entry.category,
      label: entry.category,
      views: entry.views,
    })),
    newVsReturning: {
      newVisitors: ga.newUsers,
      returningVisitors: ga.returningVisitors,
      unknownVisitors: 0,
      returningRate:
        ga.uniqueVisitors > 0
          ? (ga.returningVisitors / ga.uniqueVisitors) * 100
          : 0,
    },
    anomalies: [],
    topProducts: undefined,
    referrerProductMatrix: undefined,
  }
}

function buildSummary({
  ga,
  gaPrevious,
  rangeDays,
  upvotesInRange,
  previousUpvotes,
}: {
  ga: GaSummary
  gaPrevious: GaSummary | null
  rangeDays: number
  upvotesInRange: number
  previousUpvotes: number
}): ProductTrafficSummary {
  const totalViews = ga.pageViews
  const previousViews = gaPrevious?.pageViews ?? 0
  const uniqueVisitors = ga.uniqueVisitors
  const previousUniqueVisitors = gaPrevious?.uniqueVisitors ?? 0

  const viewsOverTime = toSummaryPoints(ga.timeseries)
  const engagementsOverTime = viewsOverTime.map((point) => ({
    date: point.date,
    label: point.label,
    upvotes: 0,
  }))

  const viewsToday =
    viewsOverTime.length > 0 ? viewsOverTime[viewsOverTime.length - 1].views : 0
  const viewsSevenDays = viewsOverTime
    .slice(-7)
    .reduce((sum, point) => sum + point.views, 0)

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

  const deviceBreakdown = ga.devices.map((device) => ({
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
    viewsToday,
    viewsSevenDays,
    upvotesInRange,
    previousUpvotes,
    upvotesChange: calcChange(upvotesInRange, previousUpvotes),
    upvoteConversionRate:
      totalViews > 0 ? (upvotesInRange / totalViews) * 100 : 0,
    upvoteConversionRateChange: calcChange(
      upvotesInRange,
      previousUpvotes,
    ),
    botViews: 0,
    previousBotViews: 0,
    topCountry: ga.countries[0]
      ? { country: ga.countries[0].country, views: ga.countries[0].visitors }
      : undefined,
    topReferrer: ga.referrers[0]
      ? { referrer: ga.referrers[0].referrer, views: ga.referrers[0].views }
      : undefined,
    viewsOverTime,
    deviceBreakdown,
    countryBreakdown: ga.countries.map((country) => ({
      country: country.country,
      views: country.visitors,
    })),
    browserBreakdown: ga.browsers.map((browser) => ({
      browser: browser.browser,
      views: browser.visitors,
    })),
    userAgentBreakdown: [],
    referrerBreakdown: ga.referrers.map((referrer) => ({
      referrer: referrer.referrer,
      views: referrer.views,
    })),
    engagementOverTime: engagementsOverTime,
    advanced: buildAdvanced(ga, rangeDays),
    filters: { includeBots: false },
  }

  return summary
}

async function countUpvotes(
  productIds: string[],
  range: GaDateRange,
): Promise<number> {
  const start = new Date(range.startDate)
  const end = startOfDay(new Date(range.endDate))
  const rangeEnd = subDays(end, -1)
  return prisma.productUpvote.count({
    where: { productId: { in: productIds }, createdAt: { gte: start, lt: rangeEnd } },
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

  const rangeDays = Math.max(options.rangeDays ?? 7, 1)
  const dateRange = buildDateRange(rangeDays)
  const prevRange = options.previousComparison === false ? null : previousRange(dateRange)

  const pagePaths = [productPath(product.slug), `${productPath(product.slug)}/`]

  const [ga, gaPrevious, upvotesInRange, previousUpvotes] = await Promise.all([
    getProductTrafficFromGa({
      pagePaths,
      dateRange,
      includeAdvanced: options.includeAdvanced,
    }),
    prevRange
      ? getProductTrafficFromGa({
          pagePaths,
          dateRange: prevRange,
          includeAdvanced: options.includeAdvanced,
        })
      : Promise.resolve(null),
    countUpvotes([productId], dateRange),
    prevRange ? countUpvotes([productId], prevRange) : Promise.resolve(0),
  ])

  return buildSummary({
    ga,
    gaPrevious,
    rangeDays,
    upvotesInRange,
    previousUpvotes,
  })
}

export async function getOrganizationTrafficSummary(
  organizationId: string,
  options: SummaryOptions = {},
): Promise<ProductTrafficSummary> {
  const products = await prisma.product.findMany({
    where: { organizationId },
    select: { id: true, slug: true },
  })
  const productIds = options.productIds ?? products.map((p) => p.id)
  const pagePaths = products
    .filter((p) => productIds.includes(p.id))
    .flatMap((p) => {
      const base = productPath(p.slug)
      return [base, `${base}/`]
    })

  const rangeDays = Math.max(options.rangeDays ?? 7, 1)
  const dateRange = buildDateRange(rangeDays)
  const prevRange = options.previousComparison === false ? null : previousRange(dateRange)

  if (pagePaths.length === 0) {
    const ga = emptyGaSummary()
    return buildSummary({
      ga,
      gaPrevious: null,
      rangeDays,
      upvotesInRange: 0,
      previousUpvotes: 0,
    })
  }

  const [ga, gaPrevious, upvotesInRange, previousUpvotes] = await Promise.all([
    getProductTrafficFromGa({
      pagePaths,
      dateRange,
      includeAdvanced: options.includeAdvanced,
    }),
    prevRange
      ? getProductTrafficFromGa({
          pagePaths,
          dateRange: prevRange,
          includeAdvanced: options.includeAdvanced,
        })
      : Promise.resolve(null),
    countUpvotes(productIds, dateRange),
    prevRange ? countUpvotes(productIds, prevRange) : Promise.resolve(0),
  ])

  return buildSummary({
    ga,
    gaPrevious,
    rangeDays,
    upvotesInRange,
    previousUpvotes,
  })
}

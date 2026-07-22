"use server"

import { addDays, format, formatISO, startOfDay, subDays } from "date-fns"
import { auth } from "@clerk/nextjs/server"

import { ANALYTICS_REPORTING_WINDOW_DAYS } from "@/lib/analytics/reportingWindow"
import prisma from "@/lib/prisma"
import { productPath } from "@/lib/routes"
import { getAvailableProductAnalyticsReportingWindow } from "@/lib/server/analytics/reportingWindow"
import { getAnalyticsProvider } from "@/lib/server/analytics/store"
import { requireActiveUserOrRedirect } from "@/lib/server/userStatus"
import type {
  ProductEngagementSummaryPoint,
  ProductTrafficSummaryPoint,
} from "@/types/analytics"

type UserRef = { id: string }

type MemberTrafficOverview = {
  rangeDays: number
  totalViews: number
  uniqueVisitors: number
  upvotesInRange: number
  websiteClicks: number
  viewsOverTime: ProductTrafficSummaryPoint[]
  engagementOverTime: ProductEngagementSummaryPoint[]
}

async function getCurrentUser(): Promise<UserRef> {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthenticated")
  const user = await requireActiveUserOrRedirect(userId)
  return { id: user.id }
}

function buildViewsOverTime({
  analyticsTimeseries,
  windowDays,
  today,
}: {
  analyticsTimeseries: Array<{
    date: string
    pageViews: number
    uniqueVisitors: number
  }>
  windowDays: number
  today: Date
}): ProductTrafficSummaryPoint[] {
  const totalsByDay = new Map<
    string,
    { views: number; uniqueVisitors: number }
  >()

  for (const point of analyticsTimeseries) {
    const dayKey = formatISO(startOfDay(new Date(point.date)), {
      representation: "date",
    })
    const current = totalsByDay.get(dayKey) ?? { views: 0, uniqueVisitors: 0 }
    totalsByDay.set(dayKey, {
      views: current.views + (point.pageViews ?? 0),
      uniqueVisitors: current.uniqueVisitors + (point.uniqueVisitors ?? 0),
    })
  }

  return Array.from({ length: windowDays }).map((_, index) => {
    const date = subDays(today, windowDays - 1 - index)
    const key = formatISO(date, { representation: "date" })
    const entry = totalsByDay.get(key)
    return {
      date: key,
      label: format(date, "MMM d"),
      views: entry?.views ?? 0,
      uniqueVisitors: entry?.uniqueVisitors ?? 0,
    }
  })
}

function buildEngagementOverTime({
  windowDays,
  today,
  upvotes,
}: {
  windowDays: number
  today: Date
  upvotes: Date[]
}): ProductEngagementSummaryPoint[] {
  const counts = new Map<string, { upvotes: number }>()

  for (const createdAt of upvotes) {
    const key = formatISO(startOfDay(createdAt), { representation: "date" })
    const entry = counts.get(key) ?? { upvotes: 0 }
    entry.upvotes += 1
    counts.set(key, entry)
  }

  return Array.from({ length: windowDays }).map((_, index) => {
    const date = subDays(today, windowDays - 1 - index)
    const key = formatISO(date, { representation: "date" })
    const entry = counts.get(key)
    return {
      date: key,
      label: format(date, "MMM d"),
      upvotes: entry?.upvotes ?? 0,
    }
  })
}

function buildEmptySummary(
  windowDays: number,
  today: Date,
): MemberTrafficOverview {
  const viewsOverTime = Array.from({ length: windowDays }).map((_, index) => {
    const date = subDays(today, windowDays - 1 - index)
    const key = formatISO(date, { representation: "date" })
    return {
      date: key,
      label: format(date, "MMM d"),
      views: 0,
      uniqueVisitors: 0,
    }
  })

  const engagementOverTime = viewsOverTime.map(({ date, label }) => ({
    date,
    label,
    upvotes: 0,
  }))

  return {
    rangeDays: windowDays,
    totalViews: 0,
    uniqueVisitors: 0,
    upvotesInRange: 0,
    websiteClicks: 0,
    viewsOverTime,
    engagementOverTime,
  }
}

async function getEngagementSummary({
  productIds,
  windowDays,
  today,
}: {
  productIds: string[]
  windowDays: number
  today: Date
}): Promise<{
  upvotes: number
  timeline: ProductEngagementSummaryPoint[]
}> {
  if (productIds.length === 0) {
    return {
      upvotes: 0,
      timeline: buildEngagementOverTime({
        windowDays,
        today,
        upvotes: [],
      }),
    }
  }

  const rangeStart = subDays(today, windowDays - 1)
  const rangeEnd = addDays(today, 1)

  const upvoteEvents = await prisma.productUpvote.findMany({
    where: {
      productId: { in: productIds },
      createdAt: { gte: rangeStart, lt: rangeEnd },
    },
    select: { createdAt: true },
  })

  const timeline = buildEngagementOverTime({
    windowDays,
    today,
    upvotes: upvoteEvents.map((event: { createdAt: Date }) => event.createdAt),
  })

  return {
    upvotes: upvoteEvents.length,
    timeline,
  }
}

export async function getMemberTrafficOverview(
  days = ANALYTICS_REPORTING_WINDOW_DAYS,
): Promise<MemberTrafficOverview> {
  const { id } = await getCurrentUser()
  const reportingWindow = await getAvailableProductAnalyticsReportingWindow({
    includeAdvanced: false,
    maxDays: Math.max(1, days),
  })
  const windowDays = reportingWindow.days
  const endDay = reportingWindow.end

  const products = await prisma.product.findMany({
    where: { userId: id },
    select: { id: true, slug: true },
  })

  if (products.length === 0) {
    return buildEmptySummary(windowDays, endDay)
  }

  const productIds = products.map((product: { id: string }) => product.id)
  const pagePaths = Array.from<string>(
    new Set<string>(
      products.flatMap(({ slug }: { slug: string }) => {
        const base = productPath(slug)
        return [base, `${base}/`]
      }),
    ),
  )

  const analyticsProvider = getAnalyticsProvider("cache")
  const [traffic, engagement, websiteClickAggregate] = await Promise.all([
    pagePaths.length
      ? analyticsProvider.getProductTraffic({
          pagePaths,
          dateRange: {
            startDate: reportingWindow.startDate,
            endDate: reportingWindow.endDate,
          },
          includeAdvanced: false,
        })
      : Promise.resolve(null),
    getEngagementSummary({ productIds, windowDays, today: endDay }),
    prisma.productAnalytics.aggregate({
      where: { productId: { in: productIds } },
      _sum: { websiteClicks: true },
    }),
  ])

  const viewsOverTime = buildViewsOverTime({
    analyticsTimeseries: traffic?.timeseries ?? [],
    windowDays,
    today: endDay,
  })

  return {
    rangeDays: windowDays,
    totalViews: traffic?.pageViews ?? 0,
    uniqueVisitors: traffic?.uniqueVisitors ?? 0,
    upvotesInRange: engagement.upvotes,
    websiteClicks: websiteClickAggregate._sum.websiteClicks ?? 0,
    viewsOverTime,
    engagementOverTime: engagement.timeline,
  }
}

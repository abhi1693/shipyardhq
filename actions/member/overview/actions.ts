"use server"

import { addDays, format, formatISO, startOfDay, subDays } from "date-fns"
import { auth } from "@clerk/nextjs/server"

import prisma from "@/lib/prisma"
import { productPath } from "@/lib/routes"
import { getProductTrafficFromGa } from "@/lib/server/analytics/googleAnalytics"
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
  viewsOverTime: ProductTrafficSummaryPoint[]
  engagementOverTime: ProductEngagementSummaryPoint[]
}

async function getCurrentUser(): Promise<UserRef> {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthenticated")
  const user = await requireActiveUserOrRedirect(userId)
  return { id: user.id }
}

function buildGaDateRange(windowDays: number, today: Date) {
  const end = today
  const start = subDays(end, windowDays - 1)
  return {
    startDate: format(start, "yyyy-MM-dd"),
    endDate: format(end, "yyyy-MM-dd"),
  }
}

function buildViewsOverTime({
  gaTimeseries,
  windowDays,
  today,
}: {
  gaTimeseries: Array<{
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

  for (const point of gaTimeseries) {
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
  days = 7,
): Promise<MemberTrafficOverview> {
  const { id } = await getCurrentUser()
  const windowDays = Math.max(1, days)
  const today = startOfDay(new Date())

  const products = await prisma.product.findMany({
    where: { userId: id },
    select: { id: true, slug: true },
  })

  if (products.length === 0) {
    return buildEmptySummary(windowDays, today)
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

  const [gaTraffic, engagement] = await Promise.all([
    pagePaths.length
      ? getProductTrafficFromGa({
          pagePaths,
          dateRange: buildGaDateRange(windowDays, today),
          includeAdvanced: false,
        })
      : Promise.resolve(null),
    getEngagementSummary({ productIds, windowDays, today }),
  ])

  const viewsOverTime = buildViewsOverTime({
    gaTimeseries: gaTraffic?.timeseries ?? [],
    windowDays,
    today,
  })

  return {
    rangeDays: windowDays,
    totalViews: gaTraffic?.pageViews ?? 0,
    uniqueVisitors: gaTraffic?.uniqueVisitors ?? 0,
    upvotesInRange: engagement.upvotes,
    viewsOverTime,
    engagementOverTime: engagement.timeline,
  }
}

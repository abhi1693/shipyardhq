import { format, formatISO, startOfDay, subDays } from "date-fns"

import prisma from "@/lib/prisma"
import type { DeviceCategory, ProductTrafficSummary } from "@/types/analytics"

interface SummaryOptions {
  rangeDays?: number
  previousComparison?: boolean
}

const DEVICE_ORDER: DeviceCategory[] = ["desktop", "mobile", "tablet", "unknown"]

function calcChange(current: number, previous: number) {
  if (previous === 0) {
    return current > 0 ? 100 : 0
  }
  return ((current - previous) / previous) * 100
}

function labelForDevice(device: DeviceCategory) {
  switch (device) {
    case "desktop":
      return "Desktop"
    case "mobile":
      return "Mobile"
    case "tablet":
      return "Tablet"
    default:
      return "Unknown"
  }
}

function labelForCountry(country?: string | null) {
  if (!country) return "Unknown"
  return country
}

function labelForReferrer(referrer?: string | null) {
  if (!referrer) return "Direct / None"
  try {
    const url = new URL(referrer)
    return url.hostname.replace(/^www\./, "")
  } catch {
    return referrer
  }
}

function labelForBrowser(browser?: string | null) {
  if (!browser) return "Unknown"
  return browser
}

export async function getProductTrafficSummary(
  productId: string,
  { rangeDays = 30, previousComparison = true }: SummaryOptions = {},
): Promise<ProductTrafficSummary> {
  const today = startOfDay(new Date())
  const rangeStart = subDays(today, rangeDays - 1)
  const previousStart = subDays(rangeStart, rangeDays)
  const previousEnd = subDays(rangeStart, 1)

  const events = await prisma.productTrafficEvent.findMany({
    where: {
      productId,
      createdAt: { gte: rangeStart },
    },
    select: {
      createdAt: true,
      device: true,
      browser: true,
      country: true,
      referrer: true,
      ipHash: true,
    },
  })

  const previousEvents = previousComparison
    ? await prisma.productTrafficEvent.findMany({
        where: {
          productId,
          createdAt: {
            gte: previousStart,
            lte: previousEnd,
          },
        },
        select: {
          createdAt: true,
          ipHash: true,
        },
      })
    : []

  const totalsByDay = new Map<string, number>()
  const deviceCounts = new Map<DeviceCategory, number>()
  const browserCounts = new Map<string, number>()
  const countryCounts = new Map<string, number>()
  const referrerCounts = new Map<string, number>()
  const uniqueHashes = new Set<string>()

  let anonymousUnique = 0
  let viewsToday = 0
  let viewsSevenDays = 0

  const lastSevenStart = subDays(today, 6)
  const todayKey = formatISO(today, { representation: "date" })

  for (const event of events) {
    const dayKey = formatISO(startOfDay(event.createdAt), {
      representation: "date",
    })
    totalsByDay.set(dayKey, (totalsByDay.get(dayKey) ?? 0) + 1)

    deviceCounts.set(event.device, (deviceCounts.get(event.device) ?? 0) + 1)

    const browserLabel = labelForBrowser(event.browser)
    browserCounts.set(browserLabel, (browserCounts.get(browserLabel) ?? 0) + 1)

    const countryLabel = labelForCountry(event.country)
    countryCounts.set(countryLabel, (countryCounts.get(countryLabel) ?? 0) + 1)

    const referrerLabel = labelForReferrer(event.referrer)
    referrerCounts.set(referrerLabel, (referrerCounts.get(referrerLabel) ?? 0) + 1)

    if (event.ipHash) {
      uniqueHashes.add(event.ipHash)
    } else {
      anonymousUnique += 1
    }

    if (dayKey === todayKey) {
      viewsToday += 1
    }
    if (event.createdAt >= lastSevenStart) {
      viewsSevenDays += 1
    }
  }

  const totalViews = events.length
  const uniqueVisitors = uniqueHashes.size + anonymousUnique

  let previousViews = 0
  let previousUnique = 0

  if (previousComparison && previousEvents.length) {
    const prevHashes = new Set<string>()
    let prevAnonymous = 0
    for (const prev of previousEvents) {
      previousViews += 1
      if (prev.ipHash) {
        prevHashes.add(prev.ipHash)
      } else {
        prevAnonymous += 1
      }
    }
    previousUnique = prevHashes.size + prevAnonymous
  } else {
    previousViews = 0
    previousUnique = 0
  }

  const viewsOverTime = Array.from({ length: rangeDays }).map((_, index) => {
    const date = subDays(today, rangeDays - 1 - index)
    const key = formatISO(date, { representation: "date" })
    return {
      date: key,
      label: format(date, "MMM d"),
      views: totalsByDay.get(key) ?? 0,
    }
  })

  const deviceBreakdown = DEVICE_ORDER.map((device) => ({
    device,
    label: labelForDevice(device),
    views: deviceCounts.get(device) ?? 0,
  }))
    .filter((entry) => entry.views > 0)
    .sort((a, b) => b.views - a.views)

  const countryBreakdown = Array.from(countryCounts.entries())
    .map(([country, count]) => ({ country, views: count }))
    .sort((a, b) => b.views - a.views)

  const browserBreakdown = Array.from(browserCounts.entries())
    .map(([browser, count]) => ({ browser, views: count }))
    .sort((a, b) => b.views - a.views)

  const referrerBreakdown = Array.from(referrerCounts.entries())
    .map(([referrer, count]) => ({ referrer, views: count }))
    .sort((a, b) => b.views - a.views)

  const averageViewsPerDay = rangeDays > 0 ? totalViews / rangeDays : 0
  const topCountry = countryBreakdown[0]
  const topReferrer = referrerBreakdown[0]

  return {
    rangeDays,
    totalViews,
    previousViews,
    totalViewsChange: calcChange(totalViews, previousViews),
    uniqueVisitors,
    previousUniqueVisitors: previousUnique,
    uniqueVisitorsChange: calcChange(uniqueVisitors, previousUnique),
    averageViewsPerDay,
    viewsToday,
    viewsSevenDays,
    topCountry: topCountry
      ? { country: topCountry.country, views: topCountry.views }
      : undefined,
    topReferrer: topReferrer
      ? { referrer: topReferrer.referrer, views: topReferrer.views }
      : undefined,
    viewsOverTime,
    deviceBreakdown,
    browserBreakdown,
    countryBreakdown,
    referrerBreakdown,
  }
}

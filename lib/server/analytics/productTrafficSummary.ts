import { format, formatISO, startOfDay, subDays } from "date-fns"

import prisma from "@/lib/prisma"
import { accelerateTags, DEFAULT_TTL, DEFAULT_SWR, TAGS } from "@/lib/cache"
import type {
  DeviceCategory,
  ProductTrafficAdvancedInsights,
  ProductTrafficAnomaly,
  ProductTrafficReferrerCategory,
  ProductTrafficSummary,
} from "@/types/analytics"
import type { Prisma } from "@/lib/vendor/prisma/client"

interface SummaryOptions {
  rangeDays?: number
  previousComparison?: boolean
  context?: "product" | "global"
  includeProductBreakdown?: boolean
  includeReferrerMatrix?: boolean
}

const DEVICE_ORDER: DeviceCategory[] = [
  "desktop",
  "mobile",
  "tablet",
  "unknown",
]

const SEARCH_HOSTS = new Set([
  "google.com",
  "bing.com",
  "duckduckgo.com",
  "yahoo.com",
  "baidu.com",
  "yandex.ru",
  "ask.com",
])

const SOCIAL_HOSTS = new Set([
  "twitter.com",
  "t.co",
  "facebook.com",
  "instagram.com",
  "linkedin.com",
  "lnkd.in",
  "reddit.com",
  "youtube.com",
  "threads.net",
  "pinterest.com",
  "producthunt.com",
  "medium.com",
])

const EMAIL_HOSTS = new Set([
  "mail.google.com",
  "outlook.live.com",
  "mail.yahoo.com",
  "mail.proton.me",
])

const MAX_PATH_BREAKDOWN = 10
const MAX_REGION_ITEMS = 8
const MAX_CITY_ITEMS = 8
const MAX_TOP_PRODUCTS = 10
const MAX_REFERRER_MATRIX_ROWS = 5
const MAX_PRODUCTS_PER_REFERRER = 5

const trafficCache = {
  ttl: DEFAULT_TTL.slow,
  swr: DEFAULT_SWR.slow,
}

const trafficTags = (...tags: string[]) =>
  accelerateTags(["adminAnalytics", "traffic", ...tags])

function extractProductId(
  where: Prisma.ProductTrafficEventWhereInput,
): string | undefined {
  const { productId } = where
  if (!productId) return undefined
  if (typeof productId === "string") return productId
  if (typeof (productId as Prisma.StringFilter).equals === "string") {
    return (productId as Prisma.StringFilter).equals as string
  }
  return undefined
}

function calcChange(current: number, previous: number) {
  if (previous === 0) {
    return current > 0 ? 100 : 0
  }
  return ((current - previous) / previous) * 100
}

function calcGrowth(current: number, previous: number) {
  if (previous === 0) {
    return current > 0 ? Number.POSITIVE_INFINITY : 0
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

function labelForBrowser(browser?: string | null) {
  if (!browser) return "Unknown"
  return browser
}

function labelForOs(os?: string | null) {
  if (!os || os.trim().length === 0) return "Unknown"
  return os
}

function labelForRegion(country?: string | null, region?: string | null) {
  if (!region || region.trim().length === 0) {
    return country ? `Unknown region — ${country}` : "Unknown"
  }
  return region
}

function labelForCity(
  country?: string | null,
  region?: string | null,
  city?: string | null,
) {
  if (!city || city.trim().length === 0) {
    return country ? `Unknown city — ${country}` : "Unknown"
  }
  return city
}

function truncateHash(hash: string) {
  return hash.length <= 8 ? hash : `${hash.slice(0, 6)}…`
}

function extractHost(referrer?: string | null) {
  if (!referrer) return null
  try {
    const url = new URL(referrer)
    return url.hostname.replace(/^www\./, "")
  } catch {
    return referrer
  }
}

function classifyReferrer(referrer?: string | null): {
  category: ProductTrafficReferrerCategory
  label: string
} {
  const host = extractHost(referrer)
  if (!host) {
    return { category: "direct", label: "Direct / None" }
  }

  if (SEARCH_HOSTS.has(host) || host.endsWith(".google.com")) {
    return { category: "search", label: host }
  }
  if (SOCIAL_HOSTS.has(host)) {
    return { category: "social", label: host }
  }
  if (EMAIL_HOSTS.has(host) || host.startsWith("mail.")) {
    return { category: "email", label: host }
  }

  return { category: "other", label: host }
}

async function buildTrafficSummary(
  where: Prisma.ProductTrafficEventWhereInput,
  options: SummaryOptions = {},
): Promise<ProductTrafficSummary> {
  const {
    rangeDays = 30,
    previousComparison = true,
    context = "product",
    includeProductBreakdown = context === "global",
    includeReferrerMatrix = context === "global",
  } = options

  const today = startOfDay(new Date())
  const windowDays = Math.max(rangeDays, 1)
  const rangeStart = subDays(today, windowDays - 1)
  const previousStart = subDays(rangeStart, windowDays)
  const previousEnd = subDays(rangeStart, 1)

  const productId = extractProductId(where)
  const contextTag = context === "global" ? "traffic_global" : "traffic_product"
  const baseTags = productId
    ? trafficTags(TAGS.analytics, contextTag, TAGS.product(productId))
    : trafficTags(TAGS.analytics, contextTag)

  const [events, previousEvents] = await Promise.all([
    prisma.productTrafficEvent.findMany({
      where: {
        ...where,
        createdAt: { gte: rangeStart },
      },
      select: {
        createdAt: true,
        device: true,
        browser: true,
        os: true,
        country: true,
        region: true,
        city: true,
        referrer: true,
        ipHash: true,
        path: true,
        productId: true,
      },
      cacheStrategy: {
        ...trafficCache,
        tags: baseTags,
      },
    }),
    previousComparison
      ? prisma.productTrafficEvent.findMany({
          where: {
            ...where,
            createdAt: {
              gte: previousStart,
              lte: previousEnd,
            },
          },
          select: {
            createdAt: true,
            ipHash: true,
            path: true,
            country: true,
            referrer: true,
            productId: true,
          },
          cacheStrategy: {
            ...trafficCache,
            tags: baseTags,
          },
        })
      : Promise.resolve([]),
  ])

  const totalsByDay = new Map<string, number>()
  const uniqueByDay = new Map<
    string,
    { hashed: Set<string>; anonymous: number }
  >()
  const deviceCounts = new Map<DeviceCategory, number>()
  const browserCounts = new Map<string, number>()
  const osCounts = new Map<string, number>()
  const countryCounts = new Map<string, number>()
  const regionCounts = new Map<string, number>()
  const cityCounts = new Map<string, number>()
  const referrerCounts = new Map<string, number>()
  const referrerCategoryCounts = new Map<
    ProductTrafficReferrerCategory,
    number
  >()
  const pathCounts = new Map<string, number>()
  const productCounts = new Map<string, number>()
  const referrerProductCounts = new Map<string, Map<string, number>>()
  const ipCountryCounts = new Map<
    string,
    { ipHash: string; country: string | null; count: number }
  >()
  const uniqueHashes = new Set<string>()

  const previousPathCounts = new Map<string, number>()
  const previousCountryCounts = new Map<string, number>()

  let anonymousUnique = 0
  let viewsToday = 0
  let viewsSevenDays = 0

  const lastSevenStart = subDays(today, 6)
  const todayKey = formatISO(today, { representation: "date" })

  for (const event of events) {
    const dayStart = startOfDay(event.createdAt)
    const dayKey = formatISO(dayStart, { representation: "date" })
    totalsByDay.set(dayKey, (totalsByDay.get(dayKey) ?? 0) + 1)

    const uniqueEntry = uniqueByDay.get(dayKey) ?? {
      hashed: new Set<string>(),
      anonymous: 0,
    }
    if (event.ipHash) {
      uniqueEntry.hashed.add(event.ipHash)
    } else {
      uniqueEntry.anonymous += 1
    }
    uniqueByDay.set(dayKey, uniqueEntry)

    deviceCounts.set(event.device, (deviceCounts.get(event.device) ?? 0) + 1)

    const browserLabel = labelForBrowser(event.browser)
    browserCounts.set(browserLabel, (browserCounts.get(browserLabel) ?? 0) + 1)

    const osLabel = labelForOs(event.os)
    osCounts.set(osLabel, (osCounts.get(osLabel) ?? 0) + 1)

    const rawCountry = event.country ?? ""
    const rawRegion = event.region ?? ""
    const rawCity = event.city ?? ""
    const countryLabel = labelForCountry(event.country)
    countryCounts.set(countryLabel, (countryCounts.get(countryLabel) ?? 0) + 1)

    const regionKey = `${rawCountry}::${rawRegion}`
    regionCounts.set(regionKey, (regionCounts.get(regionKey) ?? 0) + 1)

    const cityKey = `${rawCountry}::${rawRegion}::${rawCity}`
    cityCounts.set(cityKey, (cityCounts.get(cityKey) ?? 0) + 1)

    const { category, label: referrerLabel } = classifyReferrer(event.referrer)
    referrerCounts.set(
      referrerLabel,
      (referrerCounts.get(referrerLabel) ?? 0) + 1,
    )
    referrerCategoryCounts.set(
      category,
      (referrerCategoryCounts.get(category) ?? 0) + 1,
    )

    if (event.path) {
      pathCounts.set(event.path, (pathCounts.get(event.path) ?? 0) + 1)
    }

    if (event.ipHash) {
      uniqueHashes.add(event.ipHash)
      const ipKey = `${event.ipHash}|${countryLabel}`
      const ipEntry = ipCountryCounts.get(ipKey) ?? {
        ipHash: event.ipHash,
        country: event.country ?? null,
        count: 0,
      }
      ipEntry.count += 1
      ipCountryCounts.set(ipKey, ipEntry)
    } else {
      anonymousUnique += 1
    }

    if (dayKey === todayKey) {
      viewsToday += 1
    }
    if (event.createdAt >= lastSevenStart) {
      viewsSevenDays += 1
    }

    if (context === "global" && event.productId) {
      productCounts.set(
        event.productId,
        (productCounts.get(event.productId) ?? 0) + 1,
      )
      const productMap =
        referrerProductCounts.get(referrerLabel) ?? new Map<string, number>()
      productMap.set(
        event.productId,
        (productMap.get(event.productId) ?? 0) + 1,
      )
      referrerProductCounts.set(referrerLabel, productMap)
    }
  }

  for (const prev of previousEvents) {
    if (prev.path) {
      previousPathCounts.set(
        prev.path,
        (previousPathCounts.get(prev.path) ?? 0) + 1,
      )
    }
    const prevCountryLabel = labelForCountry(prev.country)
    previousCountryCounts.set(
      prevCountryLabel,
      (previousCountryCounts.get(prevCountryLabel) ?? 0) + 1,
    )
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
  }

  const viewsOverTime = Array.from({ length: windowDays }).map((_, index) => {
    const date = subDays(today, windowDays - 1 - index)
    const key = formatISO(date, { representation: "date" })
    const uniqueEntry = uniqueByDay.get(key)
    const uniqueCount = uniqueEntry
      ? uniqueEntry.hashed.size + uniqueEntry.anonymous
      : 0
    return {
      date: key,
      label: format(date, "MMM d"),
      views: totalsByDay.get(key) ?? 0,
      uniqueVisitors: uniqueCount,
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

  const pathBreakdown = Array.from(pathCounts.entries())
    .map(([path, count]) => {
      const previous = previousPathCounts.get(path) ?? 0
      const change = calcGrowth(count, previous)
      return {
        path,
        views: count,
        previousViews: previous,
        viewsChange: change,
      }
    })
    .sort((a, b) => b.views - a.views)
    .slice(0, MAX_PATH_BREAKDOWN)

  const osBreakdown = Array.from(osCounts.entries())
    .map(([os, count]) => ({ os, views: count }))
    .sort((a, b) => b.views - a.views)

  const regionBreakdown = Array.from(regionCounts.entries())
    .map(([key, count]) => {
      const [rawCountry, rawRegion] = key.split("::")
      const country = rawCountry.length ? rawCountry : null
      const region = labelForRegion(
        country,
        rawRegion.length ? rawRegion : null,
      )
      return { country, region, views: count }
    })
    .sort((a, b) => b.views - a.views)
    .slice(0, MAX_REGION_ITEMS)

  const cityBreakdown = Array.from(cityCounts.entries())
    .map(([key, count]) => {
      const [rawCountry, rawRegion, rawCity] = key.split("::")
      const country = rawCountry.length ? rawCountry : null
      const region = rawRegion.length ? rawRegion : null
      const city = labelForCity(
        country,
        region,
        rawCity.length ? rawCity : null,
      )
      return { country, region, city, views: count }
    })
    .sort((a, b) => b.views - a.views)
    .slice(0, MAX_CITY_ITEMS)

  const referrerCategoryBreakdown = Array.from(referrerCategoryCounts.entries())
    .map(([category, count]) => {
      const labelMap: Record<ProductTrafficReferrerCategory, string> = {
        direct: "Direct",
        search: "Search",
        social: "Social",
        email: "Email",
        other: "Other",
      }
      return {
        category,
        label: labelMap[category],
        views: count,
      }
    })
    .sort((a, b) => b.views - a.views)

  let returningVisitors = 0
  if (uniqueHashes.size) {
    const returning = await prisma.productTrafficEvent.findMany({
      where: {
        ...where,
        ipHash: { in: Array.from(uniqueHashes) },
        createdAt: { lt: rangeStart },
      },
      select: { ipHash: true },
      distinct: ["ipHash"],
      cacheStrategy: {
        ...trafficCache,
        tags: baseTags,
      },
    })
    returningVisitors = returning.length
  }

  const hashedUnique = uniqueHashes.size
  const newVisitors = Math.max(hashedUnique - returningVisitors, 0)
  const newVsReturning = {
    newVisitors,
    returningVisitors,
    unknownVisitors: anonymousUnique,
    returningRate: hashedUnique > 0 ? returningVisitors / hashedUnique : 0,
  }

  const anomalies: ProductTrafficAnomaly[] = []

  for (const entry of ipCountryCounts.values()) {
    const share = totalViews > 0 ? entry.count / totalViews : 0
    if (entry.count >= 10 && share >= 0.2) {
      const countryLabel = labelForCountry(entry.country)
      anomalies.push({
        type: "ip-spike",
        key: `${truncateHash(entry.ipHash)}@${countryLabel}`,
        description: `IP hash ${truncateHash(entry.ipHash)} from ${countryLabel} generated ${entry.count} views (${Math.round(share * 100)}%).`,
        metric: "views",
        magnitude: entry.count,
        share,
      })
    }
  }

  for (const path of pathBreakdown) {
    const change = path.viewsChange
    if (
      (path.previousViews >= 10 && change >= 150) ||
      (path.previousViews === 0 && path.views >= 20)
    ) {
      const share = totalViews > 0 ? path.views / totalViews : 0
      anomalies.push({
        type: "path-surge",
        key: path.path,
        description: `Path ${path.path} spiked to ${path.views} views in this window.`,
        metric: "viewsChange",
        magnitude: Number.isFinite(change) ? change : Number.POSITIVE_INFINITY,
        share,
      })
    }
  }

  if (previousComparison && previousEvents.length) {
    for (const [country, views] of countryCounts.entries()) {
      if (country === "Unknown") continue
      const prev = previousCountryCounts.get(country) ?? 0
      const currentShare = totalViews > 0 ? views / totalViews : 0
      const previousShare = previousViews > 0 ? prev / previousViews : 0
      const shareDelta = (currentShare - previousShare) * 100
      if (views >= 20 && shareDelta >= 30) {
        anomalies.push({
          type: "geo-surge",
          key: country,
          description: `${country} now represents ${Math.round(currentShare * 100)}% of traffic (up ${shareDelta.toFixed(1)} pts).`,
          metric: "shareDelta",
          magnitude: shareDelta,
          share: currentShare,
        })
      }
    }
  }

  let topProducts: ProductTrafficAdvancedInsights["topProducts"] = undefined
  let referrerProductMatrix: ProductTrafficAdvancedInsights["referrerProductMatrix"] =
    undefined

  const productLookupIds = new Set<string>()

  if (context === "global") {
    const sortedProductEntries = Array.from(productCounts.entries()).sort(
      (a, b) => b[1] - a[1],
    )
    if (includeProductBreakdown) {
      const topEntries = sortedProductEntries.slice(0, MAX_TOP_PRODUCTS)
      for (const [productId] of topEntries) {
        productLookupIds.add(productId)
      }
      topProducts = topEntries.map(([productId, views]) => ({
        productId,
        productName: undefined,
        views,
        share: totalViews > 0 ? views / totalViews : 0,
      }))
    }

    if (includeReferrerMatrix) {
      const topReferrers = referrerBreakdown
        .slice(0, MAX_REFERRER_MATRIX_ROWS)
        .map((entry) => entry.referrer)

      const matrixRows = topReferrers.map((referrer) => {
        const productMap = referrerProductCounts.get(referrer)
        const productEntries = productMap
          ? Array.from(productMap.entries()).sort((a, b) => b[1] - a[1])
          : []
        const topProductEntries = productEntries.slice(
          0,
          MAX_PRODUCTS_PER_REFERRER,
        )
        for (const [productId] of topProductEntries) {
          productLookupIds.add(productId)
        }
        return {
          referrer,
          views: referrerCounts.get(referrer) ?? 0,
          products: topProductEntries,
        }
      })

      referrerProductMatrix = matrixRows.map((row) => ({
        referrer: row.referrer,
        views: row.views,
        topProducts: row.products.map(([productId, views]) => ({
          productId,
          productName: undefined,
          views,
        })),
      }))
    }
  }

  let productNameMap = new Map<string, string>()
  if (productLookupIds.size) {
    const products = await prisma.product.findMany({
      where: { id: { in: Array.from(productLookupIds) } },
      select: { id: true, name: true },
      cacheStrategy: {
        ...trafficCache,
        tags: trafficTags(TAGS.products, TAGS.analytics, "traffic_global"),
      },
    })
    productNameMap = new Map(
      products.map((product) => [product.id, product.name]),
    )
  }

  if (topProducts) {
    topProducts = topProducts.map((entry) => ({
      ...entry,
      productName: productNameMap.get(entry.productId) ?? entry.productName,
    }))
  }

  if (referrerProductMatrix) {
    referrerProductMatrix = referrerProductMatrix.map((row) => ({
      ...row,
      topProducts: row.topProducts.map((entry) => ({
        ...entry,
        productName: productNameMap.get(entry.productId) ?? entry.productName,
      })),
    }))
  }

  const averageViewsPerDay = windowDays > 0 ? totalViews / windowDays : 0
  const topCountry = countryBreakdown[0]
  const topReferrer = referrerBreakdown[0]

  const advanced: ProductTrafficAdvancedInsights = {
    uniqueVisitorsOverTime: viewsOverTime,
    pathBreakdown,
    osBreakdown,
    regionBreakdown,
    cityBreakdown,
    referrerCategoryBreakdown,
    newVsReturning,
    anomalies,
    topProducts,
    referrerProductMatrix,
  }

  return {
    rangeDays: windowDays,
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
    advanced,
  }
}

export async function getProductTrafficSummary(
  productId: string,
  options: SummaryOptions = {},
): Promise<ProductTrafficSummary> {
  return buildTrafficSummary({ productId }, { context: "product", ...options })
}

export async function getGlobalTrafficSummary(
  options: SummaryOptions = {},
): Promise<ProductTrafficSummary> {
  return buildTrafficSummary(
    {},
    {
      context: "global",
      includeProductBreakdown: true,
      includeReferrerMatrix: true,
      ...options,
    },
  )
}

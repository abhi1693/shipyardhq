import { addDays, format, startOfDay, subDays } from "date-fns"

import prisma from "@/lib/prisma"
import {
  buildCacheKey,
  cacheHit,
  cacheMiss,
  invalidateCacheByPrefix,
} from "@/lib/server/cache"
import { resolveCacheTtl } from "@/lib/server/cache/ttl"
import type {
  LeaderboardRangeAnalytics,
  LeaderboardRangeProduct,
} from "@/types/analytics"

const DEFAULT_LIMIT = 25
const SURGE_LIMIT = 10
const NEWCOMER_LIMIT = 10
const LEADERBOARD_RANGE_CACHE_PREFIX = buildCacheKey(
  "analytics",
  "leaderboardRange",
)

export async function invalidateLeaderboardRangeAnalyticsCache(
  reason = "manual",
) {
  return invalidateCacheByPrefix({
    keyPrefix: LEADERBOARD_RANGE_CACHE_PREFIX,
    onError: (error) => {
      console.error(
        "[analytics] failed to invalidate leaderboard range cache",
        {
          reason,
          error,
        },
      )
    },
  })
}

function calcChange(current: number, previous: number) {
  if (previous === 0) {
    return current > 0 ? Number.POSITIVE_INFINITY : 0
  }
  return ((current - previous) / previous) * 100
}

function formatMakerName(user?: {
  firstName: string | null
  lastName: string | null
}) {
  if (!user) return "Unknown maker"
  const first = user.firstName ?? ""
  const last = user.lastName ?? ""
  const name = `${first} ${last}`.trim()
  return name || "Unknown maker"
}

type UpvoteGroup = {
  productId: string
  _count: { _all: number }
}

type UpvoteEvent = {
  productId: string
  createdAt: Date
}

function clampLimit(limit: number | undefined) {
  const value = typeof limit === "number" ? Math.floor(limit) : DEFAULT_LIMIT
  return Math.min(Math.max(value, 1), 100)
}

export async function getLeaderboardRangeAnalytics(
  rangeDays = 7,
  limit?: number,
): Promise<LeaderboardRangeAnalytics> {
  const windowDays = Math.max(Math.floor(rangeDays), 1)
  const resolvedLimit = clampLimit(limit)
  const today = startOfDay(new Date())
  const rangeStart = subDays(today, windowDays - 1)
  const rangeEnd = addDays(today, 1)
  const previousRangeStart = subDays(rangeStart, windowDays)

  const cacheKey = buildCacheKey(
    "analytics",
    "leaderboardRange",
    `range:${windowDays}`,
    `limit:${resolvedLimit}`,
  )
  const cacheTtlSeconds = resolveCacheTtl("slow")

  const cached = await cacheHit<LeaderboardRangeAnalytics>({
    key: cacheKey,
    onError: (error) => {
      console.error("[analytics] failed to read leaderboard range cache", {
        cacheKey,
        rangeDays: windowDays,
        error,
      })
    },
  })

  if (cached) {
    return cached
  }

  const currentWhere = {
    createdAt: {
      gte: rangeStart,
      lt: rangeEnd,
    },
    product: { status: "published" as const },
  }

  const previousWhere = {
    createdAt: {
      gte: previousRangeStart,
      lt: rangeStart,
    },
    product: { status: "published" as const },
  }

  const [currentCounts, previousCounts, upvoteEvents] = await Promise.all([
    prisma.productUpvote.groupBy({
      by: ["productId"],
      where: currentWhere,
      _count: { _all: true },
    }) as unknown as Promise<UpvoteGroup[]>,
    prisma.productUpvote.groupBy({
      by: ["productId"],
      where: previousWhere,
      _count: { _all: true },
    }) as unknown as Promise<UpvoteGroup[]>,
    prisma.productUpvote.findMany({
      where: currentWhere,
      select: { productId: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }) as unknown as Promise<UpvoteEvent[]>,
  ])

  const previousMap = new Map<string, number>(
    previousCounts.map((entry) => [entry.productId, entry._count._all]),
  )

  const productIds = new Set<string>()
  for (const entry of currentCounts) {
    productIds.add(entry.productId)
  }
  for (const entry of previousCounts) {
    productIds.add(entry.productId)
  }

  const products = await prisma.product.findMany({
    where: { id: { in: Array.from(productIds) } },
    select: {
      id: true,
      name: true,
      slug: true,
      tagline: true,
      analytics: { select: { upvotes: true } },
      category: { select: { name: true } },
      user: { select: { firstName: true, lastName: true } },
    },
  })

  const productInfo = new Map<string, (typeof products)[number]>(
    products.map((product: (typeof products)[number]) => [product.id, product]),
  )

  const totalsMap = new Map<string, number>(
    products.map((product: (typeof products)[number]) => [
      product.id,
      product.analytics?.upvotes ?? 0,
    ]),
  )

  const sortedCurrent = [...currentCounts].sort((a, b) => {
    const diff = b._count._all - a._count._all
    if (diff !== 0) return diff
    const totalA = totalsMap.get(a.productId) ?? 0
    const totalB = totalsMap.get(b.productId) ?? 0
    return totalB - totalA
  })

  const sortedPrevious = [...previousCounts].sort((a, b) => {
    const diff = b._count._all - a._count._all
    if (diff !== 0) return diff
    const totalA = totalsMap.get(a.productId) ?? 0
    const totalB = totalsMap.get(b.productId) ?? 0
    return totalB - totalA
  })

  const rankMap = new Map<string, number>()
  sortedCurrent.forEach((entry, index) => {
    rankMap.set(entry.productId, index + 1)
  })

  const previousRankMap = new Map<string, number>()
  sortedPrevious.forEach((entry, index) => {
    previousRankMap.set(entry.productId, index + 1)
  })

  const productSummaries: LeaderboardRangeProduct[] = []

  for (const entry of sortedCurrent) {
    const product = productInfo.get(entry.productId)
    if (!product) continue

    const currentUpvotes = entry._count._all
    const previousUpvotes = previousMap.get(entry.productId) ?? 0
    const upvoteChange = currentUpvotes - previousUpvotes
    const upvoteDelta = calcChange(currentUpvotes, previousUpvotes)
    const totalUpvotes = product.analytics?.upvotes ?? currentUpvotes

    productSummaries.push({
      id: entry.productId,
      name: product.name,
      slug: product.slug,
      tagline: product.tagline,
      categoryName: product.category?.name ?? null,
      makerName: formatMakerName(product.user),
      rangeUpvotes: currentUpvotes,
      previousUpvotes,
      upvoteChange,
      upvoteDelta,
      totalUpvotes,
      rank: rankMap.get(entry.productId) ?? productSummaries.length + 1,
      previousRank: previousRankMap.get(entry.productId) ?? null,
      isNew: previousUpvotes === 0,
    })
  }

  const topProducts = productSummaries.slice(0, resolvedLimit)

  const surgingProducts = productSummaries
    .filter((product) => product.previousUpvotes > 0)
    .sort((a, b) => {
      if (!Number.isFinite(b.upvoteDelta) && Number.isFinite(a.upvoteDelta)) {
        return 1
      }
      if (!Number.isFinite(a.upvoteDelta) && Number.isFinite(b.upvoteDelta)) {
        return -1
      }
      if (!Number.isFinite(a.upvoteDelta) && !Number.isFinite(b.upvoteDelta)) {
        return b.upvoteChange - a.upvoteChange
      }
      const deltaDiff = b.upvoteDelta - a.upvoteDelta
      if (deltaDiff !== 0) return deltaDiff
      return b.upvoteChange - a.upvoteChange
    })
    .slice(0, SURGE_LIMIT)

  const newProducts = productSummaries
    .filter((product) => product.isNew)
    .sort((a, b) => b.rangeUpvotes - a.rangeUpvotes)
    .slice(0, NEWCOMER_LIMIT)

  const totalUpvotes = productSummaries.reduce(
    (sum, product) => sum + product.rangeUpvotes,
    0,
  )
  const previousTotalUpvotes = previousCounts.reduce(
    (sum, entry) => sum + entry._count._all,
    0,
  )

  const uniqueProducts = productSummaries.length
  const previousUniqueProducts = previousCounts.length
  const newProductCount = productSummaries.filter(
    (product) => product.isNew,
  ).length
  const returningProductsCount = productSummaries.filter(
    (product) => !product.isNew,
  ).length
  const improvingProducts = productSummaries.filter(
    (product) => product.upvoteChange > 0 && product.previousUpvotes > 0,
  ).length
  const decliningProducts = productSummaries.filter(
    (product) => product.upvoteChange < 0 && product.previousUpvotes > 0,
  ).length
  const stableProducts = productSummaries.filter(
    (product) => product.upvoteChange === 0 && product.previousUpvotes > 0,
  ).length

  const championUpvotes = productSummaries[0]?.rangeUpvotes ?? null
  const championPrevious = sortedPrevious[0]?._count._all ?? null
  const championDelta =
    championUpvotes !== null ? championUpvotes - (championPrevious ?? 0) : null

  const averageDailyUpvotes = windowDays > 0 ? totalUpvotes / windowDays : 0

  const dailyBuckets = new Map<
    string,
    { total: number; perProduct: Map<string, number> }
  >()

  for (let index = 0; index < windowDays; index += 1) {
    const day = addDays(rangeStart, index)
    const key = format(day, "yyyy-MM-dd")
    dailyBuckets.set(key, { total: 0, perProduct: new Map() })
  }

  for (const event of upvoteEvents) {
    const key = format(startOfDay(event.createdAt), "yyyy-MM-dd")
    const bucket = dailyBuckets.get(key)
    if (!bucket) continue
    bucket.total += 1
    const existing = bucket.perProduct.get(event.productId) ?? 0
    bucket.perProduct.set(event.productId, existing + 1)
  }

  const history = Array.from(dailyBuckets.entries()).map(([key, bucket]) => {
    const date = new Date(`${key}T00:00:00.000Z`)
    const championDaily = bucket.perProduct.size
      ? Math.max(...bucket.perProduct.values())
      : 0
    const labelFormat = windowDays <= 7 ? "EEE" : "MMM d"

    return {
      date: key,
      label: format(date, labelFormat),
      upvotes: bucket.total,
      champion: championDaily,
      average: uniqueProducts > 0 ? bucket.total / uniqueProducts : 0,
    }
  })

  const analytics: LeaderboardRangeAnalytics = {
    rangeDays: windowDays,
    summary: {
      totalUpvotes,
      previousUpvotes: previousTotalUpvotes,
      upvoteChange: totalUpvotes - previousTotalUpvotes,
      upvoteDelta: calcChange(totalUpvotes, previousTotalUpvotes),
      uniqueProducts,
      previousUniqueProducts,
      newProducts: newProductCount,
      returningProducts: returningProductsCount,
      returningRate:
        uniqueProducts === 0
          ? 0
          : (returningProductsCount / uniqueProducts) * 100,
      improvingProducts,
      decliningProducts,
      stableProducts,
      championUpvotes,
      championPreviousUpvotes: championPrevious,
      championDelta,
      averageDailyUpvotes,
    },
    products: {
      top: topProducts,
      surging: surgingProducts,
      new: newProducts,
    },
    history,
  }

  await cacheMiss({
    key: cacheKey,
    value: analytics,
    ttlSeconds: cacheTtlSeconds,
    onError: (error) => {
      console.error("[analytics] failed to cache leaderboard range analytics", {
        cacheKey,
        rangeDays: windowDays,
        error,
      })
    },
  })

  return analytics
}

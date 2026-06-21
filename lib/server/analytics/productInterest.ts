import { format, subDays } from "date-fns"

import prisma from "@/lib/prisma"
import type { ProductInterestSignals } from "@/types/product-interest"
import { buildCacheKey } from "@/lib/server/cache"
import { getRedisClient } from "@/lib/server/redis"
import { getAnalyticsProvider } from "@/lib/server/analytics/store"
import type { GaDateRange } from "./googleAnalytics"

export type ProductRef = { id: string; slug: string }

type ProductCategoryRef = {
  id: string
  slug: string
  categorySlug: string | null
}

type ProductInterestCacheValue = {
  signals: ProductInterestSignals
  computedAt: string
  range: GaDateRange
  previousRange: GaDateRange
}

const CACHE_TTL_SECONDS = 60 * 60 * 24
const UNCATEGORIZED_KEY = "uncategorized"

const INTEREST_KEY_PREFIX = ["analytics", "product-interest", "v2"] as const

function interestKey(productId: string) {
  return buildCacheKey(...INTEREST_KEY_PREFIX, "product", productId)
}

function mostClickedIndexKey(days: number) {
  return buildCacheKey(
    ...INTEREST_KEY_PREFIX,
    "index",
    "most-clicked",
    `${days}d`,
  )
}

function categoryTrendingIndexKey(categorySlug: string, days: number) {
  return buildCacheKey(
    ...INTEREST_KEY_PREFIX,
    "index",
    "category",
    categorySlug,
    "trending",
    `${days}d`,
  )
}

function alsoClickedIndexKey(productId: string, days: number) {
  return buildCacheKey(
    ...INTEREST_KEY_PREFIX,
    "index",
    "also-clicked",
    productId,
    `${days}d`,
  )
}

function resolveRangeForLastNDays(days: number): GaDateRange {
  const safeDays = Math.max(1, Math.floor(days))
  const end = subDays(new Date(), 1)
  const start = subDays(end, safeDays - 1)
  return {
    startDate: format(start, "yyyy-MM-dd"),
    endDate: format(end, "yyyy-MM-dd"),
  }
}

function resolvePreviousRange(current: GaDateRange, days: number): GaDateRange {
  const safeDays = Math.max(1, Math.floor(days))
  const currentStart = new Date(current.startDate)
  const prevEnd = subDays(currentStart, 1)
  const prevStart = subDays(prevEnd, safeDays - 1)
  return {
    startDate: format(prevStart, "yyyy-MM-dd"),
    endDate: format(prevEnd, "yyyy-MM-dd"),
  }
}

function parseUtcDate(value: string): Date | null {
  const parsed = new Date(`${value}T00:00:00Z`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function resolveRangeBounds(range: GaDateRange) {
  const start = parseUtcDate(range.startDate)
  const end = parseUtcDate(range.endDate)
  if (!start || !end) return null

  return {
    start: start <= end ? start : end,
    end: start <= end ? end : start,
  }
}

function computeSignals({
  current,
  previous,
}: {
  current: { pageViews: number; uniqueVisitors: number; sessions: number }
  previous: { pageViews: number; uniqueVisitors: number; sessions: number }
}): ProductInterestSignals {
  const clicks7d = Math.max(0, Math.round(current.pageViews))
  const uniqueVisitors7d = Math.max(0, Math.round(current.uniqueVisitors))
  const repeatVisits7d = Math.max(
    0,
    Math.round(current.sessions) - Math.round(current.uniqueVisitors),
  )

  const prevClicks = Math.max(0, Math.round(previous.pageViews))
  const clickVelocityWoW =
    prevClicks > 0 ? (clicks7d - prevClicks) / prevClicks : clicks7d > 0 ? 1 : 0

  return {
    clicks7d,
    clickVelocityWoW,
    uniqueVisitors7d,
    repeatVisits7d,
  }
}

function parseJson<T>(value: string | null): T | null {
  if (!value) return null
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

async function readRedisValues(
  redis: NonNullable<Awaited<ReturnType<typeof getRedisClient>>>,
  keys: string[],
): Promise<Array<string | null>> {
  if (!keys.length) return []

  try {
    return await redis.mGet(keys)
  } catch {
    return []
  }
}

async function readRedisValue(
  redis: NonNullable<Awaited<ReturnType<typeof getRedisClient>>>,
  key: string,
): Promise<string | null> {
  try {
    return await redis.get(key)
  } catch {
    return null
  }
}

export async function getProductInterestSignalsMap(args: {
  products: ProductRef[]
  days?: number
}): Promise<Map<string, ProductInterestSignals>> {
  const results = new Map<string, ProductInterestSignals>()
  const products = args.products.filter((p) => p?.id)
  if (!products.length) return results

  const redis = await getRedisClient().catch(() => null)
  if (!redis) return results

  const keys = products.map((product) => interestKey(product.id))
  const values = await readRedisValues(redis, keys)

  for (let i = 0; i < products.length; i += 1) {
    const cached = parseJson<ProductInterestCacheValue>(values[i] ?? null)
    if (cached?.signals) {
      results.set(products[i]!.id, cached.signals)
    }
  }

  return results
}

export async function getMostClickedProductIds(args?: {
  days?: number
  limit?: number
}): Promise<string[]> {
  const days = typeof args?.days === "number" ? args.days : 7
  const limit = typeof args?.limit === "number" ? args.limit : 60

  const redis = await getRedisClient().catch(() => null)
  if (!redis) return []

  const payload = parseJson<{ productIds: string[] }>(
    await readRedisValue(redis, mostClickedIndexKey(days)),
  )
  const ids = payload?.productIds ?? []
  return ids.slice(0, Math.max(0, Math.floor(limit)))
}

export async function getTrendingCategoryProductIds(args: {
  categorySlug: string
  days?: number
  limit?: number
}): Promise<string[]> {
  const categorySlug = args.categorySlug?.trim()
  if (!categorySlug) return []

  const days = typeof args.days === "number" ? args.days : 7
  const limit = typeof args.limit === "number" ? args.limit : 60

  const redis = await getRedisClient().catch(() => null)
  if (!redis) return []

  const payload = parseJson<{ productIds: string[] }>(
    await readRedisValue(redis, categoryTrendingIndexKey(categorySlug, days)),
  )
  const ids = payload?.productIds ?? []
  return ids.slice(0, Math.max(0, Math.floor(limit)))
}

export async function getAlsoClickedProductIds(args: {
  productId: string
  days?: number
  limit?: number
}): Promise<string[]> {
  const productId = args.productId?.trim()
  if (!productId) return []

  const days = typeof args.days === "number" ? args.days : 7
  const limit = typeof args.limit === "number" ? args.limit : 12

  const redis = await getRedisClient().catch(() => null)
  if (!redis) return []

  const payload = parseJson<{ productIds: string[] }>(
    await readRedisValue(redis, alsoClickedIndexKey(productId, days)),
  )
  const ids = payload?.productIds ?? []
  return ids.slice(0, Math.max(0, Math.floor(limit)))
}

async function refreshAlsoClickedIndex({
  products,
  days,
  ttlSeconds,
  limitPerProduct,
}: {
  products: ProductCategoryRef[]
  days: number
  ttlSeconds: number
  limitPerProduct: number
}): Promise<{ storedCount: number; rowsProcessed: number } | null> {
  if (!products.length) return null
  const redis = await getRedisClient().catch(() => null)
  if (!redis) return null

  const range = resolveRangeForLastNDays(days)
  const bounds = resolveRangeBounds(range)
  if (!bounds) return null

  const coverage = await prisma.analyticsIngestionRun.findFirst({
    where: {
      source: "ga4",
      job: "product_traffic_daily",
      status: "completed",
      windowStart: { lte: bounds.start },
      windowEnd: { gte: bounds.end },
    },
    select: { id: true },
    orderBy: { finishedAt: "desc" },
  })

  if (!coverage) return null

  const productIds = products.map((product) => product.id)
  const trafficRows = await prisma.productTrafficDaily.groupBy({
    by: ["productId"],
    where: {
      source: "ga4",
      productId: { in: productIds },
      date: { gte: bounds.start, lte: bounds.end },
    },
    _sum: { pageViews: true },
  })

  const trafficById = new Map<string, number>()
  for (const row of trafficRows) {
    trafficById.set(row.productId, row._sum.pageViews ?? 0)
  }

  const scoredProducts = products
    .map((product) => ({
      id: product.id,
      category: product.categorySlug ?? UNCATEGORIZED_KEY,
      views: trafficById.get(product.id) ?? 0,
    }))
    .filter((entry) => entry.views > 0)

  if (!scoredProducts.length) {
    return { storedCount: 0, rowsProcessed: trafficRows.length }
  }

  const byViews = (
    a: (typeof scoredProducts)[number],
    b: (typeof scoredProducts)[number],
  ) => {
    if (b.views !== a.views) return b.views - a.views
    return a.id.localeCompare(b.id)
  }

  const globalIds = scoredProducts
    .slice()
    .sort(byViews)
    .map((entry) => entry.id)

  const categoryMap = new Map<string, typeof scoredProducts>()
  for (const entry of scoredProducts) {
    const list = categoryMap.get(entry.category) ?? []
    list.push(entry)
    categoryMap.set(entry.category, list)
  }

  const categoryIds = new Map<string, string[]>()
  for (const [category, entries] of categoryMap.entries()) {
    categoryIds.set(
      category,
      entries
        .slice()
        .sort(byViews)
        .map((entry) => entry.id),
    )
  }

  let storedCount = 0
  const multi = redis.multi()
  const limit = Math.max(0, Math.floor(limitPerProduct))

  for (const product of products) {
    if (limit <= 0) break
    const categoryKey = product.categorySlug ?? UNCATEGORIZED_KEY
    const primary = categoryIds.get(categoryKey) ?? []
    const combined = [...primary, ...globalIds]
    const uniqueIds: string[] = []
    const seen = new Set<string>()
    for (const id of combined) {
      if (seen.has(id)) continue
      seen.add(id)
      if (id === product.id) continue
      uniqueIds.push(id)
      if (uniqueIds.length >= limit) break
    }

    if (!uniqueIds.length) continue
    multi.set(
      alsoClickedIndexKey(product.id, days),
      JSON.stringify({ productIds: uniqueIds }),
      { EX: ttlSeconds },
    )
    storedCount += 1
  }

  await multi.exec().catch(() => null)
  return { storedCount, rowsProcessed: trafficRows.length }
}

export async function refreshProductInterestCache(args?: {
  days?: number
  topLimit?: number
  perCategoryLimit?: number
  alsoClickedLimit?: number
  skipAlsoClicked?: boolean
}): Promise<{
  success: boolean
  productCount: number
  storedSignals: number
  storedMostClicked: number
  storedCategories: number
  alsoClicked: { storedCount: number; rowsProcessed: number } | null
}> {
  const days = typeof args?.days === "number" ? args.days : 7
  const topLimit = typeof args?.topLimit === "number" ? args.topLimit : 60
  const perCategoryLimit =
    typeof args?.perCategoryLimit === "number" ? args.perCategoryLimit : 60
  const alsoClickedLimit =
    typeof args?.alsoClickedLimit === "number" ? args.alsoClickedLimit : 12
  const skipAlsoClicked =
    typeof args?.skipAlsoClicked === "boolean" ? args.skipAlsoClicked : true
  const redis = await getRedisClient().catch(() => null)
  if (!redis) {
    return {
      success: false,
      productCount: 0,
      storedSignals: 0,
      storedMostClicked: 0,
      storedCategories: 0,
      alsoClicked: null,
    }
  }

  const products: Array<{
    id: string
    slug: string
    category: { slug: string | null } | null
  }> = (await prisma.product.findMany({
    where: { status: "published" },
    select: { id: true, slug: true, category: { select: { slug: true } } },
  })) as any

  const productRefs: ProductCategoryRef[] = products.map((product) => ({
    id: product.id,
    slug: product.slug,
    categorySlug: product.category?.slug ?? null,
  }))

  const currentRange = resolveRangeForLastNDays(days)
  const previousRange = resolvePreviousRange(currentRange, days)
  const analyticsProvider = getAnalyticsProvider("cache")

  const [currentMap, previousMap] = await Promise.all([
    analyticsProvider.getProductTrafficMap({
      products: productRefs.map((p) => ({ id: p.id, slug: p.slug })),
      dateRange: currentRange,
    }),
    analyticsProvider.getProductTrafficMap({
      products: productRefs.map((p) => ({ id: p.id, slug: p.slug })),
      dateRange: previousRange,
    }),
  ])

  const computedAt = new Date().toISOString()
  const multi = redis.multi()

  const signalsByProductId = new Map<string, ProductInterestSignals>()
  for (const product of productRefs) {
    const current = currentMap.get(product.id) ?? {
      pageViews: 0,
      uniqueVisitors: 0,
      sessions: 0,
    }
    const previous = previousMap.get(product.id) ?? {
      pageViews: 0,
      uniqueVisitors: 0,
      sessions: 0,
    }

    const signals = computeSignals({ current, previous })
    signalsByProductId.set(product.id, signals)

    const payload: ProductInterestCacheValue = {
      signals,
      computedAt,
      range: currentRange,
      previousRange,
    }

    multi.set(interestKey(product.id), JSON.stringify(payload), {
      EX: CACHE_TTL_SECONDS,
    })
  }

  const mostClickedScored = Array.from(signalsByProductId.entries())
    .map(([productId, signals]) => {
      const clicks = signals?.clicks7d ?? 0
      return {
        productId,
        clicks,
        clickVelocityWoW: signals?.clickVelocityWoW ?? 0,
        score: clicks,
      }
    })
    .filter((entry) => entry.clicks > 0)

  const mostClickedIds = mostClickedScored
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      if (b.clicks !== a.clicks) return b.clicks - a.clicks
      if (b.clickVelocityWoW !== a.clickVelocityWoW)
        return b.clickVelocityWoW - a.clickVelocityWoW
      return a.productId.localeCompare(b.productId)
    })
    .slice(0, Math.max(0, Math.floor(topLimit)))
    .map((entry) => entry.productId)

  if (mostClickedIds.length) {
    multi.set(
      mostClickedIndexKey(days),
      JSON.stringify({ productIds: mostClickedIds }),
      { EX: CACHE_TTL_SECONDS },
    )
  }

  const byCategory = new Map<
    string,
    Array<{ id: string; signals: ProductInterestSignals }>
  >()
  for (const product of productRefs) {
    const categorySlug = product.categorySlug
    if (!categorySlug) continue
    const signals = signalsByProductId.get(product.id)
    if (!signals) continue
    if ((signals.clicks7d ?? 0) <= 0) continue
    const list = byCategory.get(categorySlug) ?? []
    list.push({ id: product.id, signals })
    byCategory.set(categorySlug, list)
  }

  let storedCategories = 0
  for (const [categorySlug, entries] of byCategory.entries()) {
    const ids = entries
      .sort((a, b) => {
        const aClicks = a.signals.clicks7d ?? 0
        const bClicks = b.signals.clicks7d ?? 0

        const aScore = aClicks
        const bScore = bClicks

        if (bScore !== aScore) return bScore - aScore
        if (bClicks !== aClicks) return bClicks - aClicks
        if (b.signals.clickVelocityWoW !== a.signals.clickVelocityWoW) {
          return b.signals.clickVelocityWoW - a.signals.clickVelocityWoW
        }

        return a.id.localeCompare(b.id)
      })
      .slice(0, Math.max(0, Math.floor(perCategoryLimit)))
      .map((entry) => entry.id)
    if (!ids.length) continue
    multi.set(
      categoryTrendingIndexKey(categorySlug, days),
      JSON.stringify({ productIds: ids }),
      { EX: CACHE_TTL_SECONDS },
    )
    storedCategories += 1
  }

  await multi.exec()

  const alsoClicked = skipAlsoClicked
    ? null
    : await refreshAlsoClickedIndex({
        products: productRefs,
        days,
        ttlSeconds: CACHE_TTL_SECONDS,
        limitPerProduct: alsoClickedLimit,
      })

  return {
    success: true,
    productCount: productRefs.length,
    storedSignals: productRefs.length,
    storedMostClicked: mostClickedIds.length ? 1 : 0,
    storedCategories,
    alsoClicked,
  }
}

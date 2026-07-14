import { format, subDays } from "date-fns"

import {
  ANALYTICS_REPORTING_WINDOW_DAYS,
  getCompletedAnalyticsWindow,
} from "@/lib/analytics/reportingWindow"
import prisma from "@/lib/prisma"
import type { ProductInterestSignals } from "@/types/product-interest"
import { applyCache, DEFAULT_TTL, TAGS } from "@/lib/cache"
import { buildCacheKey } from "@/lib/server/cache"
import { getRedisClient } from "@/lib/server/redis"
import { getAnalyticsProvider } from "@/lib/server/analytics/store"
import { hasAnalyticsIngestionCoverage } from "@/lib/server/analytics/ingestion/coverage"
import type { AnalyticsDateRange } from "./providerTypes"

export type ProductRef = { id: string; slug: string }

type ProductCategoryRef = {
  id: string
  slug: string
  categorySlug: string | null
  categorySlugs: string[]
}

type ProductInterestCacheValue = {
  signals: ProductInterestSignals
  computedAt: string
  range: AnalyticsDateRange
  previousRange: AnalyticsDateRange
}

const CACHE_TTL_SECONDS = 60 * 60 * 24
const UNCATEGORIZED_KEY = "uncategorized"

const INTEREST_KEY_PREFIX = ["analytics", "product-interest", "v3"] as const

function interestKey(productId: string) {
  return buildCacheKey(...INTEREST_KEY_PREFIX, "product", productId)
}

function mostViewedIndexKey(days: number) {
  return buildCacheKey(
    ...INTEREST_KEY_PREFIX,
    "index",
    "most-viewed",
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

function alsoViewedIndexKey(productId: string, days: number) {
  return buildCacheKey(
    ...INTEREST_KEY_PREFIX,
    "index",
    "also-viewed",
    productId,
    `${days}d`,
  )
}

function resolveRangeForLastNDays(days: number): AnalyticsDateRange {
  const window = getCompletedAnalyticsWindow(days)
  return {
    startDate: window.startDate,
    endDate: window.endDate,
  }
}

function resolvePreviousRange(
  current: AnalyticsDateRange,
  days: number,
): AnalyticsDateRange {
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

function resolveRangeBounds(range: AnalyticsDateRange) {
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
  const pageViews = Math.max(0, Math.round(current.pageViews))
  const visitors = Math.max(0, Math.round(current.uniqueVisitors))
  const repeatVisits = Math.max(
    0,
    Math.round(current.sessions) - Math.round(current.uniqueVisitors),
  )

  const previousPageViews = Math.max(0, Math.round(previous.pageViews))
  const pageViewChangeRatio =
    previousPageViews > 0
      ? (pageViews - previousPageViews) / previousPageViews
      : pageViews > 0
        ? 1
        : 0

  return {
    pageViews,
    pageViewChangeRatio,
    visitors,
    repeatVisits,
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
  "use cache"
  applyCache([TAGS.analytics, TAGS.products], DEFAULT_TTL.fast)

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

export async function getMostViewedProductIds(args?: {
  days?: number
  limit?: number
}): Promise<string[]> {
  const days =
    typeof args?.days === "number" ? args.days : ANALYTICS_REPORTING_WINDOW_DAYS
  const limit = typeof args?.limit === "number" ? args.limit : 60

  const redis = await getRedisClient().catch(() => null)
  if (!redis) return []

  const payload = parseJson<{ productIds: string[] }>(
    await readRedisValue(redis, mostViewedIndexKey(days)),
  )
  const ids = payload?.productIds ?? []
  return ids.slice(0, Math.max(0, Math.floor(limit)))
}

export type TrendingCategoryProductSnapshot = {
  productIds: string[]
  generatedAt: string
}

export async function getTrendingCategoryProductSnapshot(args: {
  categorySlug: string
  days?: number
  limit?: number
}): Promise<TrendingCategoryProductSnapshot> {
  "use cache"

  const categorySlug = args.categorySlug?.trim()
  applyCache(
    [
      TAGS.analytics,
      TAGS.products,
      categorySlug ? TAGS.category(categorySlug) : TAGS.categories,
    ],
    DEFAULT_TTL.fast,
  )

  const generatedAt = new Date().toISOString()
  if (!categorySlug) return { productIds: [], generatedAt }

  const days =
    typeof args.days === "number" ? args.days : ANALYTICS_REPORTING_WINDOW_DAYS
  const limit = typeof args.limit === "number" ? args.limit : 60

  const redis = await getRedisClient().catch(() => null)
  if (!redis) return { productIds: [], generatedAt }

  const payload = parseJson<{ productIds: string[] }>(
    await readRedisValue(redis, categoryTrendingIndexKey(categorySlug, days)),
  )
  const ids = payload?.productIds ?? []
  return {
    productIds: ids.slice(0, Math.max(0, Math.floor(limit))),
    generatedAt,
  }
}

export async function getAlsoViewedProductIds(args: {
  productId: string
  days?: number
  limit?: number
}): Promise<string[]> {
  const productId = args.productId?.trim()
  if (!productId) return []

  const days =
    typeof args.days === "number" ? args.days : ANALYTICS_REPORTING_WINDOW_DAYS
  const limit = typeof args.limit === "number" ? args.limit : 12

  const redis = await getRedisClient().catch(() => null)
  if (!redis) return []

  const payload = parseJson<{ productIds: string[] }>(
    await readRedisValue(redis, alsoViewedIndexKey(productId, days)),
  )
  const ids = payload?.productIds ?? []
  return ids.slice(0, Math.max(0, Math.floor(limit)))
}

async function refreshAlsoViewedIndex({
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

  const coverage = await hasAnalyticsIngestionCoverage(
    "product_traffic_daily",
    bounds,
  )

  if (!coverage) return null

  const productIds = products.map((product) => product.id)
  const trafficRows = await prisma.productTrafficDaily.groupBy({
    by: ["productId"],
    where: {
      source: "cloudflare",
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
      alsoViewedIndexKey(product.id, days),
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
  alsoViewedLimit?: number
  skipAlsoViewed?: boolean
}): Promise<{
  success: boolean
  productCount: number
  storedSignals: number
  storedMostViewed: number
  storedCategories: number
  alsoViewed: { storedCount: number; rowsProcessed: number } | null
}> {
  const days =
    typeof args?.days === "number" ? args.days : ANALYTICS_REPORTING_WINDOW_DAYS
  const topLimit = typeof args?.topLimit === "number" ? args.topLimit : 60
  const perCategoryLimit =
    typeof args?.perCategoryLimit === "number" ? args.perCategoryLimit : 60
  const alsoViewedLimit =
    typeof args?.alsoViewedLimit === "number" ? args.alsoViewedLimit : 12
  const skipAlsoViewed =
    typeof args?.skipAlsoViewed === "boolean" ? args.skipAlsoViewed : true
  const redis = await getRedisClient().catch(() => null)
  if (!redis) {
    return {
      success: false,
      productCount: 0,
      storedSignals: 0,
      storedMostViewed: 0,
      storedCategories: 0,
      alsoViewed: null,
    }
  }

  const products: Array<{
    id: string
    slug: string
    category: { slug: string | null } | null
    categories: Array<{ category: { slug: string | null } }>
  }> = (await prisma.product.findMany({
    where: { status: "published" },
    select: {
      id: true,
      slug: true,
      category: { select: { slug: true } },
      categories: {
        select: { category: { select: { slug: true } } },
      },
    },
  })) as any

  const productRefs: ProductCategoryRef[] = products.map((product) => {
    const categorySlug = product.category?.slug ?? null
    const categorySlugs = Array.from(
      new Set(
        [
          categorySlug,
          ...product.categories.map((assignment) => assignment.category.slug),
        ].filter((slug): slug is string => Boolean(slug)),
      ),
    )

    return {
      id: product.id,
      slug: product.slug,
      categorySlug,
      categorySlugs,
    }
  })

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

  const mostViewedScored = Array.from(signalsByProductId.entries())
    .map(([productId, signals]) => {
      const pageViews = signals?.pageViews ?? 0
      return {
        productId,
        pageViews,
        pageViewChangeRatio: signals?.pageViewChangeRatio ?? 0,
        score: pageViews,
      }
    })
    .filter((entry) => entry.pageViews > 0)

  const mostViewedIds = mostViewedScored
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      if (b.pageViews !== a.pageViews) return b.pageViews - a.pageViews
      if (b.pageViewChangeRatio !== a.pageViewChangeRatio)
        return b.pageViewChangeRatio - a.pageViewChangeRatio
      return a.productId.localeCompare(b.productId)
    })
    .slice(0, Math.max(0, Math.floor(topLimit)))
    .map((entry) => entry.productId)

  if (mostViewedIds.length) {
    multi.set(
      mostViewedIndexKey(days),
      JSON.stringify({ productIds: mostViewedIds }),
      { EX: CACHE_TTL_SECONDS },
    )
  }

  const byCategory = new Map<
    string,
    Array<{ id: string; signals: ProductInterestSignals }>
  >()
  for (const product of productRefs) {
    const signals = signalsByProductId.get(product.id)
    if (!signals) continue
    if ((signals.pageViews ?? 0) <= 0) continue

    for (const categorySlug of product.categorySlugs) {
      const list = byCategory.get(categorySlug) ?? []
      list.push({ id: product.id, signals })
      byCategory.set(categorySlug, list)
    }
  }

  let storedCategories = 0
  for (const [categorySlug, entries] of byCategory.entries()) {
    const ids = entries
      .sort((a, b) => {
        const aPageViews = a.signals.pageViews ?? 0
        const bPageViews = b.signals.pageViews ?? 0

        const aScore = aPageViews
        const bScore = bPageViews

        if (bScore !== aScore) return bScore - aScore
        if (bPageViews !== aPageViews) return bPageViews - aPageViews
        if (b.signals.pageViewChangeRatio !== a.signals.pageViewChangeRatio) {
          return b.signals.pageViewChangeRatio - a.signals.pageViewChangeRatio
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

  const alsoViewed = skipAlsoViewed
    ? null
    : await refreshAlsoViewedIndex({
        products: productRefs,
        days,
        ttlSeconds: CACHE_TTL_SECONDS,
        limitPerProduct: alsoViewedLimit,
      })

  return {
    success: true,
    productCount: productRefs.length,
    storedSignals: productRefs.length,
    storedMostViewed: mostViewedIds.length ? 1 : 0,
    storedCategories,
    alsoViewed,
  }
}

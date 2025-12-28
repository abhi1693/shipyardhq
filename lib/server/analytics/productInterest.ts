import { protos } from "@google-analytics/data"
import { format, subDays } from "date-fns"

import prisma from "@/lib/prisma"
import type { ProductInterestSignals } from "@/types/product-interest"
import { buildCacheKey } from "@/lib/server/cache"
import { getRedisClient } from "@/lib/server/redis"
import { siteConfig } from "@/lib/siteConfig"
import { VERIFIED_REVENUE_RANKING_MULTIPLIER } from "@/lib/ranking/verifiedRevenue"
import { buildVerifiedRevenueWhere } from "@/lib/products/verifiedRevenue"
import { getAnalyticsProvider } from "@/lib/server/analytics/store"
import {
  runGaReport,
  type GaDateRange,
} from "./googleAnalytics"

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

type AlsoClickedEntry = { productId: string; clicks: number }

const CACHE_TTL_SECONDS = 60 * 60 * 3

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

function hasGaDataApiConfig() {
  return Boolean(
    process.env.GA_CREDENTIALS_JSON?.trim() &&
    process.env.GA_PROPERTY_ID?.trim(),
  )
}

function resolveRangeForLastNDays(days: number): GaDateRange {
  const safeDays = Math.max(1, Math.floor(days))
  const end = subDays(new Date(), 0)
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
  const values = await redis.mGet(keys)

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
    await redis.get(mostClickedIndexKey(days)),
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
    await redis.get(categoryTrendingIndexKey(categorySlug, days)),
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
    await redis.get(alsoClickedIndexKey(productId, days)),
  )
  const ids = payload?.productIds ?? []
  return ids.slice(0, Math.max(0, Math.floor(limit)))
}

function extractProductSlugFromPath(
  value: string | null | undefined,
): string | null {
  if (!value) return null
  const match = value.match(/\/products\/([^/?#]+)/i)
  return match ? match[1]!.trim().toLowerCase() : null
}

function extractProductSlugFromReferrer(
  value: string | null | undefined,
): string | null {
  if (!value) return null
  const raw = value.trim()
  if (!raw || raw === "(direct)") return null

  try {
    const parsed = new URL(raw, siteConfig.url)
    return extractProductSlugFromPath(parsed.pathname)
  } catch {
    return extractProductSlugFromPath(raw)
  }
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
}) {
  if (!hasGaDataApiConfig()) {
    return { storedCount: 0, rowsProcessed: 0 }
  }

  const redis = await getRedisClient().catch(() => null)
  if (!redis) return { storedCount: 0, rowsProcessed: 0 }

  const slugToId = new Map<string, string>()
  for (const product of products) {
    slugToId.set(product.slug.toLowerCase(), product.id)
  }

  const range = resolveRangeForLastNDays(days)
  const rowsProcessed: { count: number } = { count: 0 }
  const fromToCounts = new Map<string, Map<string, number>>()

  const report = await runGaReport({
    dateRanges: [range],
    dimensions: [{ name: "pageReferrer" }, { name: "pagePath" }],
    metrics: [{ name: "screenPageViews" }],
    dimensionFilter: {
      andGroup: {
        expressions: [
          {
            filter: {
              fieldName: "pagePath",
              stringFilter: {
                matchType:
                  protos.google.analytics.data.v1beta.Filter.StringFilter
                    .MatchType.BEGINS_WITH,
                value: "/products/",
              },
            },
          },
          {
            filter: {
              fieldName: "pageReferrer",
              stringFilter: {
                matchType:
                  protos.google.analytics.data.v1beta.Filter.StringFilter
                    .MatchType.CONTAINS,
                value: "/products/",
              },
            },
          },
        ],
      },
    },
    orderBys: [
      {
        metric: { metricName: "screenPageViews" },
        desc: true,
      },
    ],
    limit: 10_000,
  })

  const rows = report.rows ?? []
  for (const row of rows) {
    rowsProcessed.count += 1
    const referrer = row.dimensionValues?.[0]?.value ?? null
    const path = row.dimensionValues?.[1]?.value ?? null
    const views = Number(row.metricValues?.[0]?.value ?? 0) || 0
    if (views <= 0) continue

    const fromSlug = extractProductSlugFromReferrer(referrer)
    const toSlug = extractProductSlugFromPath(path)
    if (!fromSlug || !toSlug) continue

    const fromId = slugToId.get(fromSlug)
    const toId = slugToId.get(toSlug)
    if (!fromId || !toId) continue
    if (fromId === toId) continue

    const toMap = fromToCounts.get(fromId) ?? new Map<string, number>()
    toMap.set(toId, (toMap.get(toId) ?? 0) + views)
    fromToCounts.set(fromId, toMap)
  }

  let storedCount = 0
  const multi = redis.multi()

  for (const [fromId, toMap] of fromToCounts.entries()) {
    const list: AlsoClickedEntry[] = Array.from(toMap.entries())
      .map(([productId, clicks]) => ({ productId, clicks }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, Math.max(0, Math.floor(limitPerProduct)))

    if (!list.length) continue

    const productIds = list.map((entry) => entry.productId)
    multi.set(
      alsoClickedIndexKey(fromId, days),
      JSON.stringify({ productIds }),
      { EX: ttlSeconds },
    )
    storedCount += 1
  }

  await multi.exec().catch(() => null)
  return { storedCount, rowsProcessed: rowsProcessed.count }
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
  const gaConfigured = hasGaDataApiConfig()

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

  const verifiedRevenueRows = await prisma.product.findMany({
    where: { AND: [{ status: "published" }, buildVerifiedRevenueWhere()] },
    select: { id: true },
  })
  const verifiedRevenueIds = new Set(
    verifiedRevenueRows.map((row: { id: string }) => row.id),
  )

  const currentRange = resolveRangeForLastNDays(days)
  const previousRange = resolvePreviousRange(currentRange, days)
  const analyticsProvider = getAnalyticsProvider("db")

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
      const multiplier = verifiedRevenueIds.has(productId)
        ? VERIFIED_REVENUE_RANKING_MULTIPLIER
        : 1
      const score = verifiedRevenueIds.has(productId)
        ? Math.ceil(clicks * multiplier)
        : clicks
      return {
        productId,
        clicks,
        clickVelocityWoW: signals?.clickVelocityWoW ?? 0,
        score,
        revenueVerified: verifiedRevenueIds.has(productId),
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

        const aMultiplier = verifiedRevenueIds.has(a.id)
          ? VERIFIED_REVENUE_RANKING_MULTIPLIER
          : 1
        const bMultiplier = verifiedRevenueIds.has(b.id)
          ? VERIFIED_REVENUE_RANKING_MULTIPLIER
          : 1

        const aScore = verifiedRevenueIds.has(a.id)
          ? Math.ceil(aClicks * aMultiplier)
          : aClicks
        const bScore = verifiedRevenueIds.has(b.id)
          ? Math.ceil(bClicks * bMultiplier)
          : bClicks

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

  const alsoClicked =
    skipAlsoClicked || !gaConfigured
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

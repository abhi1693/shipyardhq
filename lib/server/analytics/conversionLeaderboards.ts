import { addDays, startOfDay, subDays } from "date-fns"

import {
  accelerateTags,
  cached,
  DEFAULT_SWR,
  DEFAULT_TTL,
  TAGS,
} from "@/lib/cache"
import prisma from "@/lib/prisma"

const LEADERBOARD_LIMIT = 5
const MIN_VIEWS_FOR_RATE = 10
const MIN_CLICKS_FOR_CTR = 2
const MIN_UPVOTES_FOR_RATE = 1
const MIN_VIEWS_FOR_GROWTH = 10

const leaderboardCache = {
  ttl: DEFAULT_TTL.slow,
  swr: DEFAULT_SWR.slow,
}

const leaderboardTags = (...tags: string[]) =>
  accelerateTags(["adminAnalytics", "conversionLeaderboards", ...tags])

function calcChange(current: number, previous: number) {
  if (previous === 0) {
    return current > 0 ? Number.POSITIVE_INFINITY : 0
  }
  return ((current - previous) / previous) * 100
}

function calcGrowth(current: number, previous: number) {
  if (previous === 0) {
    return current > 0 ? Number.POSITIVE_INFINITY : 0
  }
  return ((current - previous) / previous) * 100
}

function safePercent(numerator: number, denominator: number) {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) return 0
  if (denominator === 0) return 0
  return (numerator / denominator) * 100
}

function scoreForSort(value: number) {
  return Number.isFinite(value) ? value : Number.POSITIVE_INFINITY
}

interface BaseEntry {
  id: string
  name: string
  views: number
  previousViews: number
}

interface ProductEntry extends BaseEntry {
  slug?: string
  categoryId?: string
  categoryName?: string
}

export interface ProductCtrEntry extends ProductEntry {
  clicks: number
  previousClicks: number
  ctr: number
  ctrDelta: number
}

export interface ProductUpvoteEntry extends ProductEntry {
  upvotes: number
  previousUpvotes: number
  upvoteRate: number
  upvoteRateDelta: number
}

export interface ProductGrowthEntry extends ProductEntry {
  growth: number
}

export interface CategoryCtrEntry extends BaseEntry {
  clicks: number
  previousClicks: number
  ctr: number
  ctrDelta: number
}

export interface CategoryUpvoteEntry extends BaseEntry {
  upvotes: number
  previousUpvotes: number
  upvoteRate: number
  upvoteRateDelta: number
}

export interface CategoryGrowthEntry extends BaseEntry {
  growth: number
}

export interface ConversionLeaderboards {
  products: {
    topCtr: ProductCtrEntry[]
    topUpvoteRate: ProductUpvoteEntry[]
    fastestGrowing: ProductGrowthEntry[]
  }
  categories: {
    topCtr: CategoryCtrEntry[]
    topUpvoteRate: CategoryUpvoteEntry[]
    fastestGrowing: CategoryGrowthEntry[]
  }
}

type ProductCountRow = { productId: string; _count: { _all: number } }

interface MetricAccumulator {
  id: string
  views: number
  previousViews: number
  clicks: number
  previousClicks: number
  upvotes: number
  previousUpvotes: number
  name?: string
  slug?: string
  categoryId?: string
  categoryName?: string
}

interface CategoryAccumulator {
  id: string
  name: string
  views: number
  previousViews: number
  clicks: number
  previousClicks: number
  upvotes: number
  previousUpvotes: number
}

export const getConversionLeaderboards = cached(
  async (rangeDays = 7): Promise<ConversionLeaderboards> => {
    const today = startOfDay(new Date())
    const windowDays = Math.max(rangeDays, 1)
    const rangeStart = subDays(today, windowDays - 1)
    const rangeEnd = addDays(today, 1)
    const previousStart = subDays(rangeStart, windowDays)

    const currentTrafficWhere = {
      createdAt: {
        gte: rangeStart,
        lt: rangeEnd,
      },
      product: { status: "published" as const },
    }

    const previousTrafficWhere = {
      createdAt: {
        gte: previousStart,
        lt: rangeStart,
      },
      product: { status: "published" as const },
    }

    const [
      currentViews,
      previousViews,
      currentClicks,
      previousClicks,
      currentUpvotes,
      previousUpvotes,
    ]: [
      ProductCountRow[],
      ProductCountRow[],
      ProductCountRow[],
      ProductCountRow[],
      ProductCountRow[],
      ProductCountRow[],
    ] = await Promise.all([
      prisma.productTrafficEvent.groupBy({
        by: ["productId"],
        where: currentTrafficWhere,
        _count: { _all: true },
      }) as unknown as Promise<ProductCountRow[]>,
      prisma.productTrafficEvent.groupBy({
        by: ["productId"],
        where: previousTrafficWhere,
        _count: { _all: true },
      }) as unknown as Promise<ProductCountRow[]>,
      prisma.productClickEvent.groupBy({
        by: ["productId"],
        where: {
          createdAt: {
            gte: rangeStart,
            lt: rangeEnd,
          },
          product: { status: "published" as const },
        },
        _count: { _all: true },
      }) as unknown as Promise<ProductCountRow[]>,
      prisma.productClickEvent.groupBy({
        by: ["productId"],
        where: {
          createdAt: {
            gte: previousStart,
            lt: rangeStart,
          },
          product: { status: "published" as const },
        },
        _count: { _all: true },
      }) as unknown as Promise<ProductCountRow[]>,
      prisma.productUpvote.groupBy({
        by: ["productId"],
        where: {
          createdAt: {
            gte: rangeStart,
            lt: rangeEnd,
          },
          product: { status: "published" as const },
        },
        _count: { _all: true },
      }) as unknown as Promise<ProductCountRow[]>,
      prisma.productUpvote.groupBy({
        by: ["productId"],
        where: {
          createdAt: {
            gte: previousStart,
            lt: rangeStart,
          },
          product: { status: "published" as const },
        },
        _count: { _all: true },
      }) as unknown as Promise<ProductCountRow[]>,
    ])

    const metrics = new Map<string, MetricAccumulator>()
    const ensureMetric = (productId: string) => {
      let record = metrics.get(productId)
      if (!record) {
        record = {
          id: productId,
          views: 0,
          previousViews: 0,
          clicks: 0,
          previousClicks: 0,
          upvotes: 0,
          previousUpvotes: 0,
        }
        metrics.set(productId, record)
      }
      return record
    }

    for (const row of currentViews) {
      const record = ensureMetric(row.productId)
      record.views = row._count._all
    }

    for (const row of previousViews) {
      const record = ensureMetric(row.productId)
      record.previousViews = row._count._all
    }

    for (const row of currentClicks) {
      const record = ensureMetric(row.productId)
      record.clicks = row._count._all
    }

    for (const row of previousClicks) {
      const record = ensureMetric(row.productId)
      record.previousClicks = row._count._all
    }

    for (const row of currentUpvotes) {
      const record = ensureMetric(row.productId)
      record.upvotes = row._count._all
    }

    for (const row of previousUpvotes) {
      const record = ensureMetric(row.productId)
      record.previousUpvotes = row._count._all
    }

    if (metrics.size === 0) {
      return {
        products: {
          topCtr: [],
          topUpvoteRate: [],
          fastestGrowing: [],
        },
        categories: {
          topCtr: [],
          topUpvoteRate: [],
          fastestGrowing: [],
        },
      }
    }

    const productIds = Array.from(metrics.keys())
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        categoryId: true,
        category: { select: { id: true, name: true } },
      },
      cacheStrategy: {
        ...leaderboardCache,
        tags: leaderboardTags(TAGS.products, TAGS.categories),
      },
    })

    const categoryMap = new Map<string, CategoryAccumulator>()

    const productEntries: MetricAccumulator[] = []

    for (const product of products) {
      const record = metrics.get(product.id)
      if (!record) continue
      record.name = product.name
      record.slug = product.slug
      record.categoryId =
        product.category?.id ?? product.categoryId ?? undefined
      record.categoryName = product.category?.name ?? undefined
      metrics.set(product.id, record)
      productEntries.push(record)

      if (record.categoryId) {
        let bucket = categoryMap.get(record.categoryId)
        if (!bucket) {
          bucket = {
            id: record.categoryId,
            name: record.categoryName ?? "Unknown",
            views: 0,
            previousViews: 0,
            clicks: 0,
            previousClicks: 0,
            upvotes: 0,
            previousUpvotes: 0,
          }
          categoryMap.set(record.categoryId, bucket)
        }
        bucket.views += record.views
        bucket.previousViews += record.previousViews
        bucket.clicks += record.clicks
        bucket.previousClicks += record.previousClicks
        bucket.upvotes += record.upvotes
        bucket.previousUpvotes += record.previousUpvotes
      }
    }

    const resolvedProductEntries = productEntries.filter(
      (entry): entry is MetricAccumulator & { name: string } =>
        Boolean(entry.name) && entry.views > 0,
    )

    const productCtr = resolvedProductEntries
      .map<ProductCtrEntry>((entry) => {
        const ctr = safePercent(entry.clicks, entry.views)
        const previousCtr = safePercent(
          entry.previousClicks,
          entry.previousViews,
        )
        return {
          ...entry,
          ctr,
          ctrDelta: calcChange(ctr, previousCtr),
        }
      })
      .filter(
        (entry) =>
          entry.views >= MIN_VIEWS_FOR_RATE &&
          entry.clicks >= MIN_CLICKS_FOR_CTR,
      )
      .sort((a, b) => scoreForSort(b.ctr) - scoreForSort(a.ctr))
      .slice(0, LEADERBOARD_LIMIT)

    const productUpvoteRate = resolvedProductEntries
      .map<ProductUpvoteEntry>((entry) => {
        const upvoteRate = safePercent(entry.upvotes, entry.views)
        const previousUpvoteRate = safePercent(
          entry.previousUpvotes,
          entry.previousViews,
        )
        return {
          ...entry,
          upvoteRate,
          upvoteRateDelta: calcChange(upvoteRate, previousUpvoteRate),
        }
      })
      .filter(
        (entry) =>
          entry.views >= MIN_VIEWS_FOR_RATE &&
          entry.upvotes >= MIN_UPVOTES_FOR_RATE,
      )
      .sort((a, b) => scoreForSort(b.upvoteRate) - scoreForSort(a.upvoteRate))
      .slice(0, LEADERBOARD_LIMIT)

    const productGrowth = resolvedProductEntries
      .map<ProductGrowthEntry>((entry) => ({
        ...entry,
        growth: calcGrowth(entry.views, entry.previousViews),
      }))
      .filter((entry) => entry.views >= MIN_VIEWS_FOR_GROWTH)
      .sort((a, b) => scoreForSort(b.growth) - scoreForSort(a.growth))
      .slice(0, LEADERBOARD_LIMIT)

    const categoryEntries = Array.from(categoryMap.values()).filter(
      (entry) => entry.views > 0,
    )

    const categoryCtr = categoryEntries
      .map<CategoryCtrEntry>((entry) => {
        const ctr = safePercent(entry.clicks, entry.views)
        const previousCtr = safePercent(
          entry.previousClicks,
          entry.previousViews,
        )
        return {
          ...entry,
          ctr,
          ctrDelta: calcChange(ctr, previousCtr),
        }
      })
      .filter(
        (entry) =>
          entry.views >= MIN_VIEWS_FOR_RATE &&
          entry.clicks >= MIN_CLICKS_FOR_CTR,
      )
      .sort((a, b) => scoreForSort(b.ctr) - scoreForSort(a.ctr))
      .slice(0, LEADERBOARD_LIMIT)

    const categoryUpvoteRate = categoryEntries
      .map<CategoryUpvoteEntry>((entry) => {
        const upvoteRate = safePercent(entry.upvotes, entry.views)
        const previousUpvoteRate = safePercent(
          entry.previousUpvotes,
          entry.previousViews,
        )
        return {
          ...entry,
          upvoteRate,
          upvoteRateDelta: calcChange(upvoteRate, previousUpvoteRate),
        }
      })
      .filter(
        (entry) =>
          entry.views >= MIN_VIEWS_FOR_RATE &&
          entry.upvotes >= MIN_UPVOTES_FOR_RATE,
      )
      .sort((a, b) => scoreForSort(b.upvoteRate) - scoreForSort(a.upvoteRate))
      .slice(0, LEADERBOARD_LIMIT)

    const categoryGrowth = categoryEntries
      .map<CategoryGrowthEntry>((entry) => ({
        ...entry,
        growth: calcGrowth(entry.views, entry.previousViews),
      }))
      .filter((entry) => entry.views >= MIN_VIEWS_FOR_GROWTH)
      .sort((a, b) => scoreForSort(b.growth) - scoreForSort(a.growth))
      .slice(0, LEADERBOARD_LIMIT)

    return {
      products: {
        topCtr: productCtr,
        topUpvoteRate: productUpvoteRate,
        fastestGrowing: productGrowth,
      },
      categories: {
        topCtr: categoryCtr,
        topUpvoteRate: categoryUpvoteRate,
        fastestGrowing: categoryGrowth,
      },
    }
  },
  "conversionLeaderboards",
  {
    ttl: DEFAULT_TTL.slow,
    tags: ([rangeDays]) =>
      leaderboardTags(TAGS.analytics, `conversion:${Math.max(rangeDays, 1)}`),
  },
)

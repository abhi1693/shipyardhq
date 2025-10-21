import { addDays, format, startOfDay, subDays } from "date-fns"

import prisma from "@/lib/prisma"
import type { ProductUpdateUsageSummary } from "@/types/analytics"
import { Prisma, ProductUpdateStatus } from "@/lib/vendor/prisma/client"

const MAX_TOP_PRODUCTS = 8
const MAX_RECENT_ACTIVITY = 12
const MAX_RANGE_DAYS = 180

const PRODUCT_UPDATE_USAGE_ARGS =
  Prisma.validator<Prisma.ProductUpdateFindManyArgs>()({
    include: { product: { select: { id: true, name: true, slug: true } } },
  })

type ProductUpdateRangeRecord = Prisma.ProductUpdateGetPayload<
  typeof PRODUCT_UPDATE_USAGE_ARGS
>

function clampRangeDays(rangeDays?: number): number {
  const fallback = 30
  if (!rangeDays || Number.isNaN(rangeDays)) {
    return fallback
  }
  const rounded = Math.round(rangeDays)
  if (rounded < 1) return 1
  if (rounded > MAX_RANGE_DAYS) return MAX_RANGE_DAYS
  return rounded
}

function buildTrendBuckets(rangeDays: number, rangeStart: Date) {
  const labelFormat = rangeDays <= 7 ? "EEE" : "MMM d"
  const buckets = new Map<
    string,
    { date: string; label: string; created: number; published: number }
  >()

  for (let offset = 0; offset < rangeDays; offset += 1) {
    const day = addDays(rangeStart, offset)
    const key = format(day, "yyyy-MM-dd")
    buckets.set(key, {
      date: key,
      label: format(day, labelFormat),
      created: 0,
      published: 0,
    })
  }

  return buckets
}

function inRange(date: Date | null | undefined, start: Date, end: Date) {
  if (!date) return false
  return date >= start && date < end
}

function toISOStringOrNull(date: Date | null | undefined) {
  return date ? date.toISOString() : null
}

export async function getProductUpdateUsageSummary(
  rangeDays?: number,
): Promise<ProductUpdateUsageSummary> {
  const normalizedRange = clampRangeDays(rangeDays)
  const todayStart = startOfDay(new Date())
  const rangeEnd = addDays(todayStart, 1)
  const rangeStart = subDays(rangeEnd, normalizedRange)
  const previousRangeStart = subDays(rangeStart, normalizedRange)

  const [
    totalUpdates,
    totalPublished,
    totalDrafts,
    productsWithUpdatesRows,
    previousCreated,
    previousPublished,
  ] = await Promise.all([
    prisma.productUpdate.count(),
    prisma.productUpdate.count({
      where: { status: ProductUpdateStatus.published },
    }),
    prisma.productUpdate.count({
      where: { status: ProductUpdateStatus.draft },
    }),
    prisma.productUpdate.findMany({
      distinct: ["productId"],
      select: { productId: true },
    }),
    prisma.productUpdate.count({
      where: {
        createdAt: {
          gte: previousRangeStart,
          lt: rangeStart,
        },
      },
    }),
    prisma.productUpdate.count({
      where: {
        status: ProductUpdateStatus.published,
        publishedAt: {
          gte: previousRangeStart,
          lt: rangeStart,
        },
      },
    }),
  ])

  const updatesInWindow = (await prisma.productUpdate.findMany({
    ...PRODUCT_UPDATE_USAGE_ARGS,
    where: {
      OR: [
        {
          createdAt: {
            gte: rangeStart,
            lt: rangeEnd,
          },
        },
        {
          publishedAt: {
            gte: rangeStart,
            lt: rangeEnd,
          },
        },
      ],
    },
  })) as unknown as ProductUpdateRangeRecord[]

  const trendBuckets = buildTrendBuckets(normalizedRange, rangeStart)

  let createdInRange = 0
  let publishedInRange = 0
  let draftsInRange = 0
  const productsWithUpdates = productsWithUpdatesRows.length

  const productStats = new Map<
    string,
    {
      productId: string
      productName: string
      productSlug: string
      created: number
      published: number
      lastActivityAt: Date | null
    }
  >()

  const collectedActivity: Array<{
    record: ProductUpdateRangeRecord
    activityTimestamp: number
  }> = []

  for (const update of updatesInWindow) {
    const wasCreatedInRange = inRange(update.createdAt, rangeStart, rangeEnd)
    const wasPublishedInRange = inRange(
      update.publishedAt ?? null,
      rangeStart,
      rangeEnd,
    )

    if (wasCreatedInRange) {
      createdInRange += 1
      if (update.status === ProductUpdateStatus.draft) {
        draftsInRange += 1
      }
      const key = format(startOfDay(update.createdAt), "yyyy-MM-dd")
      const bucket = trendBuckets.get(key)
      if (bucket) {
        bucket.created += 1
      }
    }

    if (wasPublishedInRange) {
      publishedInRange += 1
      const key = format(startOfDay(update.publishedAt as Date), "yyyy-MM-dd")
      const bucket = trendBuckets.get(key)
      if (bucket) {
        bucket.published += 1
      }
    }

    if (wasCreatedInRange || wasPublishedInRange) {
      const stats =
        productStats.get(update.productId) ??
        (() => {
          const next = {
            productId: update.productId,
            productName: update.product?.name ?? "Unknown product",
            productSlug: update.product?.slug ?? "",
            created: 0,
            published: 0,
            lastActivityAt: null,
          }
          productStats.set(update.productId, next)
          return next
        })()

      if (wasCreatedInRange) {
        stats.created += 1
        if (!stats.lastActivityAt || update.createdAt > stats.lastActivityAt) {
          stats.lastActivityAt = update.createdAt
        }
      }

      if (wasPublishedInRange && update.publishedAt) {
        stats.published += 1
        if (update.publishedAt > (stats.lastActivityAt ?? new Date(0))) {
          stats.lastActivityAt = update.publishedAt
        }
      }

      const activityTime = Math.max(
        wasPublishedInRange && update.publishedAt
          ? update.publishedAt.getTime()
          : 0,
        wasCreatedInRange ? update.createdAt.getTime() : 0,
      )

      collectedActivity.push({
        record: update,
        activityTimestamp: activityTime,
      })
    }
  }

  const trend = Array.from(trendBuckets.values())

  const activeProducts = productStats.size
  const averageCreatedPerActiveProduct =
    activeProducts > 0 ? createdInRange / activeProducts : 0

  const topProducts = Array.from(productStats.values())
    .sort((a, b) => {
      if (b.created !== a.created) return b.created - a.created
      if (b.published !== a.published) return b.published - a.published
      const aTime = a.lastActivityAt ? a.lastActivityAt.getTime() : 0
      const bTime = b.lastActivityAt ? b.lastActivityAt.getTime() : 0
      return bTime - aTime
    })
    .slice(0, MAX_TOP_PRODUCTS)
    .map((item) => ({
      productId: item.productId,
      productName: item.productName,
      productSlug: item.productSlug,
      created: item.created,
      published: item.published,
      lastActivityAt: toISOStringOrNull(item.lastActivityAt),
    }))

  const recentActivity = collectedActivity
    .filter((entry) => entry.activityTimestamp > 0)
    .sort((a, b) => b.activityTimestamp - a.activityTimestamp)
    .slice(0, MAX_RECENT_ACTIVITY)
    .map(({ record }) => ({
      updateId: record.id,
      productId: record.productId,
      productName: record.product?.name ?? "Unknown product",
      productSlug: record.product?.slug ?? "",
      title: record.title,
      status: record.status,
      createdAt: record.createdAt.toISOString(),
      publishedAt: toISOStringOrNull(record.publishedAt ?? null),
    }))

  return {
    rangeDays: normalizedRange,
    totals: {
      allTime: {
        updates: totalUpdates,
        published: totalPublished,
        drafts: totalDrafts,
        productsWithUpdates,
      },
      range: {
        created: createdInRange,
        published: publishedInRange,
        drafts: draftsInRange,
        createdDelta: createdInRange - previousCreated,
        publishedDelta: publishedInRange - previousPublished,
      },
    },
    perProduct: {
      activeProducts,
      averageCreatedPerActiveProduct,
      topProducts,
    },
    trend,
    recentActivity,
  }
}

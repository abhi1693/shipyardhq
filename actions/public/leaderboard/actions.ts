import { startOfDay, subDays } from "date-fns"

import prisma from "@/lib/prisma"
import { cached, DEFAULT_TTL, TAGS } from "@/lib/cache"
import {
  normalizeMonth,
  parseMonthKey,
  toMonthKey,
} from "@/lib/server/monthlyLeaderboard"
import {
  productCardSelect,
  type ProductCardRecord,
} from "@/lib/products/selects"

const monthLabelFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
})

export const getLeaderboardStats = cached(
  async () => {
    const rangeStart = startOfDay(subDays(new Date(), 29))
    const [
      totalProducts,
      totalCreators,
      upvoteAgg,
      topProduct,
      insightsAgg,
      trafficAgg,
      trafficSeries,
    ] = await Promise.all([
      prisma.product.count({}),
      prisma.user.count({}),
      prisma.productAnalytics.aggregate({
        _sum: { upvotes: true },
      }),
      prisma.productAnalytics.findFirst({
        orderBy: { upvotes: "desc" },
        select: { upvotes: true },
      }),
      prisma.productInsightProfile.aggregate({
        _sum: { insightsGeneratedCount: true },
      }),
      prisma.pageTrafficDaily.aggregate({
        where: { date: { gte: rangeStart } },
        _sum: { pageViews: true, visitors: true },
      }),
      prisma.pageTrafficDaily.findMany({
        where: { date: { gte: rangeStart } },
        orderBy: { date: "asc" },
        select: { date: true, pageViews: true, visitors: true },
      }),
    ])

    return {
      totalProducts,
      totalCreators,
      totalUpvotes: upvoteAgg._sum.upvotes ?? 0,
      topScore: topProduct?.upvotes ?? 0,
      totalInsights: insightsAgg._sum.insightsGeneratedCount ?? 0,
      pageViews30: trafficAgg._sum.pageViews ?? 0,
      visitors30: trafficAgg._sum.visitors ?? 0,
      trafficSeries:
        trafficSeries?.map((row: { date: Date; pageViews: number; visitors: number }) => ({
          date: row.date.toISOString(),
          pageViews: row.pageViews,
          visitors: row.visitors,
        })) ?? [],
    }
  },
  "leaderboard:stats",
  {
    ttl: DEFAULT_TTL.fast,
    tags: () => [TAGS.leaderboard, TAGS.analytics, TAGS.products],
  },
)

export const getTopRankedProducts = cached(
  async (args?: { limit?: number; categorySlug?: string }) => {
    const limit = args?.limit ?? 50
    const categorySlug = args?.categorySlug
    return prisma.product.findMany({
      take: limit,
      where: categorySlug ? { category: { slug: categorySlug } } : undefined,
      orderBy: {
        analytics: {
          upvotes: "desc",
        },
      },
      select: productCardSelect,
    }) as Promise<ProductCardRecord[]>
  },
  "leaderboard:top-products",
  {
    ttl: DEFAULT_TTL.fast,
    tags: ([args]) => [
      TAGS.leaderboard,
      TAGS.products,
      TAGS.analytics,
      TAGS.categories,
      TAGS.category(String(args?.categorySlug ?? "all")),
    ],
  },
)

export type MonthlyLeaderboardMonth = {
  month: string
  label: string
}

export const getMonthlyLeaderboardMonths = cached(
  async () => {
    const months = await prisma.monthlyProductRanking.findMany({
      distinct: ["month"],
      orderBy: { month: "desc" },
      select: { month: true },
    })

    return months.map(({ month }: { month: Date }) => ({
      month: toMonthKey(month),
      label: monthLabelFormatter.format(month),
    })) satisfies MonthlyLeaderboardMonth[]
  },
  "leaderboard:monthly:months",
  {
    ttl: DEFAULT_TTL.slow,
    tags: () => [TAGS.monthlyLeaderboard],
  },
)

const resolveTargetMonth = async (month?: string) => {
  const input = parseMonthKey(month)
  if (input) {
    const normalized = normalizeMonth(input)
    const exists = await prisma.monthlyProductRanking.findFirst({
      where: { month: normalized },
      select: { month: true },
    })
    if (exists) {
      return normalizeMonth(exists.month)
    }
  }

  const latest = await prisma.monthlyProductRanking.findFirst({
    orderBy: { month: "desc" },
    select: { month: true },
  })

  if (latest) {
    return normalizeMonth(latest.month)
  }

  return normalizeMonth(new Date())
}

export const getMonthlyTopRankedProducts = cached(
  async (args?: { month?: string; limit?: number }) => {
    const limit = args?.limit ?? 10
    const targetMonth = await resolveTargetMonth(args?.month)
    const monthKey = toMonthKey(targetMonth)

    const rankings = await prisma.monthlyProductRanking.findMany({
      take: limit,
      where: { month: targetMonth },
      orderBy: { rank: "asc" },
      include: {
        product: {
          include: {
            category: true,
            analytics: true,
            ProductBadge: true,
            user: true,
            paymentConnector: {
              select: {
                latestAllTimeRevenueCents: true,
                latestCurrencyCode: true,
                revenueHistory: {
                  orderBy: { periodStart: "desc" },
                  take: 1,
                  select: {
                    allTimeRevenueCents: true,
                    currencyCode: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    return {
      month: monthKey,
      label: monthLabelFormatter.format(targetMonth),
      rankings,
    }
  },
  "leaderboard:monthly:top-products",
  {
    ttl: DEFAULT_TTL.slow,
    tags: ([args]) => [
      TAGS.monthlyLeaderboard,
      TAGS.monthlyLeaderboardMonth(
        args?.month && parseMonthKey(args.month) ? args.month : "resolved",
      ),
    ],
  },
)

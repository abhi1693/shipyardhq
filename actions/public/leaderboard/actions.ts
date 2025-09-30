import prisma from "@/lib/prisma"
import {
  accelerateTags,
  cached,
  DEFAULT_TTL,
  DEFAULT_SWR,
  TAGS,
} from "@/lib/cache"
import {
  normalizeMonth,
  parseMonthKey,
  toMonthKey,
} from "@/lib/server/monthlyLeaderboard"

const monthLabelFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
})

const monthlyCacheTags = (monthKey?: string) =>
  accelerateTags([
    TAGS.leaderboard,
    TAGS.monthlyLeaderboard,
    ...(monthKey ? [TAGS.monthlyLeaderboardMonth(monthKey)] : []),
  ])

export const getLeaderboardStats = cached(
  async () => {
    const [totalProducts, totalCreators, upvoteAgg, topProduct, totalInsights] =
      await Promise.all([
        prisma.product.count({
          cacheStrategy: {
            ttl: DEFAULT_TTL.fast,
            swr: DEFAULT_SWR.fast,
            tags: accelerateTags([TAGS.products, TAGS.leaderboard]),
          },
        }),
        prisma.user.count({
          cacheStrategy: {
            ttl: DEFAULT_TTL.fast,
            swr: DEFAULT_SWR.fast,
            tags: accelerateTags([TAGS.users, TAGS.leaderboard]),
          },
        }),
        prisma.productAnalytics.aggregate({
          _sum: { upvotes: true },
          cacheStrategy: {
            ttl: DEFAULT_TTL.fast,
            swr: DEFAULT_SWR.fast,
            tags: accelerateTags([TAGS.analytics, TAGS.leaderboard]),
          },
        }),
        prisma.productAnalytics.findFirst({
          orderBy: { upvotes: "desc" },
          select: { upvotes: true },
          cacheStrategy: {
            ttl: DEFAULT_TTL.fast,
            swr: DEFAULT_SWR.fast,
            tags: accelerateTags([TAGS.analytics, TAGS.leaderboard]),
          },
        }),
        prisma.productInsightStageResult.count({
          where: {
            stageId: "report.comprehensive",
            status: "ready",
          },
          cacheStrategy: {
            ttl: DEFAULT_TTL.fast,
            swr: DEFAULT_SWR.fast,
            tags: accelerateTags([TAGS.leaderboard, TAGS.analytics]),
          },
        }),
      ])

    return {
      totalProducts,
      totalCreators,
      totalUpvotes: upvoteAgg._sum.upvotes ?? 0,
      topScore: topProduct?.upvotes ?? 0,
      totalInsights,
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
      cacheStrategy: {
        ttl: DEFAULT_TTL.fast,
        swr: DEFAULT_SWR.fast,
        tags: accelerateTags([
          TAGS.leaderboard,
          TAGS.products,
          TAGS.analytics,
          TAGS.categories,
          TAGS.category(String(categorySlug ?? "all")),
        ]),
      },
      include: {
        category: true,
        user: true,
        analytics: true,
        ProductBadge: true,
      },
    })
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
      cacheStrategy: {
        ttl: DEFAULT_TTL.slow,
        swr: DEFAULT_SWR.slow,
        tags: monthlyCacheTags(),
      },
    })

    return months.map(({ month }) => ({
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
      cacheStrategy: {
        ttl: DEFAULT_TTL.slow,
        swr: DEFAULT_SWR.slow,
        tags: monthlyCacheTags(toMonthKey(normalized)),
      },
    })
    if (exists) {
      return normalizeMonth(exists.month)
    }
  }

  const latest = await prisma.monthlyProductRanking.findFirst({
    orderBy: { month: "desc" },
    select: { month: true },
    cacheStrategy: {
      ttl: DEFAULT_TTL.slow,
      swr: DEFAULT_SWR.slow,
      tags: monthlyCacheTags(),
    },
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
      cacheStrategy: {
        ttl: DEFAULT_TTL.slow,
        swr: DEFAULT_SWR.slow,
        tags: monthlyCacheTags(monthKey),
      },
      include: {
        product: {
          include: {
            category: true,
            analytics: true,
            ProductBadge: true,
            user: true,
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

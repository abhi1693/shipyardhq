import prisma from "@/lib/prisma"
import { cached, DEFAULT_TTL, TAGS } from "@/lib/cache"
import {
  normalizeMonth,
  parseMonthKey,
  toMonthKey,
} from "@/lib/server/monthlyLeaderboard"
import {
  generateLeaderboardRun,
  getCurrentLeaderboardWindow,
} from "@/lib/server/leaderboard/v2"
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
    const [totalProducts, totalCreators, upvoteAgg, topProduct, insightsAgg] =
      await Promise.all([
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
      ])

    return {
      totalProducts,
      totalCreators,
      totalUpvotes: upvoteAgg._sum.upvotes ?? 0,
      topScore: topProduct?.upvotes ?? 0,
      totalInsights: insightsAgg._sum.insightsGeneratedCount ?? 0,
    }
  },
  "leaderboard:stats",
  {
    ttl: DEFAULT_TTL.fast,
    tags: () => [TAGS.leaderboard, TAGS.analytics, TAGS.products],
  },
)

async function getOrCreateActiveLeaderboardRun() {
  const { periodStart, periodEnd } = getCurrentLeaderboardWindow()
  const existing = await prisma.leaderboardRun.findUnique({
    where: {
      periodStart_periodEnd: {
        periodStart,
        periodEnd,
      },
    },
    select: { id: true, periodStart: true, periodEnd: true, status: true },
  })

  if (existing) {
    // Ensure run has scores; if not, populate once.
    const hasScores = await prisma.productLeaderboardScore.findFirst({
      where: { runId: existing.id },
      select: { id: true },
    })
    if (!hasScores) {
      await generateLeaderboardRun({
        periodStart: existing.periodStart,
        periodEnd: existing.periodEnd,
        asOf: new Date(),
      })
    }
    return existing
  }

  const { runId } = await generateLeaderboardRun({
    periodStart,
    periodEnd,
    asOf: new Date(),
  })

  const created = await prisma.leaderboardRun.findUnique({
    where: { id: runId },
    select: { id: true, periodStart: true, periodEnd: true },
  })

  return created ?? { id: runId, periodStart, periodEnd }
}

export const getTopRankedProducts = cached(
  async (args?: { limit?: number; categorySlug?: string }) => {
    const limit = args?.limit ?? 50
    const categorySlug = args?.categorySlug

    // Ensure the run exists and is populated before reading scores.
    const run = await getOrCreateActiveLeaderboardRun()
    const scoreExists = await prisma.productLeaderboardScore.findFirst({
      where: { runId: run.id },
      select: { id: true },
    })
    if (!scoreExists) {
      await generateLeaderboardRun({
        periodStart: run.periodStart,
        periodEnd: run.periodEnd,
        asOf: new Date(),
      })
    }

    const scores = await prisma.productLeaderboardScore.findMany({
      take: limit,
      where: {
        runId: run.id,
        product: categorySlug
          ? {
              category: {
                slug: categorySlug,
              },
            }
          : undefined,
      },
      orderBy: [{ score: "desc" }, { upvotes: "desc" }, { productId: "asc" }],
      include: {
        product: {
          select: productCardSelect,
        },
      },
    })

    return scores.map((entry: (typeof scores)[number]) => ({
      ...entry.product,
      scoreCount: entry.score,
      leaderboardRank: entry.rank ?? undefined,
    })) as unknown as ProductCardRecord[]
  },
  "leaderboard:top-products",
  {
    ttl: DEFAULT_TTL.fast,
    keyParts: ([args]) => {
      const parts = [
        args?.categorySlug ? `category:${args.categorySlug}` : null,
      ].filter((value): value is string => Boolean(value))
      return parts
    },
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
    const [runs, legacyMonths] = await Promise.all([
      prisma.leaderboardRun.findMany({
        distinct: ["periodStart"],
        orderBy: { periodStart: "desc" },
        select: { periodStart: true },
      }),
      prisma.monthlyProductRanking.findMany({
        distinct: ["month"],
        orderBy: { month: "desc" },
        select: { month: true },
      }),
    ])

    const monthSet = new Map<string, Date>()
    runs.forEach((run: { periodStart: Date }) => {
      monthSet.set(toMonthKey(run.periodStart), run.periodStart)
    })
    legacyMonths.forEach((legacy: { month: Date }) => {
      const key = toMonthKey(legacy.month)
      if (!monthSet.has(key)) {
        monthSet.set(key, legacy.month)
      }
    })

    return Array.from(monthSet.entries())
      .map(([monthKey, date]) => ({
        month: monthKey,
        label: monthLabelFormatter.format(date),
        date,
      }))
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .map(({ month, label }) => ({ month, label })) satisfies MonthlyLeaderboardMonth[]
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
    return normalizeMonth(input)
  }
  const { periodStart } = getCurrentLeaderboardWindow()
  return normalizeMonth(periodStart)
}

export const getMonthlyTopRankedProducts = cached(
  async (args?: { month?: string; limit?: number }) => {
    const limit = args?.limit ?? 10
    const targetMonth = await resolveTargetMonth(args?.month)
    const monthKey = toMonthKey(targetMonth)

    const periodStart = targetMonth
    const periodEnd = new Date(
      Date.UTC(targetMonth.getUTCFullYear(), targetMonth.getUTCMonth() + 1, 1),
    )

    const run =
      (await prisma.leaderboardRun.findUnique({
        where: {
          periodStart_periodEnd: {
            periodStart,
            periodEnd,
          },
        },
      })) ??
      (await generateLeaderboardRun({
        periodStart,
        periodEnd,
        asOf: new Date(),
      }).then(async ({ runId }) =>
        prisma.leaderboardRun.findUnique({ where: { id: runId } }),
      ))

    const rankings = run
      ? await prisma.productLeaderboardScore.findMany({
          take: limit,
          where: { runId: run.id },
          orderBy: [
            { rank: "asc" },
            { score: "desc" },
            { upvotes: "desc" },
          ],
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
      : []

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

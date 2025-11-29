import prisma from "@/lib/prisma"
import { cached, DEFAULT_TTL, TAGS } from "@/lib/cache"
import {
  normalizeMonth,
  parseMonthKey,
  toMonthKey,
} from "@/lib/server/monthlyLeaderboard"
import {
  generateLeaderboardRun,
  computeLeaderboardWindow,
  getCurrentLeaderboardWindow,
} from "@/lib/server/leaderboard/v2"
import {
  getHomepageTrafficFromGa,
  getRealtimeVisitorsFromGa,
} from "@/lib/server/analytics/googleAnalytics"
import {
  productCardSelect,
  type ProductCardRecord,
} from "@/lib/products/selects"

const monthLabelFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
})

const dayLabelFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  timeZone: "UTC",
})

const shortDayLabelFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
})

export type LeaderboardHighlightPeriod = "day" | "week" | "month"
export type PeriodLeaderboardKind = LeaderboardHighlightPeriod

function getPeriodWindow(
  period: LeaderboardHighlightPeriod,
  now: Date = new Date(),
) {
  if (period === "day") {
    const start = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        0,
        0,
        0,
        0,
      ),
    )
    const end = new Date(start)
    end.setUTCDate(start.getUTCDate() + 1)
    return { periodStart: start, periodEnd: end }
  }

  if (period === "week") {
    const startOfDay = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        0,
        0,
        0,
        0,
      ),
    )
    const day = startOfDay.getUTCDay()
    const diff = (day + 6) % 7 // Monday as the first day of the week
    const start = new Date(startOfDay)
    start.setUTCDate(startOfDay.getUTCDate() - diff)
    const end = new Date(start)
    end.setUTCDate(start.getUTCDate() + 7)
    return { periodStart: start, periodEnd: end }
  }

  return getCurrentLeaderboardWindow(now)
}

function formatPeriodLabel(
  period: LeaderboardHighlightPeriod,
  periodStart: Date,
  periodEnd: Date,
) {
  if (period === "day") {
    return dayLabelFormatter.format(periodStart)
  }
  if (period === "week") {
    const end = new Date(periodEnd)
    end.setUTCDate(end.getUTCDate() - 1)
    return `${shortDayLabelFormatter.format(periodStart)} - ${shortDayLabelFormatter.format(end)}`
  }
  return monthLabelFormatter.format(periodStart)
}

function startOfIsoWeek(year: number, week: number): Date | null {
  if (!Number.isFinite(year) || !Number.isFinite(week) || week < 1 || week > 53) {
    return null
  }
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const jan4Day = jan4.getUTCDay() || 7 // Monday=1
  const start = new Date(jan4)
  start.setUTCDate(jan4.getUTCDate() - (jan4Day - 1) + (week - 1) * 7)
  return start
}

export function resolvePeriodWindowFromParts(args: {
  period: LeaderboardHighlightPeriod
  year: number
  month?: number
  day?: number
  week?: number
}): { periodStart: Date; periodEnd: Date; label: string } | null {
  const year = Number(args.year)
  if (!Number.isFinite(year) || year < 1970 || year > 3000) return null
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  if (args.period === "day") {
    const month = Number(args.month)
    const day = Number(args.day)
    if (
      !Number.isFinite(month) ||
      !Number.isFinite(day) ||
      month < 1 ||
      month > 12 ||
      day < 1 ||
      day > 31
    ) {
      return null
    }
    const start = new Date(Date.UTC(year, month - 1, day))
    if (
      start.getUTCFullYear() !== year ||
      start.getUTCMonth() !== month - 1 ||
      start.getUTCDate() !== day
    ) {
      return null
    }
    const end = new Date(start)
    end.setUTCDate(start.getUTCDate() + 1)
    if (start.getTime() > today.getTime()) {
      return null
    }
    return {
      periodStart: start,
      periodEnd: end,
      label: formatPeriodLabel("day", start, end),
    }
  }

  if (args.period === "week") {
    const week = Number(args.week)
    const start = startOfIsoWeek(year, week)
    if (!start) return null
    const end = new Date(start)
    end.setUTCDate(start.getUTCDate() + 7)
    if (start.getTime() > today.getTime()) {
      return null
    }
    return {
      periodStart: start,
      periodEnd: end,
      label: formatPeriodLabel("week", start, end),
    }
  }

  const month = Number(args.month)
  if (!Number.isFinite(month) || month < 1 || month > 12) return null
  const start = new Date(Date.UTC(year, month - 1, 1))
  const end = new Date(Date.UTC(year, month, 1))
  if (start.getTime() > today.getTime()) {
    return null
  }
  return {
    periodStart: start,
    periodEnd: end,
    label: formatPeriodLabel("month", start, end),
  }
}

export const getLeaderboardStats = cached(
  async () => {
    const [
      totalProducts,
      totalCreators,
      upvoteAgg,
      topProduct,
      insightsAgg,
      homepageTraffic,
      realtimeVisitors,
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
      getHomepageTrafficFromGa(),
      getRealtimeVisitorsFromGa(),
    ])

    return {
      totalProducts,
      totalCreators,
      totalUpvotes: upvoteAgg._sum.upvotes ?? 0,
      topScore: topProduct?.upvotes ?? 0,
      totalInsights: insightsAgg._sum.insightsGeneratedCount ?? 0,
      pageViews30: homepageTraffic.pageViews30,
      visitors30: homepageTraffic.visitors30,
      trafficSeries: homepageTraffic.trafficSeries,
      realtimeVisitors,
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

export type ProductOfThePeriodResult = {
  period: LeaderboardHighlightPeriod
  label: string
  periodStart: Date
  periodEnd: Date
  products: ProductCardRecord[]
}

async function resolveProductOfThePeriod(
  period: LeaderboardHighlightPeriod,
  limit = 3,
): Promise<ProductOfThePeriodResult> {
  const now = new Date()
  const { periodStart, periodEnd } = getPeriodWindow(period, now)
  const label = formatPeriodLabel(period, periodStart, periodEnd)

  if (period === "month") {
    const run = await getOrCreateActiveLeaderboardRun()
    const rows = await prisma.productLeaderboardScore.findMany({
      where: { runId: run.id, score: { gt: 0 } },
      orderBy: [
        { score: "desc" },
        { upvotes: "desc" },
        { productId: "asc" },
      ],
      include: {
        product: {
          select: productCardSelect,
        },
      },
    })

    const results = rows
      .slice(0, limit)
      .map((row: (typeof rows)[number], index: number) => ({
        ...row.product,
        scoreCount: row.score ?? 0,
        leaderboardRank: index + 1,
      })) as unknown as ProductCardRecord[]

    return {
      period,
      label,
      periodStart: run.periodStart,
      periodEnd: run.periodEnd,
      products: results,
    }
  }

  const rankedRows = await computeLeaderboardWindow({
    periodStart,
    periodEnd,
  })
  const winners = rankedRows.slice(0, limit)
  const productIds = winners.map((row) => row.productId)
  if (!productIds.length) {
    return { period, label, periodStart, periodEnd, products: [] }
  }

  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, status: "published" },
    select: productCardSelect,
  })
  const productMap = new Map(
    products.map((product: (typeof products)[number]) => [product.id, product]),
  )

  const results = winners
    .map((row, index) => {
      const product = productMap.get(row.productId)
      if (!product) return null
      return {
        ...product,
        scoreCount: row.score ?? 0,
        leaderboardRank: row.rank ?? index + 1,
      } as ProductCardRecord & { scoreCount?: number; leaderboardRank?: number }
    })
    .filter(
      (
        value,
      ): value is ProductCardRecord & {
        scoreCount?: number
        leaderboardRank?: number
      } => Boolean(value),
    )

  return { period, label, periodStart, periodEnd, products: results }
}

export const getProductOfThePeriod = cached(
  async (args?: { period?: LeaderboardHighlightPeriod; limit?: number }) => {
    const period = args?.period ?? "day"
    const limit = args?.limit ?? 3
    return resolveProductOfThePeriod(period, limit)
  },
  "leaderboard:product-of-period",
  {
    ttl: DEFAULT_TTL.fast,
    keyParts: ([args]) =>
      [
        args?.period ?? "day",
        typeof args?.limit === "number" ? `limit:${args.limit}` : null,
      ].filter((part): part is string => Boolean(part)),
    tags: () => [TAGS.leaderboard, TAGS.analytics, TAGS.products],
  },
)

export const getProductOfTheMoments = cached(
  async (args?: { limit?: number }) => {
    const limit = args?.limit ?? 3
    const [day, week, month] = await Promise.all([
      resolveProductOfThePeriod("day", limit),
      resolveProductOfThePeriod("week", limit),
      resolveProductOfThePeriod("month", limit),
    ])
    return { day, week, month }
  },
  "leaderboard:product-highlights",
  {
    ttl: DEFAULT_TTL.fast,
    keyParts: ([args]) =>
      [typeof args?.limit === "number" ? `limit:${args.limit}` : null].filter(
        (part): part is string => Boolean(part),
      ),
    tags: () => [TAGS.leaderboard, TAGS.analytics, TAGS.products],
  },
)

export type MonthlyLeaderboardMonth = {
  month: string
  label: string
}

export type PeriodicLeaderboardPayload = {
  period: LeaderboardHighlightPeriod
  periodLabel: string
  periodStart: Date
  periodEnd: Date
  products: ProductCardRecord[]
}

async function mapRowsToProducts(
  rows: Awaited<ReturnType<typeof computeLeaderboardWindow>>,
  limit?: number,
): Promise<ProductCardRecord[]> {
  const winners =
    typeof limit === "number" ? rows.slice(0, limit) : rows.slice(0)
  const productIds = winners.map((row) => row.productId)
  if (!productIds.length) return []

  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, status: "published" },
    select: productCardSelect,
  })
  const productMap = new Map(
    products.map((product: (typeof products)[number]) => [product.id, product]),
  )

  return winners
    .map((row, index) => {
      const product = productMap.get(row.productId)
      if (!product) return null
      return {
        ...product,
        scoreCount: row.score ?? 0,
        leaderboardRank: row.rank ?? index + 1,
      }
    })
    .filter(Boolean) as unknown as ProductCardRecord[]
}

async function mapRunRowsToProducts(
  params: { periodStart: Date; periodEnd: Date; limit?: number },
): Promise<ProductCardRecord[] | null> {
  const run = await prisma.leaderboardRun.findUnique({
    where: {
      periodStart_periodEnd: {
        periodStart: params.periodStart,
        periodEnd: params.periodEnd,
      },
    },
    select: { id: true },
  })
  if (!run) return null

  const rows = await prisma.productLeaderboardScore.findMany({
    where: { runId: run.id, score: { gt: 0 } },
    orderBy: [
      { rank: "asc" },
      { score: "desc" },
      { upvotes: "desc" },
    ],
    take: params.limit ?? undefined,
    include: {
      product: {
        select: productCardSelect,
      },
    },
  })

  if (!rows.length) return []

  return rows.map((row: (typeof rows)[number], index: number) => ({
    ...row.product,
    scoreCount: row.score ?? 0,
    leaderboardRank: row.rank ?? index + 1,
  })) as unknown as ProductCardRecord[]
}

export const getPeriodicLeaderboard = cached(
  async (args: {
    period: LeaderboardHighlightPeriod
    periodStart: Date
    periodEnd: Date
    limit?: number
    label?: string
  }): Promise<PeriodicLeaderboardPayload> => {
    const limit = args.limit
    const periodLabel =
      args.label ??
      formatPeriodLabel(args.period, args.periodStart, args.periodEnd)

    if (args.period === "month") {
      const runProducts = await mapRunRowsToProducts({
        periodStart: args.periodStart,
        periodEnd: args.periodEnd,
        limit,
      })
      if (runProducts) {
        return {
          period: args.period,
          periodLabel,
          periodStart: args.periodStart,
          periodEnd: args.periodEnd,
          products: runProducts,
        }
      }
    }

    const rankedRows = await computeLeaderboardWindow({
      periodStart: args.periodStart,
      periodEnd: args.periodEnd,
      limit,
    })
    const products = await mapRowsToProducts(rankedRows, limit)

    return {
      period: args.period,
      periodLabel,
      periodStart: args.periodStart,
      periodEnd: args.periodEnd,
      products,
    }
  },
  "leaderboard:periodic",
  {
    ttl: DEFAULT_TTL.fast,
    keyParts: ([args]) =>
      [
        args.period,
        args.periodStart.toISOString(),
        args.periodEnd.toISOString(),
        typeof args.limit === "number" ? `limit:${args.limit}` : null,
      ].filter((part): part is string => Boolean(part)),
    tags: () => [TAGS.leaderboard, TAGS.analytics, TAGS.products],
  },
)

export async function getPeriodicLeaderboardByParams(args: {
  period: LeaderboardHighlightPeriod
  year: number
  month?: number
  day?: number
  week?: number
  limit?: number
}): Promise<PeriodicLeaderboardPayload | null> {
  const window = resolvePeriodWindowFromParts(args)
  if (!window) return null

  return getPeriodicLeaderboard({
    period: args.period,
    periodStart: window.periodStart,
    periodEnd: window.periodEnd,
    limit: args.limit,
    label: window.label,
  })
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

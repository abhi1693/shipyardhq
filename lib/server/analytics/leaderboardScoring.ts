import prisma from "@/lib/prisma"
import {
  buildCacheKey,
  cacheHit,
  cacheMiss,
} from "@/lib/server/cache"
import { resolveCacheTtl } from "@/lib/server/cache/ttl"
import {
  getPreviousMonth,
  normalizeMonth,
  parseMonthKey,
  toMonthKey,
} from "@/lib/server/monthlyLeaderboard"

const monthLabelFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
})

type RankingProduct = {
  id: string
  name: string
  slug: string
  tagline: string
  logo: string | null
  analytics: { upvotes: number | null } | null
  category: { name: string | null } | null
  user: { firstName: string | null; lastName: string | null } | null
}

type RankingRecord = {
  month: Date
  productId: string
  rank: number
  score: number | null
  upvotes: number | null
  product: RankingProduct
}

export type LeaderboardRankingInsight = {
  productId: string
  rank: number
  score: number
  monthlyUpvotes: number
  totalUpvotes: number
  rankChange: number | null
  scoreChange: number | null
  upvoteChange: number | null
  previousRank: number | null
  previousScore: number | null
  previousUpvotes: number | null
  isNew: boolean
  product: RankingProduct
}

export type LeaderboardSummary = {
  rankedCount: number
  totalMonthlyUpvotes: number
  totalScore: number
  averageMonthlyUpvotes: number
  medianMonthlyUpvotes: number
  averageScore: number
  topMonthlyUpvotes: number | null
  topScore: number | null
  bottomScore: number | null
  returningCount: number
  newCount: number
  improvingCount: number
  decliningCount: number
  stableCount: number
  returningRate: number
  championScoreDelta: number | null
  championUpvoteDelta: number | null
  scoreSpread: number | null
}

export type LeaderboardHistoryEntry = {
  month: string
  label: string
  totalMonthlyUpvotes: number
  totalScore: number
  averageScore: number
  championScore: number | null
  championProduct: {
    id: string
    name: string
    slug: string
  } | null
}

export type LeaderboardScoringAnalytics = {
  month: {
    key: string
    label: string
    start: Date
    end: Date
  }
  availableMonths: Array<{ key: string; label: string }>
  rankings: LeaderboardRankingInsight[]
  summary: LeaderboardSummary
  history: LeaderboardHistoryEntry[]
}

type Options = {
  month?: string
  limit?: number
  historyMonths?: number
}

type SerializableLeaderboardScoringAnalytics = Omit<
  LeaderboardScoringAnalytics,
  "month"
> & {
  month: {
    key: string
    label: string
    start: string
    end: string
  }
}

function serializeLeaderboardAnalytics(
  analytics: LeaderboardScoringAnalytics,
): string {
  const payload: SerializableLeaderboardScoringAnalytics = {
    ...analytics,
    month: {
      key: analytics.month.key,
      label: analytics.month.label,
      start: analytics.month.start.toISOString(),
      end: analytics.month.end.toISOString(),
    },
  }

  return JSON.stringify(payload)
}

function deserializeLeaderboardAnalytics(
  value: string,
): LeaderboardScoringAnalytics {
  const parsed = JSON.parse(
    value,
  ) as SerializableLeaderboardScoringAnalytics

  return {
    ...parsed,
    month: {
      key: parsed.month.key,
      label: parsed.month.label,
      start: new Date(parsed.month.start),
      end: new Date(parsed.month.end),
    },
  }
}

function buildLeaderboardCacheKey(
  month: string | undefined,
  limit: number,
  historyMonths: number,
): string {
  const monthToken = month && month.trim().length > 0 ? month.trim() : "current"

  return buildCacheKey(
    "admin",
    "analytics",
    "leaderboard",
    `month:${monthToken}`,
    `limit:${limit}`,
    `history:${historyMonths}`,
  )
}

const getMonthWindow = (month: Date) => {
  const start = normalizeMonth(month)
  const end = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1),
  )
  return { start, end }
}

const calcMedian = (values: number[]) => {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2
  }
  return sorted[mid]
}

const computeScore = (record: RankingRecord) => {
  const monthlyUpvotes = record.upvotes ?? 0
  const totalUpvotes = record.product.analytics?.upvotes ?? 0
  if (typeof record.score === "number") {
    return record.score
  }
  return monthlyUpvotes * 100 + totalUpvotes
}

const sameMonth = (a: Date, b: Date) => a.getTime() === b.getTime()

export async function getLeaderboardScoringAnalytics(
  options: Options = {},
): Promise<LeaderboardScoringAnalytics> {
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 200)
  const historyMonths = Math.min(Math.max(options.historyMonths ?? 6, 1), 24)

  const cacheKey = buildLeaderboardCacheKey(
    options.month,
    limit,
    historyMonths,
  )

  const cachedAnalytics = await cacheHit<LeaderboardScoringAnalytics>({
    key: cacheKey,
    deserialize: deserializeLeaderboardAnalytics,
    onError: (error) => {
      console.error("[analytics] failed to read leaderboard scoring cache", {
        cacheKey,
        month: options.month ?? null,
        limit,
        historyMonths,
        error,
      })
    },
  })

  if (cachedAnalytics) {
    return cachedAnalytics
  }

  const monthsRaw = await prisma.monthlyProductRanking.findMany({
    distinct: ["month"],
    orderBy: { month: "desc" },
    select: { month: true },
  })

  const monthDates = monthsRaw.map(({ month }) => normalizeMonth(month))

  const resolvedMonth = (() => {
    const parsed = parseMonthKey(options.month)
    if (parsed) {
      const normalized = normalizeMonth(parsed)
      const match = monthDates.find((candidate) =>
        sameMonth(candidate, normalized),
      )
      if (match) return match
    }
    return monthDates[0] ?? normalizeMonth(new Date())
  })()

  const { start: monthStart, end: monthEnd } = getMonthWindow(resolvedMonth)
  const monthKey = toMonthKey(monthStart)
  const monthLabel = monthLabelFormatter.format(monthStart)
  const cacheTtlSeconds = resolveCacheTtl("slow")

  if (monthDates.length === 0) {
    const analytics: LeaderboardScoringAnalytics = {
      month: {
        key: monthKey,
        label: monthLabel,
        start: monthStart,
        end: monthEnd,
      },
      availableMonths: [],
      rankings: [],
      summary: {
        rankedCount: 0,
        totalMonthlyUpvotes: 0,
        totalScore: 0,
        averageMonthlyUpvotes: 0,
        medianMonthlyUpvotes: 0,
        averageScore: 0,
        topMonthlyUpvotes: null,
        topScore: null,
        bottomScore: null,
        returningCount: 0,
        newCount: 0,
        improvingCount: 0,
        decliningCount: 0,
        stableCount: 0,
        returningRate: 0,
        championScoreDelta: null,
        championUpvoteDelta: null,
        scoreSpread: null,
      },
      history: [],
    }

    await cacheMiss({
      key: cacheKey,
      value: analytics,
      ttlSeconds: cacheTtlSeconds,
      serialize: serializeLeaderboardAnalytics,
      onError: (error) => {
        console.error(
          "[analytics] failed to cache empty leaderboard scoring analytics",
          {
            cacheKey,
            error,
          },
        )
      },
    })

    return analytics
  }

  const currentRankingsRaw = await prisma.monthlyProductRanking.findMany({
    where: { month: monthStart },
    orderBy: { rank: "asc" },
    take: limit,
    include: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          tagline: true,
          logo: true,
          analytics: { select: { upvotes: true } },
          category: { select: { name: true } },
          user: { select: { firstName: true, lastName: true } },
        },
      },
    },
  })

  const previousMonth = getPreviousMonth(monthStart)
  const hasPreviousMonth = monthDates.some((date) =>
    sameMonth(date, previousMonth),
  )
  const productIds = hasPreviousMonth
    ? currentRankingsRaw.map((ranking) => ranking.productId)
    : []

  const previousRankingsPromise = productIds.length
    ? prisma.monthlyProductRanking.findMany({
        where: { month: previousMonth, productId: { in: productIds } },
        select: { productId: true, rank: true, score: true, upvotes: true },
      })
    : Promise.resolve(
        [] as Array<{
          productId: string
          rank: number
          score: number | null
          upvotes: number | null
        }>,
      )

  const historyMonthsDates = monthDates
    .slice(0, historyMonths)
    .sort((a, b) => a.getTime() - b.getTime())

  const historyPromise = historyMonthsDates.length
    ? (async () => {
        const rows = await prisma.monthlyProductRanking.findMany({
          where: { month: { in: historyMonthsDates } },
          orderBy: [{ month: "asc" }, { rank: "asc" }],
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                tagline: true,
                logo: true,
                analytics: { select: { upvotes: true } },
                category: { select: { name: true } },
                user: { select: { firstName: true, lastName: true } },
              },
            },
          },
        })

        return rows.map((row) => ({
          month: row.month,
          productId: row.productId,
          rank: row.rank,
          score: row.score,
          upvotes: row.upvotes,
          product: (row as typeof row & { product: RankingProduct }).product,
        })) as RankingRecord[]
      })()
    : Promise.resolve<RankingRecord[]>([])

  const [previousRankingsRaw, historyRaw] = await Promise.all([
    previousRankingsPromise,
    historyPromise,
  ])

  const previousMap = new Map(
    previousRankingsRaw.map((entry) => [entry.productId, entry]),
  )

  const rankings: LeaderboardRankingInsight[] = currentRankingsRaw.map(
    (record) => {
      const previous = previousMap.get(record.productId)
      const score = computeScore(record)
      const monthlyUpvotes = record.upvotes ?? 0
      const totalUpvotes = record.product.analytics?.upvotes ?? 0
      const prevScore =
        typeof previous?.score === "number"
          ? previous.score
          : previous
            ? (previous.upvotes ?? 0) * 100 + totalUpvotes
            : null
      const prevUpvotes = previous?.upvotes ?? null
      const prevRank = previous?.rank ?? null
      const scoreChange = prevScore !== null ? score - prevScore : null
      const upvoteChange =
        prevUpvotes !== null ? monthlyUpvotes - prevUpvotes : null
      const rankChange = prevRank !== null ? prevRank - record.rank : null
      const isNew = previous === undefined

      return {
        productId: record.productId,
        rank: record.rank,
        score,
        monthlyUpvotes,
        totalUpvotes,
        rankChange,
        scoreChange,
        upvoteChange,
        previousRank: prevRank,
        previousScore: prevScore,
        previousUpvotes: prevUpvotes,
        isNew,
        product: record.product,
      }
    },
  )

  const monthlyUpvotesValues = rankings.map((item) => item.monthlyUpvotes)
  const scores = rankings.map((item) => item.score)
  const totalMonthlyUpvotes = monthlyUpvotesValues.reduce(
    (sum, value) => sum + value,
    0,
  )
  const totalScore = scores.reduce((sum, value) => sum + value, 0)
  const rankedCount = rankings.length
  const averageMonthlyUpvotes = rankedCount
    ? totalMonthlyUpvotes / rankedCount
    : 0
  const averageScore = rankedCount ? totalScore / rankedCount : 0
  const medianMonthlyUpvotes = calcMedian(monthlyUpvotesValues)
  const topEntry = rankings[0]
  const bottomEntry = rankings[rankings.length - 1]
  const returningCount = rankings.filter((item) => !item.isNew).length
  const newCount = rankings.filter((item) => item.isNew).length
  const improvingCount = rankings.filter(
    (item) => typeof item.rankChange === "number" && item.rankChange > 0,
  ).length
  const decliningCount = rankings.filter(
    (item) => typeof item.rankChange === "number" && item.rankChange < 0,
  ).length
  const stableCount = rankings.filter(
    (item) => typeof item.rankChange === "number" && item.rankChange === 0,
  ).length
  const returningRate = rankedCount ? (returningCount / rankedCount) * 100 : 0

  const championPrev = topEntry
    ? previousMap.get(topEntry.productId)
    : undefined
  const championScoreDelta =
    topEntry && championPrev
      ? topEntry.score -
        computeScore({
          month: monthStart,
          productId: topEntry.productId,
          rank: championPrev.rank,
          score: championPrev.score,
          upvotes: championPrev.upvotes,
          product: topEntry.product,
        })
      : null
  const championUpvoteDelta = topEntry
    ? championPrev
      ? topEntry.monthlyUpvotes - (championPrev.upvotes ?? 0)
      : null
    : null

  const scoreSpread =
    topEntry && bottomEntry ? topEntry.score - bottomEntry.score : null

  const summary: LeaderboardSummary = {
    rankedCount,
    totalMonthlyUpvotes,
    totalScore,
    averageMonthlyUpvotes,
    medianMonthlyUpvotes,
    averageScore,
    topMonthlyUpvotes: topEntry?.monthlyUpvotes ?? null,
    topScore: topEntry?.score ?? null,
    bottomScore: bottomEntry?.score ?? null,
    returningCount,
    newCount,
    improvingCount,
    decliningCount,
    stableCount,
    returningRate,
    championScoreDelta,
    championUpvoteDelta,
    scoreSpread,
  }

  const history = (() => {
    if (!historyRaw.length) return [] as LeaderboardHistoryEntry[]
    const grouped = new Map<string, { month: Date; records: RankingRecord[] }>()
    historyRaw.forEach((record) => {
      const key = toMonthKey(record.month)
      const bucket = grouped.get(key)
      if (bucket) {
        bucket.records.push(record)
      } else {
        grouped.set(key, {
          month: normalizeMonth(record.month),
          records: [record],
        })
      }
    })

    const entries: LeaderboardHistoryEntry[] = []
    Array.from(grouped.values())
      .sort((a, b) => a.month.getTime() - b.month.getTime())
      .forEach(({ month, records }) => {
        const key = toMonthKey(month)
        const label = monthLabelFormatter.format(month)
        const totalMonthlyUpvotesHistory = records.reduce(
          (sum, record) => sum + (record.upvotes ?? 0),
          0,
        )
        const scoresHistory = records.map((record) => computeScore(record))
        const totalScoreHistory = scoresHistory.reduce(
          (sum, val) => sum + val,
          0,
        )
        const averageScoreHistory = records.length
          ? totalScoreHistory / records.length
          : 0
        const champion = records.find((record) => record.rank === 1) ?? null
        const championScore = champion ? computeScore(champion) : null
        const championProduct = champion
          ? {
              id: champion.product.id,
              name: champion.product.name,
              slug: champion.product.slug,
            }
          : null

        entries.push({
          month: key,
          label,
          totalMonthlyUpvotes: totalMonthlyUpvotesHistory,
          totalScore: totalScoreHistory,
          averageScore: averageScoreHistory,
          championScore,
          championProduct,
        })
      })

    return entries
  })()

  const analytics: LeaderboardScoringAnalytics = {
    month: {
      key: monthKey,
      label: monthLabel,
      start: monthStart,
      end: monthEnd,
    },
    availableMonths: monthDates.map((date) => ({
      key: toMonthKey(date),
      label: monthLabelFormatter.format(date),
    })),
    rankings,
    summary,
    history,
  }

  await cacheMiss({
    key: cacheKey,
    value: analytics,
    ttlSeconds: cacheTtlSeconds,
    serialize: serializeLeaderboardAnalytics,
    onError: (error) => {
      console.error(
        "[analytics] failed to cache leaderboard scoring analytics",
        {
          cacheKey,
          month: options.month ?? null,
          limit,
          historyMonths,
          error,
        },
      )
    },
  })

  return analytics
}

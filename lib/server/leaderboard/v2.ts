import prisma from "@/lib/prisma"
import { getAnalyticsProvider } from "@/lib/server/analytics/store"

type MetricMaps = {
  views: Map<string, number>
  uniqueVisitors: Map<string, number>
  upvotes: Map<string, number>
}

export type LeaderboardWeights = {
  views: number
  uniqueVisitors: number
  upvotes: number
}

const DEFAULT_WEIGHTS: LeaderboardWeights = {
  views: 1,
  uniqueVisitors: 3,
  upvotes: 10,
}

type ScoreRow = {
  productId: string
  views: number
  uniqueVisitors: number
  upvotes: number
  score: number
  scoreComponents: Record<string, number>
  rank?: number
}

export type LeaderboardScoreRow = ScoreRow & { rank: number }

function metricsHaveActivity(metrics: MetricMaps): boolean {
  return [metrics.views, metrics.uniqueVisitors, metrics.upvotes].some((map) =>
    Array.from(map.values()).some((value) => value > 0),
  )
}

export async function createLeaderboardRun(input: {
  periodStart: Date
  periodEnd: Date
}): Promise<{ id: string; periodStart: Date; periodEnd: Date }> {
  return prisma.leaderboardRun.upsert({
    where: {
      periodStart_periodEnd: {
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
      },
    },
    create: {
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      status: "pending",
    },
    update: {},
    select: { id: true, periodStart: true, periodEnd: true },
  })
}

export async function generateLeaderboardRun(options: {
  periodStart: Date
  periodEnd: Date
  weights?: LeaderboardWeights
  asOf?: Date
}): Promise<{ runId: string; scores: number; windowEnd: Date }> {
  const run = await createLeaderboardRun(options)

  console.info("[leaderboard] generate run start", {
    runId: run.id,
    periodStart: options.periodStart.toISOString(),
    periodEnd: options.periodEnd.toISOString(),
    asOf: options.asOf?.toISOString(),
  })

  await prisma.leaderboardRun.update({
    where: { id: run.id },
    data: { status: "processing" },
  })

  const weights = options.weights ?? DEFAULT_WEIGHTS
  const windowEnd = resolveWindowEnd(options.periodEnd, options.asOf)
  const metrics = await collectMetrics(options.periodStart, windowEnd)
  const hasActivity = metricsHaveActivity(metrics)
  const rankedRows = hasActivity
    ? applyRanks(computeScores(metrics, weights, []))
    : []

  await persistScores(run.id, rankedRows)

  await prisma.leaderboardRun.update({
    where: { id: run.id },
    data: { status: "finalized" },
  })

  console.info("[leaderboard] generate run complete", {
    runId: run.id,
    rows: rankedRows.length,
    windowEnd: windowEnd.toISOString(),
  })

  return { runId: run.id, scores: rankedRows.length, windowEnd }
}

export function getCurrentLeaderboardWindow(now: Date = new Date()): {
  periodStart: Date
  periodEnd: Date
} {
  const year = now.getUTCFullYear()
  const month = now.getUTCMonth()
  const periodStart = new Date(Date.UTC(year, month, 1))
  const periodEnd = new Date(Date.UTC(year, month + 1, 1))
  return { periodStart, periodEnd }
}

export async function refreshLeaderboardForProducts(options: {
  productIds: string[]
  weights?: LeaderboardWeights
  now?: Date
}) {
  const now = options.now ?? new Date()
  const { periodStart, periodEnd } = getCurrentLeaderboardWindow(now)

  return updateLeaderboardScoresForProducts({
    periodStart,
    periodEnd,
    productIds: options.productIds,
    weights: options.weights,
    asOf: now,
  })
}

export async function getCurrentLeaderboardRun(now: Date = new Date()) {
  const { periodStart, periodEnd } = getCurrentLeaderboardWindow(now)
  return prisma.leaderboardRun.findUnique({
    where: { periodStart_periodEnd: { periodStart, periodEnd } },
    select: { id: true, periodStart: true, periodEnd: true, status: true },
  })
}

export async function getProductScoreForCurrentWindow(
  productId: string,
  now: Date = new Date(),
) {
  const run = await getCurrentLeaderboardRun(now)
  if (!run) return null

  return prisma.productLeaderboardScore.findUnique({
    where: {
      runId_productId: {
        runId: run.id,
        productId,
      },
    },
    select: {
      id: true,
      runId: true,
      productId: true,
      score: true,
      rank: true,
      views: true,
      uniqueVisitors: true,
      upvotes: true,
      scoreComponents: true,
      updatedAt: true,
    },
  })
}

export async function computeLeaderboardWindow(options: {
  periodStart: Date
  periodEnd: Date
  weights?: LeaderboardWeights
  asOf?: Date
  productIds?: string[]
  limit?: number
}): Promise<LeaderboardScoreRow[]> {
  const windowEnd = resolveWindowEnd(options.periodEnd, options.asOf)
  const weights = options.weights ?? DEFAULT_WEIGHTS
  const productIds = options.productIds?.filter(Boolean)

  const metrics = productIds?.length
    ? await collectMetricsForProducts(
        productIds,
        options.periodStart,
        windowEnd,
      )
    : await collectMetrics(options.periodStart, windowEnd)

  const hasActivity = metricsHaveActivity(metrics)
  if (!hasActivity) return []

  // Only rank products that have a non-zero score.
  const rows = computeScores(metrics, weights, productIds ?? []).filter(
    (row) => row.score > 0,
  )

  const ranked = applyRanks(rows) as LeaderboardScoreRow[]
  return typeof options.limit === "number"
    ? ranked.slice(0, options.limit)
    : ranked
}

export async function updateLeaderboardScoresForProducts(options: {
  periodStart: Date
  periodEnd: Date
  productIds: string[]
  weights?: LeaderboardWeights
  asOf?: Date
}): Promise<{ runId: string; updated: number; windowEnd: Date }> {
  const productIds = Array.from(new Set(options.productIds)).filter(Boolean)
  if (!productIds.length) {
    return { runId: "", updated: 0, windowEnd: options.periodEnd }
  }

  const run = await createLeaderboardRun(options)

  const windowEnd = resolveWindowEnd(options.periodEnd, options.asOf)
  const weights = options.weights ?? DEFAULT_WEIGHTS
  const metrics = await collectMetricsForProducts(
    productIds,
    options.periodStart,
    windowEnd,
  )
  const rows = computeScores(metrics, weights, productIds)

  if (!rows.length) {
    const { runId } = await generateLeaderboardRun({
      periodStart: options.periodStart,
      periodEnd: options.periodEnd,
      weights: options.weights,
      asOf: options.asOf,
    })
    return { runId, updated: 0, windowEnd }
  }

  console.info("[leaderboard] update scores for products", {
    runId: run.id,
    products: rows.length,
  })

  // Upsert scores for the affected products first.
  const slugsById = await fetchProductSlugs(rows.map((row) => row.productId))

  for (const row of rows) {
    const slug = slugsById.get(row.productId) ?? "unknown"
    console.info("[leaderboard] upsert score", {
      runId: run.id,
      productSlug: slug,
      score: row.score,
      views: row.views,
      uniqueVisitors: row.uniqueVisitors,
      upvotes: row.upvotes,
    })

    await prisma.productLeaderboardScore.upsert({
      where: {
        runId_productId: {
          runId: run.id,
          productId: row.productId,
        },
      },
      create: {
        runId: run.id,
        productId: row.productId,
        views: row.views,
        uniqueVisitors: row.uniqueVisitors,
        upvotes: row.upvotes,
        score: row.score,
        scoreComponents: row.scoreComponents,
      },
      update: {
        views: row.views,
        uniqueVisitors: row.uniqueVisitors,
        upvotes: row.upvotes,
        score: row.score,
        scoreComponents: row.scoreComponents,
      },
    })
  }

  // Re-rank the full run outside the upsert transaction to avoid timeouts.
  await refreshRanksForRun(run.id)

  // Revalidate cached leaderboard payloads to surface score updates.
  try {
    const { revalidateLeaderboard } = await import("@/lib/cache/revalidate")
    revalidateLeaderboard("update")
  } catch (error) {
    console.error("[leaderboard] failed to revalidate leaderboard cache", {
      error,
    })
  }

  return { runId: run.id, updated: rows.length, windowEnd }
}

function resolveWindowEnd(periodEnd: Date, asOf?: Date): Date {
  if (!asOf) return periodEnd
  return new Date(Math.min(periodEnd.getTime(), asOf.getTime()))
}

async function collectMetrics(
  periodStart: Date,
  periodEnd: Date,
): Promise<MetricMaps> {
  const analyticsProvider = getAnalyticsProvider("cache")
  const products: Array<{ id: string; slug: string }> =
    await prisma.product.findMany({
      where: { status: "published" },
      select: { id: true, slug: true },
    })

  const dateRange = buildDateRange(periodStart, periodEnd)
  const gaMap = await analyticsProvider.getProductTrafficMap({
    products,
    dateRange,
  })

  const metrics: MetricMaps = {
    views: new Map(),
    uniqueVisitors: new Map(),
    upvotes: new Map(),
  }

  for (const [productId, values] of gaMap.entries()) {
    metrics.views.set(productId, values.pageViews)
    metrics.uniqueVisitors.set(productId, values.uniqueVisitors)
  }

  const productIds = products.map((product: { id: string }) => product.id)

  const upvotes = await prisma.productUpvote.groupBy({
    by: ["productId"],
    where: {
      productId: { in: productIds },
      createdAt: { gte: periodStart, lt: periodEnd },
      product: { status: "published" },
    },
    _count: { productId: true },
  })

  for (const entry of upvotes) {
    metrics.upvotes.set(entry.productId, Number(entry._count?.productId ?? 0))
  }

  return metrics
}

async function collectMetricsForProducts(
  productIds: string[],
  periodStart: Date,
  periodEnd: Date,
): Promise<MetricMaps> {
  const analyticsProvider = getAnalyticsProvider("cache")
  const products: Array<{ id: string; slug: string }> =
    await prisma.product.findMany({
      where: { id: { in: productIds }, status: "published" },
      select: { id: true, slug: true },
    })

  const dateRange = buildDateRange(periodStart, periodEnd)
  const gaMap = await analyticsProvider.getProductTrafficMap({
    products,
    dateRange,
  })

  const metrics: MetricMaps = {
    views: new Map(),
    uniqueVisitors: new Map(),
    upvotes: new Map(),
  }

  for (const [productId, values] of gaMap.entries()) {
    metrics.views.set(productId, values.pageViews)
    metrics.uniqueVisitors.set(productId, values.uniqueVisitors)
  }

  const upvotes = await prisma.productUpvote.groupBy({
    by: ["productId"],
    where: {
      productId: { in: productIds },
      createdAt: { gte: periodStart, lt: periodEnd },
      product: { status: "published" },
    },
    _count: { productId: true },
  })

  for (const entry of upvotes) {
    metrics.upvotes.set(entry.productId, Number(entry._count?.productId ?? 0))
  }

  return metrics
}

function buildDateRange(periodStart: Date, periodEnd: Date) {
  const start = formatDate(periodStart)
  const endDate = new Date(periodEnd)
  endDate.setUTCDate(endDate.getUTCDate() - 1)
  const end = formatDate(endDate < periodStart ? periodStart : endDate)
  return { startDate: start, endDate: end }
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function computeScores(
  metrics: MetricMaps,
  weights: LeaderboardWeights,
  seedProductIds: string[] = [],
): ScoreRow[] {
  const productIds = new Set<string>([
    ...seedProductIds,
    ...metrics.views.keys(),
    ...metrics.uniqueVisitors.keys(),
    ...metrics.upvotes.keys(),
  ])

  const baseRows: Array<
    Omit<ScoreRow, "score" | "scoreComponents" | "rank"> & {
      baseScore: number
      baseScoreComponents: Record<string, number>
    }
  > = []

  const rows: ScoreRow[] = []

  for (const productId of productIds) {
    const views = metrics.views.get(productId) ?? 0
    const uniqueVisitors = metrics.uniqueVisitors.get(productId) ?? 0
    const upvotes = metrics.upvotes.get(productId) ?? 0
    const baseScoreComponents = {
      views: views * weights.views,
      uniqueVisitors: uniqueVisitors * weights.uniqueVisitors,
      upvotes: upvotes * weights.upvotes,
    }

    const baseScore = Object.values(baseScoreComponents).reduce(
      (total, value) => total + value,
      0,
    )

    baseRows.push({
      productId,
      views,
      uniqueVisitors,
      upvotes,
      baseScore,
      baseScoreComponents,
    })
  }

  for (const entry of baseRows) {
    const score = entry.baseScore <= 0 ? 0 : entry.baseScore
    rows.push({
      productId: entry.productId,
      views: entry.views,
      uniqueVisitors: entry.uniqueVisitors,
      upvotes: entry.upvotes,
      score,
      scoreComponents: {
        ...entry.baseScoreComponents,
        baseScore: entry.baseScore,
        finalScore: score,
      },
    })
  }

  return rows
}

async function fetchProductSlugs(
  productIds: string[],
): Promise<Map<string, string>> {
  if (!productIds.length) return new Map()

  const rows = await prisma.product.findMany({
    where: { id: { in: Array.from(new Set(productIds)) } },
    select: { id: true, slug: true },
  })

  return rows.reduce<Map<string, string>>(
    (acc: Map<string, string>, row: { id: string; slug: string }) => {
      acc.set(row.id, row.slug)
      return acc
    },
    new Map<string, string>(),
  )
}

function applyRanks(rows: ScoreRow[]): ScoreRow[] {
  const sorted = [...rows].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    if (b.upvotes !== a.upvotes) return b.upvotes - a.upvotes
    if (b.uniqueVisitors !== a.uniqueVisitors)
      return b.uniqueVisitors - a.uniqueVisitors
    if (b.views !== a.views) return b.views - a.views
    return a.productId.localeCompare(b.productId)
  })

  return sorted.map((row, index) => ({ ...row, rank: index + 1 }))
}

async function persistScores(runId: string, rows: ScoreRow[]) {
  // Clear existing rows for the run first to avoid long-lived transactions.
  await prisma.productLeaderboardScore.deleteMany({ where: { runId } })

  if (!rows.length) return

  console.info("[leaderboard] persist scores", { runId, rows: rows.length })

  const slugsById = await fetchProductSlugs(rows.map((row) => row.productId))

  // Insert in small batches to keep each transaction short and avoid timeouts.
  const BATCH_SIZE = 200
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE)
    await prisma.productLeaderboardScore.createMany({
      data: batch.map((row) => ({
        runId,
        productId: row.productId,
        views: row.views,
        uniqueVisitors: row.uniqueVisitors,
        upvotes: row.upvotes,
        score: row.score,
        scoreComponents: row.scoreComponents,
        rank: row.rank,
      })),
    })

    console.info("[leaderboard] persisted batch", {
      runId,
      batchSize: batch.length,
      sample: batch.slice(0, 3).map((row) => ({
        productSlug: slugsById.get(row.productId) ?? "unknown",
        score: row.score,
      })),
    })
  }

  await refreshRanksForRun(runId)
}

async function refreshRanksForRun(runId: string) {
  const total = await prisma.productLeaderboardScore.count({ where: { runId } })
  console.info("[leaderboard] refresh ranks start", { runId, total })

  // One pass ranking to keep operations short; uses window function.
  await prisma.$executeRaw`
    WITH ranked AS (
      SELECT
        id,
        ROW_NUMBER() OVER (
          ORDER BY
            "score" DESC,
            "upvotes" DESC,
            "uniqueVisitors" DESC,
            "views" DESC,
            "productId" ASC
        ) AS rank_value
      FROM "ProductLeaderboardScore"
      WHERE "runId" = ${runId}
    )
    UPDATE "ProductLeaderboardScore" pls
    SET "rank" = ranked.rank_value
    FROM ranked
    WHERE pls.id = ranked.id;
  `

  const sample = await prisma.productLeaderboardScore.findMany({
    where: { runId },
    orderBy: { rank: "asc" },
    take: 3,
    select: {
      rank: true,
      productId: true,
    },
  })
  const slugs = await fetchProductSlugs(
    sample.map((row: { productId: string }) => row.productId),
  )

  console.info("[leaderboard] refresh ranks complete", {
    runId,
    total,
    sample: sample.map((row: { rank: number | null; productId: string }) => ({
      rank: row.rank,
      productSlug: slugs.get(row.productId) ?? "unknown",
    })),
  })
}

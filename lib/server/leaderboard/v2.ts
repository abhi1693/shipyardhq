import prisma from "@/lib/prisma"
import { applyCache, DEFAULT_TTL, TAGS } from "@/lib/cache"
import {
  capDailyLeaderboardTraffic,
  DEFAULT_LEADERBOARD_WEIGHTS,
  scoreLeaderboardMetrics,
  type LeaderboardWeights,
} from "@/lib/server/leaderboard/scoring"
import { hasAnalyticsIngestionCoverage } from "@/lib/server/analytics/ingestion/coverage"

export type { LeaderboardWeights } from "@/lib/server/leaderboard/scoring"

type MetricMaps = {
  browserRequests: Map<string, number>
  browserVisits: Map<string, number>
  scoredBrowserRequests: Map<string, number>
  scoredBrowserVisits: Map<string, number>
  upvotes: Map<string, number>
}

type ScoreRow = {
  productId: string
  browserRequests: number
  browserVisits: number
  upvotes: number
  score: number
  scoreComponents: Record<string, number>
  rank?: number
}

export type LeaderboardScoreRow = ScoreRow & { rank: number }

function metricsHaveActivity(metrics: MetricMaps): boolean {
  return [metrics.browserRequests, metrics.browserVisits, metrics.upvotes].some(
    (map) => Array.from(map.values()).some((value) => value > 0),
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
}): Promise<{
  runId: string
  scores: number
  windowEnd: Date
  deferred: boolean
}> {
  const windowEnd = resolveWindowEnd(options.periodEnd, options.asOf)
  if (!(await hasLatestScoringTrafficRollup(options.periodStart, windowEnd))) {
    console.info("[leaderboard] generate run deferred", {
      periodStart: options.periodStart.toISOString(),
      windowEnd: windowEnd.toISOString(),
      reason: "analytics-pending",
    })
    return { runId: "", scores: 0, windowEnd, deferred: true }
  }

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

  const weights = options.weights ?? DEFAULT_LEADERBOARD_WEIGHTS
  const metrics = await collectMetrics(options.periodStart, windowEnd)
  const hasActivity = metricsHaveActivity(metrics)
  const rankedRows = hasActivity
    ? applyRanks(
        computeScores(metrics, weights, []).filter((row) => row.score > 0),
      )
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

  return {
    runId: run.id,
    scores: rankedRows.length,
    windowEnd,
    deferred: false,
  }
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
  "use cache"
  applyCache([TAGS.leaderboard, TAGS.product(productId)], DEFAULT_TTL.fast)

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
  if (!(await hasScoringTrafficCoverage(options.periodStart, windowEnd))) {
    return []
  }

  const weights = options.weights ?? DEFAULT_LEADERBOARD_WEIGHTS
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
}): Promise<{
  runId: string
  updated: number
  windowEnd: Date
  deferred: boolean
}> {
  const productIds = Array.from(new Set(options.productIds)).filter(Boolean)
  if (!productIds.length) {
    return {
      runId: "",
      updated: 0,
      windowEnd: options.periodEnd,
      deferred: false,
    }
  }

  const windowEnd = resolveWindowEnd(options.periodEnd, options.asOf)
  if (!(await hasLatestScoringTrafficRollup(options.periodStart, windowEnd))) {
    return { runId: "", updated: 0, windowEnd, deferred: true }
  }

  const run = await createLeaderboardRun(options)
  const weights = options.weights ?? DEFAULT_LEADERBOARD_WEIGHTS
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
    return { runId, updated: 0, windowEnd, deferred: false }
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
      browserRequests: row.browserRequests,
      browserVisits: row.browserVisits,
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
        views: row.browserRequests,
        uniqueVisitors: row.browserVisits,
        upvotes: row.upvotes,
        score: row.score,
        scoreComponents: row.scoreComponents,
      },
      update: {
        views: row.browserRequests,
        uniqueVisitors: row.browserVisits,
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

  return {
    runId: run.id,
    updated: rows.length,
    windowEnd,
    deferred: false,
  }
}

const DAY_MS = 24 * 60 * 60 * 1000

async function hasScoringTrafficCoverage(
  periodStart: Date,
  windowEnd: Date,
): Promise<boolean> {
  if (windowEnd <= periodStart) return false

  return hasAnalyticsIngestionCoverage("product_traffic_daily", {
    start: periodStart,
    end: new Date(windowEnd.getTime() - DAY_MS),
  })
}

async function hasLatestScoringTrafficRollup(
  periodStart: Date,
  windowEnd: Date,
): Promise<boolean> {
  if (windowEnd <= periodStart) return false

  const latestCompletedDay = new Date(windowEnd.getTime() - DAY_MS)
  return hasAnalyticsIngestionCoverage("product_traffic_daily", {
    start: latestCompletedDay,
    end: latestCompletedDay,
  })
}

function resolveWindowEnd(periodEnd: Date, asOf?: Date): Date {
  if (!asOf) return periodEnd

  // Traffic is stored as completed UTC-day rollups. Keep every scoring signal
  // on that same boundary so current-day upvotes are not scored without the
  // corresponding traffic data.
  const completedDayBoundary = new Date(
    Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth(), asOf.getUTCDate()),
  )
  return new Date(Math.min(periodEnd.getTime(), completedDayBoundary.getTime()))
}

async function collectMetrics(
  periodStart: Date,
  periodEnd: Date,
): Promise<MetricMaps> {
  const products: Array<{ id: string; slug: string }> =
    await prisma.product.findMany({
      where: { status: "published" },
      select: { id: true, slug: true },
    })

  return collectMetricsForProductList(products, periodStart, periodEnd)
}

async function collectMetricsForProducts(
  productIds: string[],
  periodStart: Date,
  periodEnd: Date,
): Promise<MetricMaps> {
  const products: Array<{ id: string; slug: string }> =
    await prisma.product.findMany({
      where: { id: { in: productIds }, status: "published" },
      select: { id: true, slug: true },
    })

  return collectMetricsForProductList(products, periodStart, periodEnd)
}

async function collectMetricsForProductList(
  products: Array<{ id: string; slug: string }>,
  periodStart: Date,
  periodEnd: Date,
): Promise<MetricMaps> {
  const productIds = products.map((product: { id: string }) => product.id)
  if (!productIds.length) {
    return {
      browserRequests: new Map(),
      browserVisits: new Map(),
      scoredBrowserRequests: new Map(),
      scoredBrowserVisits: new Map(),
      upvotes: new Map(),
    }
  }

  const [trafficMap, upvotes] = await Promise.all([
    getStoredProductScoringTrafficMap(productIds, periodStart, periodEnd),
    prisma.productUpvote.groupBy({
      by: ["productId"],
      where: {
        productId: { in: productIds },
        createdAt: { gte: periodStart, lt: periodEnd },
        product: { status: "published" },
      },
      _count: { productId: true },
    }),
  ])

  const metrics: MetricMaps = {
    browserRequests: new Map(),
    browserVisits: new Map(),
    scoredBrowserRequests: new Map(),
    scoredBrowserVisits: new Map(),
    upvotes: new Map(),
  }

  for (const [productId, values] of trafficMap.entries()) {
    metrics.browserRequests.set(productId, values.browserRequests)
    metrics.browserVisits.set(productId, values.browserVisits)
    metrics.scoredBrowserRequests.set(productId, values.scoredBrowserRequests)
    metrics.scoredBrowserVisits.set(productId, values.scoredBrowserVisits)
  }

  for (const entry of upvotes) {
    metrics.upvotes.set(entry.productId, Number(entry._count?.productId ?? 0))
  }

  return metrics
}

async function getStoredProductScoringTrafficMap(
  productIds: string[],
  periodStart: Date,
  periodEnd: Date,
) {
  const rows = await prisma.productTrafficDaily.findMany({
    where: {
      productId: { in: productIds },
      source: "cloudflare",
      date: { gte: periodStart, lt: periodEnd },
    },
    select: {
      productId: true,
      browserRequests: true,
      browserVisits: true,
    },
  })

  const results = new Map<
    string,
    {
      browserRequests: number
      browserVisits: number
      scoredBrowserRequests: number
      scoredBrowserVisits: number
    }
  >()

  for (const productId of productIds) {
    results.set(productId, {
      browserRequests: 0,
      browserVisits: 0,
      scoredBrowserRequests: 0,
      scoredBrowserVisits: 0,
    })
  }

  for (const row of rows) {
    const current = results.get(row.productId)
    if (!current) continue
    const browserRequests = Math.max(0, Number(row.browserRequests ?? 0))
    const browserVisits = Math.max(0, Number(row.browserVisits ?? 0))
    const scored = capDailyLeaderboardTraffic({
      browserRequests,
      browserVisits,
    })
    current.browserRequests += browserRequests
    current.browserVisits += browserVisits
    current.scoredBrowserRequests += scored.browserRequests
    current.scoredBrowserVisits += scored.browserVisits
  }

  return results
}

function computeScores(
  metrics: MetricMaps,
  weights: LeaderboardWeights,
  seedProductIds: string[] = [],
): ScoreRow[] {
  const productIds = new Set<string>([
    ...seedProductIds,
    ...metrics.browserRequests.keys(),
    ...metrics.browserVisits.keys(),
    ...metrics.upvotes.keys(),
  ])

  const rows: ScoreRow[] = []

  for (const productId of productIds) {
    const browserRequests = metrics.browserRequests.get(productId) ?? 0
    const browserVisits = metrics.browserVisits.get(productId) ?? 0
    const scoredBrowserRequests =
      metrics.scoredBrowserRequests.get(productId) ?? 0
    const scoredBrowserVisits = metrics.scoredBrowserVisits.get(productId) ?? 0
    const upvotes = metrics.upvotes.get(productId) ?? 0
    const scored = scoreLeaderboardMetrics(
      {
        browserRequests: scoredBrowserRequests,
        browserVisits: scoredBrowserVisits,
        upvotes,
      },
      weights,
    )

    rows.push({
      productId,
      browserRequests,
      browserVisits,
      upvotes,
      score: scored.score,
      scoreComponents: {
        browserRequests,
        browserVisits,
        ...scored.components,
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
    if (b.browserVisits !== a.browserVisits)
      return b.browserVisits - a.browserVisits
    if (b.browserRequests !== a.browserRequests)
      return b.browserRequests - a.browserRequests
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
        views: row.browserRequests,
        uniqueVisitors: row.browserVisits,
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

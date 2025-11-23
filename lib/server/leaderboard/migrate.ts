import prisma from "@/lib/prisma"
import { normalizeMonth } from "@/lib/server/monthlyLeaderboard"

type MigrationOptions = {
  /**
   * When true, do not write to the database; only report what would happen.
   */
  dryRun?: boolean
  /**
   * When true, existing ProductLeaderboardScore rows for a run will be
   * replaced using legacy data. Defaults to skipping runs that already
   * have scores.
   */
  overwriteExisting?: boolean
}

type MigrationSummary = {
  months: number
  runsCreated: number
  runsUpdated: number
  runsSkipped: number
  scoresWritten: number
}

type LegacyRanking = {
  productId: string
  month: Date
  rank: number
  score: number | null
  upvotes: number | null
}

export async function migrateLegacyMonthlyLeaderboard(
  options: MigrationOptions = {},
): Promise<MigrationSummary> {
  const legacy = await prisma.monthlyProductRanking.findMany({
    select: {
      productId: true,
      month: true,
      rank: true,
      score: true,
      upvotes: true,
    },
    orderBy: [{ month: "asc" }, { rank: "asc" }],
  })

  const summary: MigrationSummary = {
    months: 0,
    runsCreated: 0,
    runsUpdated: 0,
    runsSkipped: 0,
    scoresWritten: 0,
  }

  if (!legacy.length) {
    return summary
  }

  const groups = legacy.reduce<Map<string, LegacyRanking[]>>((acc, row) => {
    const monthStart = normalizeMonth(row.month)
    const key = monthStart.toISOString()
    const existing = acc.get(key) ?? []
    existing.push(row)
    acc.set(key, existing)
    return acc
  }, new Map<string, LegacyRanking[]>())

  for (const [monthKey, rankings] of groups.entries()) {
    const periodStart = new Date(monthKey)
    const periodEnd = new Date(
      Date.UTC(
        periodStart.getUTCFullYear(),
        periodStart.getUTCMonth() + 1,
        1,
      ),
    )

    summary.months += 1
    const existingRun = await prisma.leaderboardRun.findUnique({
      where: { periodStart_periodEnd: { periodStart, periodEnd } },
      select: { id: true },
    })
    const run = await prisma.leaderboardRun.upsert({
      where: { periodStart_periodEnd: { periodStart, periodEnd } },
      create: {
        periodStart,
        periodEnd,
        status: "finalized",
      },
      update: {},
      select: { id: true },
    })

    const existingScores = await prisma.productLeaderboardScore.count({
      where: { runId: run.id },
    })
    if (existingScores > 0 && !options.overwriteExisting) {
      summary.runsSkipped += 1
      continue
    }

    const rows = rankings.map((entry) => {
      const upvotes = entry.upvotes ?? 0
      const score = entry.score ?? upvotes
      return {
        runId: run.id,
        productId: entry.productId,
        views: 0,
        uniqueVisitors: 0,
        clicks: 0,
        upvotes,
        reviewsCount: 0,
        reviewsRatingSum: 0,
        score,
        scoreComponents: {
          legacyScore: score,
          legacyUpvotes: upvotes,
        },
        rank: entry.rank,
      }
    })

    if (existingRun) {
      summary.runsUpdated += 1
    } else {
      summary.runsCreated += 1
    }
    summary.scoresWritten += rows.length

    if (options.dryRun) continue

    await prisma.$transaction(async (tx) => {
      if (existingScores > 0) {
        await tx.productLeaderboardScore.deleteMany({
          where: { runId: run.id },
        })
      }

      if (rows.length) {
        await tx.productLeaderboardScore.createMany({
          data: rows,
          skipDuplicates: true,
        })
      }

      await tx.leaderboardRun.update({
        where: { id: run.id },
        data: { status: "finalized" },
      })
    })
  }

  return summary
}

import prisma from "@/lib/prisma"
import { applyCache, DEFAULT_TTL, TAGS } from "@/lib/cache"
import { getCurrentLeaderboardWindow } from "@/lib/server/leaderboard/v2"

async function getCachedCurrentLeaderboardRunForScores(
  periodStartIso: string,
  periodEndIso: string,
) {
  "use cache"
  applyCache(
    ["leaderboard:current-run:score-map", TAGS.leaderboard],
    DEFAULT_TTL.fast,
  )

  const periodStart = new Date(periodStartIso)
  const periodEnd = new Date(periodEndIso)

  return prisma.leaderboardRun.findUnique({
    where: { periodStart_periodEnd: { periodStart, periodEnd } },
    select: { id: true },
  })
}

/**
 * Fetch a map of productId -> current leaderboard score for the active window.
 * Returns an empty map if there is no active run or no matching rows.
 */
export async function getCurrentScoreMap(
  productIds: string[],
): Promise<Map<string, number>> {
  const uniqueIds = Array.from(new Set(productIds)).filter(Boolean)
  const scores = new Map<string, number>()
  if (!uniqueIds.length) return scores

  const { periodStart, periodEnd } = getCurrentLeaderboardWindow()
  const run = await getCachedCurrentLeaderboardRunForScores(
    periodStart.toISOString(),
    periodEnd.toISOString(),
  )
  if (!run) return scores

  const rows = await prisma.productLeaderboardScore.findMany({
    where: {
      runId: run.id,
      productId: { in: uniqueIds },
    },
    select: {
      productId: true,
      score: true,
    },
  })

  for (const row of rows) {
    scores.set(row.productId, row.score ?? 0)
  }

  return scores
}

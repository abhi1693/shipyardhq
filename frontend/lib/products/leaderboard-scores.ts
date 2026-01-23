import prisma from "@/lib/prisma"
import { getCurrentLeaderboardRun } from "@/lib/server/leaderboard/v2"

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

  const run = await getCurrentLeaderboardRun()
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

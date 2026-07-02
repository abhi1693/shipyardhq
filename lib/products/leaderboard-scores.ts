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

async function addLatestPositiveScores(
  scores: Map<string, number>,
  productIds: string[],
) {
  const missingIds = productIds.filter((productId) => !scores.has(productId))
  if (!missingIds.length) return

  const fallbackRows = await prisma.productLeaderboardScore.findMany({
    where: {
      productId: { in: missingIds },
      score: { gt: 0 },
    },
    orderBy: [{ run: { periodStart: "desc" } }, { score: "desc" }],
    select: {
      productId: true,
      score: true,
    },
  })

  for (const row of fallbackRows) {
    if (!scores.has(row.productId)) {
      scores.set(row.productId, row.score ?? 0)
    }
  }
}

/**
 * Fetch a map of productId -> Shipyard score.
 *
 * Prefer the active leaderboard window, then fall back to each product's latest
 * positive leaderboard score so public cards do not show zero when the current
 * monthly run has not scored that product yet.
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

  if (run) {
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
  }

  await addLatestPositiveScores(scores, uniqueIds)

  return scores
}

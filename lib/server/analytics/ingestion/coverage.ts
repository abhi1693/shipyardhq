import prisma from "@/lib/prisma"
import { CLOUDFLARE_ANALYTICS_DATASET } from "@/lib/server/analytics/cloudflareAnalytics"
import type { IngestionJobKey } from "@/lib/server/analytics/ingestion/shared"

const DAY_MS = 24 * 60 * 60 * 1000

export type AnalyticsCoverageBounds = {
  start: Date
  end: Date
}

export type AnalyticsCoverageRun = {
  windowStart: Date
  windowEnd: Date
  stats: unknown
}

function usesCurrentDataset(stats: unknown): boolean {
  if (!stats || typeof stats !== "object" || Array.isArray(stats)) {
    return false
  }

  return "dataset" in stats && stats.dataset === CLOUDFLARE_ANALYTICS_DATASET
}

export function coversAnalyticsRange(
  runs: AnalyticsCoverageRun[],
  bounds: AnalyticsCoverageBounds,
): boolean {
  const currentRuns = runs
    .filter((run) => usesCurrentDataset(run.stats))
    .sort((a, b) => a.windowStart.getTime() - b.windowStart.getTime())

  let nextUncoveredDay = bounds.start.getTime()
  const requestedEnd = bounds.end.getTime()

  for (const run of currentRuns) {
    const runStart = run.windowStart.getTime()
    const runEnd = run.windowEnd.getTime()

    if (runEnd < nextUncoveredDay) continue
    if (runStart > nextUncoveredDay) return false

    nextUncoveredDay = Math.max(nextUncoveredDay, runEnd + DAY_MS)
    if (nextUncoveredDay > requestedEnd) return true
  }

  return nextUncoveredDay > requestedEnd
}

export async function hasAnalyticsIngestionCoverage(
  job: IngestionJobKey,
  bounds: AnalyticsCoverageBounds,
): Promise<boolean> {
  const runs = await prisma.analyticsIngestionRun.findMany({
    where: {
      source: "cloudflare",
      job,
      status: "completed",
      windowStart: { lte: bounds.end },
      windowEnd: { gte: bounds.start },
    },
    select: {
      windowStart: true,
      windowEnd: true,
      stats: true,
    },
    orderBy: { windowStart: "asc" },
  })

  return coversAnalyticsRange(runs, bounds)
}

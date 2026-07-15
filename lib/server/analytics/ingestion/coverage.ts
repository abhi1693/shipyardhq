import prisma from "@/lib/prisma"
import { CLOUDFLARE_ANALYTICS_DATASET } from "@/lib/server/analytics/cloudflareAnalytics"
import type { IngestionJobKey } from "@/lib/server/analytics/ingestion/shared"

const DAY_MS = 24 * 60 * 60 * 1000

export type AnalyticsCoverageBounds = {
  start: Date
  end: Date
}

export type AnalyticsCoveredRange = AnalyticsCoverageBounds & {
  days: number
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

function startOfUtcDay(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  )
}

function addUtcDays(date: Date, days: number) {
  return new Date(date.getTime() + days * DAY_MS)
}

function dateKey(date: Date) {
  return startOfUtcDay(date).toISOString().slice(0, 10)
}

function countInclusiveDays(start: Date, end: Date) {
  return Math.round((end.getTime() - start.getTime()) / DAY_MS) + 1
}

export function coveredAnalyticsDateKeys(
  runs: AnalyticsCoverageRun[],
  bounds: AnalyticsCoverageBounds,
): Set<string> {
  const keys = new Set<string>()
  const boundsStart = startOfUtcDay(bounds.start)
  const boundsEnd = startOfUtcDay(bounds.end)

  if (boundsStart > boundsEnd) return keys

  for (const run of runs.filter((entry) => usesCurrentDataset(entry.stats))) {
    const runStart = startOfUtcDay(run.windowStart)
    const runEnd = startOfUtcDay(run.windowEnd)
    const start = runStart > boundsStart ? runStart : boundsStart
    const end = runEnd < boundsEnd ? runEnd : boundsEnd

    if (start > end) continue

    for (let cursor = start; cursor <= end; cursor = addUtcDays(cursor, 1)) {
      keys.add(dateKey(cursor))
    }
  }

  return keys
}

export function resolveCoveredAnalyticsRange(
  runsByJob: AnalyticsCoverageRun[][],
  bounds: AnalyticsCoverageBounds,
): AnalyticsCoveredRange | null {
  const boundsStart = startOfUtcDay(bounds.start)
  const boundsEnd = startOfUtcDay(bounds.end)

  if (!runsByJob.length || boundsStart > boundsEnd) return null

  const coverageByJob = runsByJob.map((runs) =>
    coveredAnalyticsDateKeys(runs, { start: boundsStart, end: boundsEnd }),
  )
  const isCoveredByEveryJob = (date: Date) => {
    const key = dateKey(date)
    return coverageByJob.every((coverage) => coverage.has(key))
  }

  let end: Date | null = null
  for (
    let cursor = boundsEnd;
    cursor >= boundsStart;
    cursor = addUtcDays(cursor, -1)
  ) {
    if (isCoveredByEveryJob(cursor)) {
      end = cursor
      break
    }
  }

  if (!end) return null

  let start = end
  for (
    let cursor = addUtcDays(end, -1);
    cursor >= boundsStart;
    cursor = addUtcDays(cursor, -1)
  ) {
    if (!isCoveredByEveryJob(cursor)) break
    start = cursor
  }

  return {
    start,
    end,
    days: countInclusiveDays(start, end),
  }
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

export async function getAnalyticsIngestionCoveredRange(
  jobs: IngestionJobKey[],
  bounds: AnalyticsCoverageBounds,
): Promise<AnalyticsCoveredRange | null> {
  const requestedJobs = Array.from(new Set(jobs))
  if (!requestedJobs.length) return null

  const runsByJob = await Promise.all(
    requestedJobs.map((job) =>
      prisma.analyticsIngestionRun.findMany({
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
      }),
    ),
  )

  return resolveCoveredAnalyticsRange(runsByJob, bounds)
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

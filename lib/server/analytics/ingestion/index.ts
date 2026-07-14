import prisma from "@/lib/prisma"
import { CLOUDFLARE_ANALYTICS_DATASET } from "@/lib/server/analytics/cloudflareAnalytics"
import {
  resolveIngestionWindow,
  type AnalyticsIngestionWindow,
  type IngestionJobKey,
} from "@/lib/server/analytics/ingestion/shared"
import {
  syncProductTrafficDaily,
  type ProductTrafficDailySyncResult,
} from "@/lib/server/analytics/ingestion/productTrafficDaily"
import {
  syncProductTrafficBreakdowns,
  type ProductTrafficBreakdownSyncResult,
} from "@/lib/server/analytics/ingestion/productTrafficBreakdowns"
import {
  syncSiteTrafficDaily,
  type SiteTrafficDailySyncResult,
} from "@/lib/server/analytics/ingestion/siteTrafficDaily"
import {
  syncSiteTrafficBreakdowns,
  type SiteTrafficBreakdownSyncResult,
} from "@/lib/server/analytics/ingestion/siteTrafficBreakdowns"
import { invalidateAnalyticsCache } from "@/lib/server/analytics/providers/cache"
import {
  revalidateHomepage,
  revalidateLeaderboard,
} from "@/lib/cache/revalidate"

export type { IngestionJobKey } from "@/lib/server/analytics/ingestion/shared"

type IngestionJobResult = {
  job: IngestionJobKey
  runId: string
  status: "completed" | "failed"
  stats?: unknown
  error?: string
}

export type AnalyticsIngestionProgressEvent = {
  elapsedMs: number
  error?: string
  job: IngestionJobKey
  jobCount: number
  jobIndex: number
  phase: "started" | "completed" | "failed"
  runId: string
  stats?: unknown
}

type IngestionOptions = {
  startDate?: string | null
  endDate?: string | null
  days?: number | null
  jobs?: IngestionJobKey[]
  includeBreakdowns?: boolean
  invalidateNextCache?: boolean
  maxRows?: number
  onProgress?: (event: AnalyticsIngestionProgressEvent) => void
}

async function startIngestionRun(
  job: IngestionJobKey,
  window: AnalyticsIngestionWindow,
) {
  const now = new Date()
  return prisma.analyticsIngestionRun.upsert({
    where: {
      source_job_windowStart_windowEnd: {
        source: "cloudflare",
        job,
        windowStart: window.start,
        windowEnd: window.end,
      },
    },
    create: {
      source: "cloudflare",
      job,
      status: "processing",
      windowStart: window.start,
      windowEnd: window.end,
      startedAt: now,
    },
    update: {
      status: "processing",
      startedAt: now,
      finishedAt: null,
      error: null,
    },
    select: { id: true, job: true, source: true },
  })
}

async function finishIngestionRun(args: {
  id: string
  status: "completed" | "failed"
  stats?: unknown
  error?: string | null
}) {
  const finishedAt = new Date()
  await prisma.analyticsIngestionRun.update({
    where: { id: args.id },
    data: {
      status: args.status,
      finishedAt,
      stats: args.stats ?? undefined,
      error: args.error ?? null,
    },
  })
}

export async function runAnalyticsIngestion(
  options: IngestionOptions,
): Promise<{
  window: AnalyticsIngestionWindow
  results: IngestionJobResult[]
}> {
  const window = resolveIngestionWindow({
    startDate: options.startDate ?? null,
    endDate: options.endDate ?? null,
    days: options.days ?? null,
  })

  const requestedJobs =
    options.jobs && options.jobs.length > 0
      ? options.jobs
      : ([
          "product_traffic_daily",
          "site_traffic_daily",
          ...(options.includeBreakdowns
            ? ["product_traffic_breakdowns", "site_traffic_breakdowns"]
            : []),
        ] as IngestionJobKey[])

  const results: IngestionJobResult[] = []

  for (const [index, job] of requestedJobs.entries()) {
    const jobStartedAt = Date.now()
    const run = await startIngestionRun(job, window)
    options.onProgress?.({
      elapsedMs: 0,
      job,
      jobCount: requestedJobs.length,
      jobIndex: index + 1,
      phase: "started",
      runId: run.id,
    })

    try {
      let stats:
        | ProductTrafficDailySyncResult
        | ProductTrafficBreakdownSyncResult
        | SiteTrafficDailySyncResult
        | SiteTrafficBreakdownSyncResult

      if (job === "product_traffic_daily") {
        stats = await syncProductTrafficDaily({
          window,
          ingestionRunId: run.id,
          maxRows: options.maxRows,
        })
      } else if (job === "product_traffic_breakdowns") {
        stats = await syncProductTrafficBreakdowns({
          window,
          ingestionRunId: run.id,
          maxRows: options.maxRows,
        })
      } else if (job === "site_traffic_daily") {
        stats = await syncSiteTrafficDaily({
          window,
          ingestionRunId: run.id,
          maxRows: options.maxRows,
        })
      } else {
        stats = await syncSiteTrafficBreakdowns({
          window,
          ingestionRunId: run.id,
          maxRows: options.maxRows,
        })
      }

      await finishIngestionRun({
        id: run.id,
        status: "completed",
        stats: {
          dataset: CLOUDFLARE_ANALYTICS_DATASET,
          result: stats,
        },
      })

      results.push({ job, runId: run.id, status: "completed", stats })
      options.onProgress?.({
        elapsedMs: Date.now() - jobStartedAt,
        job,
        jobCount: requestedJobs.length,
        jobIndex: index + 1,
        phase: "completed",
        runId: run.id,
        stats,
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown ingestion error"
      console.error("[analytics] ingestion job failed", {
        job,
        window,
        error,
      })
      await finishIngestionRun({
        id: run.id,
        status: "failed",
        error: message,
      })
      results.push({ job, runId: run.id, status: "failed", error: message })
      options.onProgress?.({
        elapsedMs: Date.now() - jobStartedAt,
        error: message,
        job,
        jobCount: requestedJobs.length,
        jobIndex: index + 1,
        phase: "failed",
        runId: run.id,
      })
    }
  }

  if (results.some((result) => result.status === "completed")) {
    await invalidateAnalyticsCache("analytics-ingestion")
    if (options.invalidateNextCache !== false) {
      revalidateHomepage("revalidate")
      revalidateLeaderboard("revalidate")
    }
  }

  return { window, results }
}

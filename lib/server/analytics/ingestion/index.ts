import prisma from "@/lib/prisma"
import {
  resolveIngestionWindow,
  type AnalyticsIngestionWindow,
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

export type IngestionJobKey =
  | "product_traffic_daily"
  | "product_traffic_breakdowns"
  | "site_traffic_daily"
  | "site_traffic_breakdowns"

type IngestionJobResult = {
  job: IngestionJobKey
  runId: string
  status: "completed" | "failed"
  stats?: unknown
  error?: string
}

type IngestionOptions = {
  startDate?: string | null
  endDate?: string | null
  days?: number | null
  jobs?: IngestionJobKey[]
  includeBreakdowns?: boolean
  maxRows?: number
}

async function startIngestionRun(
  job: IngestionJobKey,
  window: AnalyticsIngestionWindow,
) {
  const now = new Date()
  return prisma.analyticsIngestionRun.upsert({
    where: {
      source_job_windowStart_windowEnd: {
        source: "ga4",
        job,
        windowStart: window.start,
        windowEnd: window.end,
      },
    },
    create: {
      source: "ga4",
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

  for (const job of requestedJobs) {
    const run = await startIngestionRun(job, window)
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
        stats,
      })

      results.push({ job, runId: run.id, status: "completed", stats })
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
    }
  }

  if (results.some((result) => result.status === "completed")) {
    await invalidateAnalyticsCache("analytics-ingestion")
    revalidateHomepage("revalidate")
    revalidateLeaderboard("revalidate")
  }

  return { window, results }
}

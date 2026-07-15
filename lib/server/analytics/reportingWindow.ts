import {
  ANALYTICS_REPORTING_WINDOW_DAYS,
  getCompletedAnalyticsWindow,
  type AnalyticsReportingWindow,
} from "@/lib/analytics/reportingWindow"
import {
  getAnalyticsIngestionCoveredRange,
  type AnalyticsCoveredRange,
} from "@/lib/server/analytics/ingestion/coverage"
import type { IngestionJobKey } from "@/lib/server/analytics/ingestion/shared"

export const SITE_ANALYTICS_REPORTING_JOBS: IngestionJobKey[] = [
  "site_traffic_daily",
  "site_traffic_breakdowns",
  "product_traffic_daily",
]

export function productAnalyticsReportingJobs(
  includeAdvanced = true,
): IngestionJobKey[] {
  return [
    "product_traffic_daily",
    ...(includeAdvanced ? (["product_traffic_breakdowns"] as const) : []),
  ]
}

function toReportingWindow(
  range: AnalyticsCoveredRange,
): AnalyticsReportingWindow {
  return {
    days: range.days,
    start: range.start,
    end: range.end,
    startDate: range.start.toISOString().slice(0, 10),
    endDate: range.end.toISOString().slice(0, 10),
  }
}

export async function getAvailableAnalyticsReportingWindow({
  jobs,
  maxDays = ANALYTICS_REPORTING_WINDOW_DAYS,
  referenceDate = new Date(),
}: {
  jobs: IngestionJobKey[]
  maxDays?: number
  referenceDate?: Date
}): Promise<AnalyticsReportingWindow> {
  const targetWindow = getCompletedAnalyticsWindow(maxDays, referenceDate)
  let coveredRange: AnalyticsCoveredRange | null = null
  try {
    coveredRange = await getAnalyticsIngestionCoveredRange(jobs, {
      start: targetWindow.start,
      end: targetWindow.end,
    })
  } catch (error) {
    console.error("[analytics] failed to resolve reporting window coverage", {
      jobs,
      error,
    })
  }

  return coveredRange
    ? toReportingWindow(coveredRange)
    : getCompletedAnalyticsWindow(1, referenceDate)
}

export function getAvailableSiteAnalyticsReportingWindow(args?: {
  maxDays?: number
  referenceDate?: Date
}) {
  return getAvailableAnalyticsReportingWindow({
    jobs: SITE_ANALYTICS_REPORTING_JOBS,
    maxDays: args?.maxDays,
    referenceDate: args?.referenceDate,
  })
}

export function getAvailableProductAnalyticsReportingWindow(args?: {
  includeAdvanced?: boolean
  maxDays?: number
  referenceDate?: Date
}) {
  return getAvailableAnalyticsReportingWindow({
    jobs: productAnalyticsReportingJobs(args?.includeAdvanced ?? true),
    maxDays: args?.maxDays,
    referenceDate: args?.referenceDate,
  })
}

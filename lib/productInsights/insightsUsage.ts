import { TimeInterval } from "@/lib/vendor/prisma/client"

export type InsightsUsagePolicy = {
  usageLimit: number | null
  usageInterval: TimeInterval | null
}

export const INSIGHTS_USAGE_INTERVALS: readonly TimeInterval[] = [
  "day",
  "week",
  "month",
  "year",
]

const INTERVAL_TO_MS: Record<TimeInterval, number> = {
  day: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000,
  year: 365 * 24 * 60 * 60 * 1000,
}

export function parseInsightsUsageConfig(value: unknown): InsightsUsagePolicy {
  if (!value || typeof value !== "object") {
    return { usageLimit: null, usageInterval: null }
  }

  const record = value as Record<string, unknown>
  const limitValue = record.usageLimit
  const intervalValue = record.usageInterval

  const limit =
    typeof limitValue === "number" &&
    Number.isFinite(limitValue) &&
    limitValue > 0
      ? Math.floor(limitValue)
      : null

  const interval = (INSIGHTS_USAGE_INTERVALS as readonly string[]).includes(
    intervalValue as string,
  )
    ? (intervalValue as TimeInterval)
    : null

  if (!limit || !interval) {
    return { usageLimit: null, usageInterval: null }
  }

  return { usageLimit: limit, usageInterval: interval }
}

export function buildInsightsUsageConfig(
  limit: number | null | undefined,
  interval: TimeInterval | null | undefined,
): InsightsUsagePolicy {
  if (limit === null || limit === undefined || limit <= 0 || !interval) {
    return { usageLimit: null, usageInterval: null }
  }
  return { usageLimit: Math.floor(limit), usageInterval: interval }
}

export function computeInsightsCooldownMs(
  policy: InsightsUsagePolicy,
): number | null {
  if (policy.usageLimit === null || policy.usageInterval === null) {
    return null
  }
  const intervalMs = INTERVAL_TO_MS[policy.usageInterval]
  if (!intervalMs) return null
  return Math.floor(intervalMs / policy.usageLimit)
}

export function formatInsightsUsage(
  policy: InsightsUsagePolicy | null,
): string {
  if (!policy || policy.usageLimit === null || policy.usageInterval === null) {
    return "Unlimited"
  }
  const intervalLabel = policy.usageInterval.replace(/^(.)/, (match) =>
    match.toUpperCase(),
  )
  return `${policy.usageLimit} × per ${intervalLabel}`
}

export const INSIGHTS_USAGE_INTERVAL_OPTIONS: Array<{
  value: TimeInterval
  label: string
}> = [
  { value: "day", label: "Per day" },
  { value: "week", label: "Per week" },
  { value: "month", label: "Per month" },
  { value: "year", label: "Per year" },
]

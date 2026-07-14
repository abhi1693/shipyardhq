import { subDays } from "date-fns"

export type IngestionJobKey =
  | "product_traffic_daily"
  | "product_traffic_breakdowns"
  | "site_traffic_daily"
  | "site_traffic_breakdowns"

export type AnalyticsIngestionWindow = {
  start: Date
  end: Date
  startDate: string
  endDate: string
  days: number
}

type WindowInput = {
  startDate?: string | null
  endDate?: string | null
  days?: number | null
}

function toUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  )
}

function parseIsoDate(value?: string | null): Date | null {
  if (!value) return null
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatUtcDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function resolveIngestionWindow({
  startDate,
  endDate,
  days,
}: WindowInput): AnalyticsIngestionWindow {
  const end = parseIsoDate(endDate) ?? toUtcDay(subDays(new Date(), 1))
  const spanDays = Math.max(1, Math.floor(days ?? 7))
  const start = parseIsoDate(startDate) ?? subDays(end, spanDays - 1)

  const orderedStart = start <= end ? start : end
  const orderedEnd = start <= end ? end : start
  const normalizedStart = toUtcDay(orderedStart)
  const normalizedEnd = toUtcDay(orderedEnd)

  return {
    start: normalizedStart,
    end: normalizedEnd,
    startDate: formatUtcDate(normalizedStart),
    endDate: formatUtcDate(normalizedEnd),
    days: Math.max(
      1,
      Math.round(
        (normalizedEnd.getTime() - normalizedStart.getTime()) /
          (1000 * 60 * 60 * 24),
      ) + 1,
    ),
  }
}

export function parseAnalyticsDate(value?: string | null): Date | null {
  if (!value) return null
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00Z`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function normalizePath(value?: string | null): string {
  if (!value) return "/"
  const base = value.split(/[?#]/)[0] || "/"
  if (base !== "/" && base.endsWith("/")) {
    return base.slice(0, -1)
  }
  return base
}

export function extractProductSlug(path?: string | null): string | null {
  if (!path) return null
  const normalized = normalizePath(path)
  const match = normalized.match(/^\/products\/([^/]+)/)
  return match ? match[1]!.toLowerCase() : null
}

export function parseMetricValue(value?: string | null): number {
  const numeric = Number(value ?? 0)
  return Number.isFinite(numeric) ? numeric : 0
}

export function normalizePercent(value: number): number {
  if (!Number.isFinite(value)) return 0
  return value > 0 && value <= 1 ? value * 100 : value
}

export function chunkArray<T>(items: T[], size: number): T[][] {
  if (size <= 0) return [items]
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}

export function cloudflareGroupLimit(maxRows?: number) {
  return Math.min(10_000, Math.max(1, Math.floor(maxRows ?? 10_000)))
}

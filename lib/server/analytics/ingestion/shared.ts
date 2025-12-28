import { protos } from "@google-analytics/data"
import { subDays } from "date-fns"

import { runGaReport } from "@/lib/server/analytics/googleAnalytics"

export const GA_REPORT_PAGE_SIZE = 10_000
export const GA_REPORT_MAX_PAGES = 50
export const GA_REPORT_MAX_ROWS = 50_000

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
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
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
  const end = parseIsoDate(endDate) ?? toUtcDay(new Date())
  const spanDays = Math.max(1, Math.floor(days ?? 7))
  const start =
    parseIsoDate(startDate) ?? subDays(end, spanDays - 1)

  const orderedStart = start <= end ? start : end
  const orderedEnd = start <= end ? end : start
  const normalizedStart = toUtcDay(orderedStart)
  const normalizedEnd = toUtcDay(orderedEnd)

  return {
    start: normalizedStart,
    end: normalizedEnd,
    startDate: formatUtcDate(normalizedStart),
    endDate: formatUtcDate(normalizedEnd),
    days:
      Math.max(
        1,
        Math.round(
          (normalizedEnd.getTime() - normalizedStart.getTime()) /
            (1000 * 60 * 60 * 24),
        ) + 1,
      ),
  }
}

export function parseGaDate(value?: string | null): Date | null {
  if (!value || value.length !== 8) return null
  const year = Number(value.slice(0, 4))
  const month = Number(value.slice(4, 6))
  const day = Number(value.slice(6, 8))
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null
  }
  return new Date(Date.UTC(year, month - 1, day))
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

export function normalizeReferrerDomain(value?: string | null): string {
  const raw = value?.trim()
  if (!raw || raw === "(direct)") return "direct"

  const cleaned = raw
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .trim()
    .toLowerCase()

  const domain = cleaned.split(/[/#?]/)[0]
  return domain || "direct"
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

export function buildProductPageFilter(): protos.google.analytics.data.v1beta.IFilterExpression {
  return {
    andGroup: {
      expressions: [
        {
          filter: {
            fieldName: "pagePath",
            stringFilter: {
              matchType:
                protos.google.analytics.data.v1beta.Filter.StringFilter
                  .MatchType.BEGINS_WITH,
              value: "/products/",
            },
          },
        },
        {
          notExpression: {
            filter: {
              fieldName: "pagePath",
              stringFilter: {
                matchType:
                  protos.google.analytics.data.v1beta.Filter.StringFilter
                    .MatchType.BEGINS_WITH,
                value: "/admin",
              },
            },
          },
        },
      ],
    },
  }
}

export async function fetchGaReportRows(args: {
  request: Omit<
    Parameters<typeof runGaReport>[0],
    "offset" | "limit"
  >
  pageSize?: number
  maxRows?: number
  maxPages?: number
}): Promise<{ rows: protos.google.analytics.data.v1beta.IRow[]; pages: number; truncated: boolean }> {
  const pageSize = Math.max(1, Math.floor(args.pageSize ?? GA_REPORT_PAGE_SIZE))
  const maxRows = Math.max(1, Math.floor(args.maxRows ?? GA_REPORT_MAX_ROWS))
  const maxPages = Math.max(1, Math.floor(args.maxPages ?? GA_REPORT_MAX_PAGES))

  const rows: protos.google.analytics.data.v1beta.IRow[] = []
  let offset = 0
  let pages = 0
  let truncated = false

  while (true) {
    const remaining = maxRows - rows.length
    if (remaining <= 0) {
      truncated = true
      break
    }

    const limit = Math.min(pageSize, remaining)
    const response = await runGaReport({
      ...args.request,
      limit,
      offset,
    })
    const batch = response.rows ?? []
    rows.push(...batch)
    pages += 1

    if (batch.length < limit) {
      break
    }

    offset += batch.length

    if (pages >= maxPages) {
      truncated = true
      break
    }
  }

  return { rows, pages, truncated }
}

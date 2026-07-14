import { format } from "date-fns"

import prisma from "@/lib/prisma"
import { productPath } from "@/lib/routes"
import {
  isAiVerifiedBotCategory,
  normalizeManagedLabels,
} from "@/lib/server/analytics/aiCrawlerAttention"
import type { AnalyticsDateRange } from "@/lib/server/analytics/providerTypes"

export type ProductAiCrawlerEndpointRow = {
  date: Date
  category: string
  endpoint: string
  matchedEndpoint: string
  managedLabels: string[]
  requests: number
}

export type ProductAiCrawlerAttention = {
  totalRequests: number
  shareOfProductTraffic: number
  activeDays: number
  categories: Array<{
    category: string
    requests: number
    share: number
  }>
  timeseries: Array<{
    date: string
    label: string
    requests: number
  }>
  matchedEndpoints: string[]
  managedLabels: string[]
}

function parseUtcDate(value: string) {
  const parsed = new Date(`${value}T00:00:00Z`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function dayKey(value: Date) {
  return value.toISOString().slice(0, 10)
}

function percentage(value: number, total: number) {
  return total > 0 ? (value / total) * 100 : 0
}

export function buildProductAiCrawlerAttention(args: {
  rows: ProductAiCrawlerEndpointRow[]
  totalProductRequests: number
  dateRange: AnalyticsDateRange
}): ProductAiCrawlerAttention {
  const start = parseUtcDate(args.dateRange.startDate)
  const end = parseUtcDate(args.dateRange.endDate)
  if (!start || !end) {
    return {
      totalRequests: 0,
      shareOfProductTraffic: 0,
      activeDays: 0,
      categories: [],
      timeseries: [],
      matchedEndpoints: [],
      managedLabels: [],
    }
  }

  const categoryTotals = new Map<string, number>()
  const dailyTotals = new Map<string, number>()
  const matchedEndpoints = new Set<string>()
  const managedLabels = new Set<string>()

  for (const row of args.rows) {
    if (!isAiVerifiedBotCategory(row.category)) continue
    const requests = Math.max(0, Math.round(Number(row.requests) || 0))
    if (requests === 0) continue

    categoryTotals.set(
      row.category,
      (categoryTotals.get(row.category) ?? 0) + requests,
    )
    const date = dayKey(row.date)
    dailyTotals.set(date, (dailyTotals.get(date) ?? 0) + requests)

    const matchedEndpoint = row.matchedEndpoint.trim()
    if (matchedEndpoint) matchedEndpoints.add(matchedEndpoint)
    for (const label of normalizeManagedLabels(row.managedLabels)) {
      managedLabels.add(label)
    }
  }

  const totalRequests = Array.from(categoryTotals.values()).reduce(
    (sum, requests) => sum + requests,
    0,
  )
  const categories = Array.from(categoryTotals, ([category, requests]) => ({
    category,
    requests,
    share: percentage(requests, totalRequests),
  })).sort((a, b) => b.requests - a.requests)

  const timeseries = []
  for (
    const cursor = new Date(start);
    cursor <= end;
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  ) {
    const date = dayKey(cursor)
    timeseries.push({
      date: cursor.toISOString(),
      label: format(cursor, "MMM d"),
      requests: dailyTotals.get(date) ?? 0,
    })
  }

  return {
    totalRequests,
    shareOfProductTraffic: percentage(
      totalRequests,
      Math.max(0, args.totalProductRequests),
    ),
    activeDays: Array.from(dailyTotals.values()).filter((value) => value > 0)
      .length,
    categories,
    timeseries,
    matchedEndpoints: Array.from(matchedEndpoints).sort((a, b) =>
      a.localeCompare(b),
    ),
    managedLabels: Array.from(managedLabels).sort((a, b) => a.localeCompare(b)),
  }
}

export async function getProductAiCrawlerAttention(args: {
  productSlug: string
  dateRange: AnalyticsDateRange
  totalProductRequests: number
}): Promise<ProductAiCrawlerAttention> {
  const start = parseUtcDate(args.dateRange.startDate)
  const end = parseUtcDate(args.dateRange.endDate)
  if (!start || !end) {
    return buildProductAiCrawlerAttention({
      rows: [],
      totalProductRequests: args.totalProductRequests,
      dateRange: args.dateRange,
    })
  }

  const rows = await prisma.siteAiCrawlerEndpointDaily.findMany({
    where: {
      source: "cloudflare",
      date: { gte: start, lte: end },
      endpoint: productPath(args.productSlug),
    },
    select: {
      date: true,
      category: true,
      endpoint: true,
      matchedEndpoint: true,
      managedLabels: true,
      requests: true,
    },
    orderBy: { date: "asc" },
  })

  return buildProductAiCrawlerAttention({
    rows,
    totalProductRequests: args.totalProductRequests,
    dateRange: args.dateRange,
  })
}

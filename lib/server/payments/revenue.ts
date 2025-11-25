import type {
  Prisma,
  PaymentConnectorProvider,
  PaymentConnectorStatus,
} from "@/lib/vendor/prisma/client"

import prisma from "@/lib/prisma"
import { buildCacheKey, cacheHit, cacheMiss } from "@/lib/server/cache"
import { convertToUsdCents } from "./currency"

type RevenueSnapshotInput = {
  id?: string
  createdAt?: Date
  periodStart: Date
  currencyCode: string
  periodRevenueCents: number
  allTimeRevenueCents: number
  data?: Prisma.JsonValue | Prisma.InputJsonValue
}

export type NormalizedRevenueSnapshot = Omit<
  RevenueSnapshotInput,
  "allTimeRevenueCents" | "periodRevenueCents" | "currencyCode" | "data"
> & {
  currencyCode: string | null
  allTimeRevenueCents: number | null
  periodRevenueCents: number | null
  data: Record<string, unknown>
}

export type RevenuePoint = {
  periodStart: string
  label: string
  allTimeRevenueCents: number
  periodRevenueCents: number
}

export type RevenueSummary = {
  productId: string
  connectorId?: string
  provider?: PaymentConnectorProvider
  status?: PaymentConnectorStatus
  currencyCode: string
  lastSyncedAt: string | null
  latestAllTimeRevenueCents: number
  points: RevenuePoint[]
}

const isObject = (
  value: Prisma.JsonValue | null | undefined,
): value is Prisma.JsonObject =>
  value !== null && typeof value === "object" && !Array.isArray(value)

/**
 * Normalize provider revenue snapshots so callers always get USD when rates are available
 * and a consistent revenue structure.
 */
export function normalizeRevenueHistory(
  history: RevenueSnapshotInput[],
  rates: Map<string, number>,
): NormalizedRevenueSnapshot[] {
  return history.map((entry) => {
    const baseData = isObject(entry.data as Prisma.JsonValue)
      ? (entry.data as Prisma.JsonObject)
      : {}

    const { usdCents: allTimeUsd, rateUsed } = convertToUsdCents(
      entry.allTimeRevenueCents ?? 0,
      entry.currencyCode,
      rates,
    )
    const { usdCents: periodUsd } = convertToUsdCents(
      entry.periodRevenueCents ?? 0,
      entry.currencyCode,
      rates,
    )

    return {
      id: entry.id,
      createdAt: entry.createdAt,
      periodStart: entry.periodStart,
      currencyCode: rateUsed ? "USD" : (entry.currencyCode ?? null),
      allTimeRevenueCents: rateUsed
        ? allTimeUsd
        : (entry.allTimeRevenueCents ?? null),
      periodRevenueCents: rateUsed
        ? periodUsd
        : (entry.periodRevenueCents ?? null),
      data: {
        ...baseData,
        originalCurrencyCode: entry.currencyCode ?? null,
        rateToUsd: rateUsed,
      },
    }
  })
}

export function sortRevenueHistory(
  history: NormalizedRevenueSnapshot[],
): NormalizedRevenueSnapshot[] {
  return [...history].sort(
    (a, b) =>
      new Date(a.periodStart).getTime() - new Date(b.periodStart).getTime(),
  )
}

function aggregateByCurrency(
  history: NormalizedRevenueSnapshot[],
  currencyCode: string,
): NormalizedRevenueSnapshot[] {
  // Bucket by day so multi-currency snapshots on the same day are merged after conversion.
  const buckets = new Map<number, NormalizedRevenueSnapshot>()

  for (const entry of history) {
    if (entry.currencyCode !== currencyCode) continue

    const day = new Date(entry.periodStart)
    const dayKey = Date.UTC(
      day.getUTCFullYear(),
      day.getUTCMonth(),
      day.getUTCDate(),
    )

    const existing = buckets.get(dayKey)
    const periodRevenueCents = (entry.periodRevenueCents ?? 0) as number

    const mergedData = {
      ...(isObject(existing?.data as Prisma.JsonValue)
        ? ((existing?.data as Prisma.JsonObject) ?? {})
        : {}),
      ...(isObject(entry.data as Prisma.JsonValue)
        ? ((entry.data as Prisma.JsonObject) ?? {})
        : {}),
    }

    buckets.set(dayKey, {
      id: existing?.id ?? entry.id,
      createdAt:
        existing?.createdAt &&
        entry.createdAt &&
        existing.createdAt < entry.createdAt
          ? existing.createdAt
          : entry.createdAt,
      // Prefer earliest createdAt for stability when merging multiple entries.
      periodStart: entry.periodStart,
      currencyCode: entry.currencyCode,
      periodRevenueCents:
        (existing?.periodRevenueCents ?? 0) + periodRevenueCents,
      data: mergedData,
      allTimeRevenueCents: existing?.allTimeRevenueCents ?? null,
    })
  }

  const series = Array.from(buckets.values()).sort(
    (a, b) =>
      new Date(a.periodStart).getTime() - new Date(b.periodStart).getTime(),
  )

  let runningTotal = 0
  return series.map((entry) => {
    runningTotal += entry.periodRevenueCents ?? 0
    return {
      ...entry,
      allTimeRevenueCents: runningTotal,
    }
  })
}

export function selectDisplaySeries(
  history: NormalizedRevenueSnapshot[],
  limit?: number,
) {
  const lastCurrency = history[history.length - 1]?.currencyCode ?? null
  const allConvertibleToUsd = history.every(
    (item) =>
      item.currencyCode === "USD" ||
      typeof (item.data as any)?.rateToUsd === "number",
  )
  const displayCurrency = (allConvertibleToUsd ? "USD" : lastCurrency) ?? null

  const aggregatedSeries = displayCurrency
    ? aggregateByCurrency(history, displayCurrency)
    : []

  const limitedSeries =
    limit && limit > 0
      ? aggregatedSeries.slice(Math.max(aggregatedSeries.length - limit, 0))
      : aggregatedSeries

  return { displayCurrency, series: limitedSeries }
}

function buildRevenueCacheKey(productId: string) {
  return buildCacheKey("payments", "revenue", productId)
}

export async function getCachedRevenueSummary(
  productId: string,
): Promise<RevenueSummary | null> {
  return cacheHit<RevenueSummary>({
    key: buildRevenueCacheKey(productId),
    inProcessTtlMs: 5 * 60 * 1000,
  }).catch(() => null)
}

export async function cacheRevenueSummary(
  summary: RevenueSummary,
): Promise<void> {
  await cacheMiss({
    key: buildRevenueCacheKey(summary.productId),
    value: summary,
    inProcessTtlMs: 5 * 60 * 1000,
  }).catch(() => null)
}

export async function getRevenueSummaryFromDb(
  productId: string,
): Promise<RevenueSummary | null> {
  const connector = await prisma.paymentConnector.findUnique({
    where: { productId },
    select: {
      id: true,
      provider: true,
      status: true,
      lastSyncedAt: true,
      revenueHistory: {
        orderBy: { periodStart: "asc" },
        select: {
          periodStart: true,
          currencyCode: true,
          periodRevenueCents: true,
          allTimeRevenueCents: true,
          data: true,
        },
      },
    },
  })

  if (!connector) return null

  const history: RevenueSnapshotInput[] = connector.revenueHistory.map(
    (snapshot) => ({
      periodStart: snapshot.periodStart,
      currencyCode: snapshot.currencyCode,
      periodRevenueCents: snapshot.periodRevenueCents,
      allTimeRevenueCents: snapshot.allTimeRevenueCents,
      data: snapshot.data ?? undefined,
    }),
  )

  const rates = new Map<string, number>()
  for (const entry of history) {
    const rate = (entry.data as any)?.rateToUsd
    if (typeof rate === "number" && rate > 0) {
      rates.set(entry.currencyCode, rate)
    }
  }

  const summary = buildRevenueSummary({
    productId,
    connectorId: connector.id,
    provider: connector.provider,
    status: connector.status,
    lastSyncedAt: connector.lastSyncedAt,
    history,
    rates,
  })

  if (summary) {
    await cacheRevenueSummary(summary)
  }

  return summary
}

export function buildRevenueSummary({
  productId,
  connectorId,
  provider,
  status,
  lastSyncedAt,
  history,
  rates,
}: {
  productId: string
  connectorId?: string
  provider?: PaymentConnectorProvider
  status?: PaymentConnectorStatus
  lastSyncedAt?: Date | string | null
  history: RevenueSnapshotInput[]
  rates: Map<string, number>
}): RevenueSummary | null {
  const normalizedHistory = normalizeRevenueHistory(history, rates)
  const sortedHistory = sortRevenueHistory(normalizedHistory)
  const { displayCurrency, series } = selectDisplaySeries(sortedHistory)
  if (!displayCurrency || !series.length) return null

  const points: RevenuePoint[] = series.map((point) => {
    const periodDate = new Date(point.periodStart)
    const label = new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(periodDate)
    return {
      periodStart: periodDate.toISOString(),
      label,
      allTimeRevenueCents: point.allTimeRevenueCents ?? 0,
      periodRevenueCents: point.periodRevenueCents ?? 0,
    }
  })

  const latestPoint = series[series.length - 1]
  return {
    productId,
    connectorId,
    provider,
    status,
    currencyCode: displayCurrency,
    lastSyncedAt:
      typeof lastSyncedAt === "string"
        ? lastSyncedAt
        : (lastSyncedAt?.toISOString() ?? null),
    latestAllTimeRevenueCents: latestPoint.allTimeRevenueCents ?? 0,
    points,
  }
}

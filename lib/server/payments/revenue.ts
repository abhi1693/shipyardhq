import type { Prisma, PaymentRevenueSnapshot } from "@/lib/vendor/prisma/client"

import { convertToUsdCents } from "./currency"

type RevenueSnapshotInput = Pick<
  PaymentRevenueSnapshot,
  | "id"
  | "periodStart"
  | "currencyCode"
  | "periodRevenueCents"
  | "allTimeRevenueCents"
  | "mrrCents"
  | "data"
  | "createdAt"
>

export type NormalizedRevenueSnapshot = RevenueSnapshotInput & {
  currencyCode: string | null
  allTimeRevenueCents: number | null
  periodRevenueCents: number | null
  mrrCents: number | null
  data: Record<string, unknown>
}

const isObject = (
  value: Prisma.JsonValue | null | undefined,
): value is Prisma.JsonObject =>
  value !== null && typeof value === "object" && !Array.isArray(value)

/**
 * Normalize provider revenue snapshots so callers always get USD when rates are available
 * and a consistent mrr/all-time structure.
 */
export function normalizeRevenueHistory(
  history: RevenueSnapshotInput[],
  rates: Map<string, number>,
): NormalizedRevenueSnapshot[] {
  return history.map((entry) => {
    const baseData = isObject(entry.data) ? entry.data : {}
    const rawMrr =
      typeof entry.mrrCents === "number"
        ? entry.mrrCents
        : typeof (baseData as any).mrrCents === "number"
          ? Number((baseData as any).mrrCents)
          : null

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
    const { usdCents: mrrUsd, rateUsed: mrrRate } = convertToUsdCents(
      typeof rawMrr === "number" ? rawMrr : 0,
      entry.currencyCode,
      rates,
    )

    return {
      ...entry,
      currencyCode: rateUsed ? "USD" : entry.currencyCode ?? null,
      allTimeRevenueCents: rateUsed
        ? allTimeUsd
        : entry.allTimeRevenueCents ?? null,
      periodRevenueCents: rateUsed
        ? periodUsd
        : entry.periodRevenueCents ?? null,
      mrrCents:
        rateUsed || mrrRate
          ? mrrUsd
          : typeof rawMrr === "number"
            ? rawMrr
            : null,
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
  const buckets = new Map<
    number,
    Omit<NormalizedRevenueSnapshot, "allTimeRevenueCents">
  >()

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
    const charges =
      typeof entry.data?.charges === "number" ? entry.data.charges : 0
    const mrrCents = (entry.mrrCents ?? 0) as number
    const existingCharges =
      typeof (existing?.data as any)?.charges === "number"
        ? (existing?.data as any).charges
        : 0

    buckets.set(dayKey, {
      ...entry,
      // Prefer earliest createdAt for stability when merging multiple entries.
      createdAt:
        existing?.createdAt &&
        entry.createdAt &&
        existing.createdAt < entry.createdAt
          ? existing.createdAt
          : entry.createdAt,
      periodRevenueCents: (existing?.periodRevenueCents ?? 0) + periodRevenueCents,
      mrrCents: (existing?.mrrCents ?? 0) + (mrrCents > 0 ? mrrCents : 0),
      data: {
        ...(isObject(existing?.data) ? existing?.data : {}),
        ...(isObject(entry.data) ? entry.data : {}),
        charges: existingCharges + charges,
      },
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
  const displayCurrency =
    (allConvertibleToUsd
      ? "USD"
      : lastCurrency) ?? null

  const aggregatedSeries = displayCurrency
    ? aggregateByCurrency(history, displayCurrency)
    : []

  const limitedSeries =
    limit && limit > 0
      ? aggregatedSeries.slice(
          Math.max(aggregatedSeries.length - limit, 0),
        )
      : aggregatedSeries

  return { displayCurrency, series: limitedSeries }
}

export function findLatestMrr(
  history: NormalizedRevenueSnapshot[],
): number | null {
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const value = history[i]?.mrrCents
    if (typeof value === "number" && value > 0) return value
  }
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const value = history[i]?.mrrCents
    if (typeof value === "number") return value
  }
  return null
}

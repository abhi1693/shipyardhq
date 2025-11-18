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

export function selectDisplaySeries(
  history: NormalizedRevenueSnapshot[],
  limit?: number,
) {
  const hasUsd = history.some((item) => item.currencyCode === "USD")
  const displayCurrency =
    (hasUsd
      ? "USD"
      : history[history.length - 1]?.currencyCode ?? null) ?? null

  const primarySeries = displayCurrency
    ? history.filter((item) => item.currencyCode === displayCurrency)
    : []

  const limitedSeries =
    limit && limit > 0
      ? primarySeries.slice(Math.max(primarySeries.length - limit, 0))
      : primarySeries

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

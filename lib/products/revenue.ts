import { convertToUsdCents } from "@/lib/server/payments/currency"

export type RevenueSnapshot = {
  latestAllTimeRevenueCents?: number | null
  latestCurrencyCode?: string | null
  revenueHistory?: Array<{
    allTimeRevenueCents?: number | null
    currencyCode?: string | null
  }> | null
}

interface ResolveRevenueOptions {
  rates?: Map<string, number>
  targetCurrency?: string
}

export const resolveProductRevenue = (
  connector?: RevenueSnapshot | null,
  options: ResolveRevenueOptions = {},
): { latestRevenueCents: number | null; revenueCurrencyCode: string | null } => {
  if (!connector) {
    return { latestRevenueCents: null, revenueCurrencyCode: null }
  }

  const fallbackSnapshot = connector.revenueHistory?.[0]

  const latestRevenueCents =
    typeof connector.latestAllTimeRevenueCents === "number"
      ? connector.latestAllTimeRevenueCents
      : typeof fallbackSnapshot?.allTimeRevenueCents === "number"
        ? fallbackSnapshot.allTimeRevenueCents
        : null

  if (latestRevenueCents === null) {
    return { latestRevenueCents: null, revenueCurrencyCode: null }
  }

  const currency =
    connector.latestCurrencyCode ?? fallbackSnapshot?.currencyCode ?? null

  if (options.rates) {
    const targetCurrency = options.targetCurrency ?? "USD"
    const { usdCents, rateUsed } = convertToUsdCents(
      latestRevenueCents,
      currency,
      options.rates,
    )

    // If we could not find a rate, surface the original currency to avoid
    // mislabeling amounts while still returning the raw figure.
    if (rateUsed === null) {
      return {
        latestRevenueCents,
        revenueCurrencyCode: currency ?? targetCurrency,
      }
    }

    return {
      latestRevenueCents: usdCents,
      revenueCurrencyCode: targetCurrency,
    }
  }

  return {
    latestRevenueCents,
    revenueCurrencyCode: currency ?? null,
  }
}

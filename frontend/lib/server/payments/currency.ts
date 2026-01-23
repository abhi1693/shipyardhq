import { cacheHit, cacheMiss, buildCacheKey } from "@/lib/server/cache"
const RATES_TTL_SECONDS = 24 * 60 * 60 // 1 day
const RATES_ENDPOINT =
  process.env.USD_RATES_URL || "https://open.er-api.com/v6/latest/USD"
const RATES_CACHE_KEY = buildCacheKey("payments", "usd-rates")
const IN_PROCESS_TTL_MS = 5 * 60 * 1000

type RateMap = Map<string, number>
let memoizedRates: { rates: RateMap; fetchedAt: number } | null = null

function mapFromObject(objectRates?: Record<string, number>): RateMap {
  if (!objectRates) return new Map<string, number>()
  const entries = Object.entries(objectRates).map(
    ([code, rate]) => [code.toUpperCase(), Number(rate)] as [string, number],
  )
  return new Map<string, number>(entries)
}

async function fetchUsdRates(): Promise<RateMap> {
  try {
    const response = await fetch(RATES_ENDPOINT)
    if (!response.ok) throw new Error(`status ${response.status}`)
    const json = (await response.json()) as { rates?: Record<string, number> }
    const rates = mapFromObject(json.rates)

    if (!rates.has("USD")) {
      rates.set("USD", 1)
    }

    await cacheMiss({
      key: RATES_CACHE_KEY,
      value: Object.fromEntries(rates.entries()),
      ttlSeconds: RATES_TTL_SECONDS,
    }).catch(() => null)

    return rates
  } catch {
    // No rates available; signal caller to keep provider currency.
    return new Map<string, number>()
  }
}

export async function getUsdConversionRates(): Promise<RateMap> {
  const now = Date.now()
  if (memoizedRates && now - memoizedRates.fetchedAt < IN_PROCESS_TTL_MS) {
    return memoizedRates.rates
  }

  const cached = await cacheHit<Record<string, number>>({
    key: RATES_CACHE_KEY,
  }).catch(() => null)

  if (cached) {
    const rates = mapFromObject(cached)
    if (!rates.has("USD")) rates.set("USD", 1)
    memoizedRates = { rates, fetchedAt: now }
    return rates
  }

  const rates = await fetchUsdRates()
  memoizedRates = { rates, fetchedAt: now }
  return rates
}

export function convertToUsdCents(
  amountCents: number,
  currencyCode: string | null | undefined,
  rates: RateMap,
): { usdCents: number; rateUsed: number | null } {
  const code = (currencyCode || "USD").toUpperCase()
  if (code === "USD") return { usdCents: amountCents, rateUsed: 1 }

  const rate = rates.get(code)
  if (rate && rate > 0) {
    // Rates express how many units of the foreign currency equal 1 USD, so divide to convert amount -> USD
    const usdCents = Math.round(amountCents / rate)
    return { usdCents, rateUsed: rate }
  }

  // Unknown rate; return original amount to avoid throwing.
  return { usdCents: amountCents, rateUsed: null }
}

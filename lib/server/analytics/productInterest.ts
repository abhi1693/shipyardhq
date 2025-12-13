import { createHash } from "crypto"
import { format, subDays } from "date-fns"

import type { ProductInterestSignals } from "@/types/product-interest"
import { buildCacheKey, cacheHit, cacheMiss } from "@/lib/server/cache"
import { getProductTrafficMapFromGa, type GaDateRange } from "./googleAnalytics"

type ProductRef = { id: string; slug: string }

type CachedInterestEntry = {
  productId: string
  signals: ProductInterestSignals
}

type CachedInterestPayload = {
  entries: CachedInterestEntry[]
}

const CACHE_TTL_SECONDS = 60 * 60 * 3
const IN_PROCESS_TTL_MS = 30_000

function hasGaDataApiConfig() {
  return Boolean(
    process.env.GA_CREDENTIALS_JSON?.trim() &&
    process.env.GA_PROPERTY_ID?.trim(),
  )
}

function resolveRangeForLastNDays(days: number): GaDateRange {
  const safeDays = Math.max(1, Math.floor(days))
  const end = subDays(new Date(), 0)
  const start = subDays(end, safeDays - 1)
  return {
    startDate: format(start, "yyyy-MM-dd"),
    endDate: format(end, "yyyy-MM-dd"),
  }
}

function resolvePreviousRange(current: GaDateRange, days: number): GaDateRange {
  const safeDays = Math.max(1, Math.floor(days))
  const currentStart = new Date(current.startDate)
  const prevEnd = subDays(currentStart, 1)
  const prevStart = subDays(prevEnd, safeDays - 1)
  return {
    startDate: format(prevStart, "yyyy-MM-dd"),
    endDate: format(prevEnd, "yyyy-MM-dd"),
  }
}

function hashProductIds(products: ProductRef[]) {
  const ids = products.map((p) => p.id).sort()
  return createHash("md5").update(ids.join("|")).digest("hex").slice(0, 12)
}

function computeSignals({
  current,
  previous,
}: {
  current: { pageViews: number; uniqueVisitors: number; sessions: number }
  previous: { pageViews: number; uniqueVisitors: number; sessions: number }
}): ProductInterestSignals {
  const clicks7d = Math.max(0, Math.round(current.pageViews))
  const uniqueVisitors7d = Math.max(0, Math.round(current.uniqueVisitors))
  const repeatVisits7d = Math.max(
    0,
    Math.round(current.sessions) - Math.round(current.uniqueVisitors),
  )

  const prevClicks = Math.max(0, Math.round(previous.pageViews))
  const clickVelocityWoW =
    prevClicks > 0 ? (clicks7d - prevClicks) / prevClicks : clicks7d > 0 ? 1 : 0

  return {
    clicks7d,
    clickVelocityWoW,
    uniqueVisitors7d,
    repeatVisits7d,
  }
}

export async function getProductInterestSignalsMap(args: {
  products: ProductRef[]
  days?: number
}): Promise<Map<string, ProductInterestSignals>> {
  const results = new Map<string, ProductInterestSignals>()
  const products = args.products.filter((p) => p.id && p.slug)
  if (!products.length) return results

  if (!hasGaDataApiConfig()) {
    return results
  }

  const days = typeof args.days === "number" ? args.days : 7
  const currentRange = resolveRangeForLastNDays(days)
  const previousRange = resolvePreviousRange(currentRange, days)

  const cacheKey = buildCacheKey(
    "analytics",
    "product-interest",
    "v1",
    currentRange.startDate,
    currentRange.endDate,
    previousRange.startDate,
    previousRange.endDate,
    `set:${hashProductIds(products)}`,
  )

  const cached = await cacheHit<CachedInterestPayload>({
    key: cacheKey,
    inProcessTtlMs: IN_PROCESS_TTL_MS,
  })

  if (cached?.entries?.length) {
    for (const entry of cached.entries) {
      if (entry?.productId && entry.signals) {
        results.set(entry.productId, entry.signals)
      }
    }
    return results
  }

  try {
    const [currentMap, previousMap] = await Promise.all([
      getProductTrafficMapFromGa({
        products,
        dateRange: currentRange,
      }),
      getProductTrafficMapFromGa({
        products,
        dateRange: previousRange,
      }),
    ])

    const entries: CachedInterestEntry[] = []

    for (const product of products) {
      const current = currentMap.get(product.id) ?? {
        pageViews: 0,
        uniqueVisitors: 0,
        sessions: 0,
      }
      const previous = previousMap.get(product.id) ?? {
        pageViews: 0,
        uniqueVisitors: 0,
        sessions: 0,
      }

      const signals = computeSignals({ current, previous })
      results.set(product.id, signals)
      entries.push({ productId: product.id, signals })
    }

    await cacheMiss({
      key: cacheKey,
      value: { entries } satisfies CachedInterestPayload,
      ttlSeconds: CACHE_TTL_SECONDS,
      inProcessTtlMs: IN_PROCESS_TTL_MS,
    })

    return results
  } catch (error) {
    console.error("[analytics] failed to compute product interest signals", {
      error,
    })
    return results
  }
}

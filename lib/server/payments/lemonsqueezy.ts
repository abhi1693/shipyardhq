import {
  PaymentConnectorProvider,
  type PaymentConnector,
} from "@/lib/vendor/prisma/client"
import { IS_PROD } from "@/lib/constants"

import type {
  PaymentConnectorConfig,
  PaymentProviderDefinition,
  ProviderSyncContext,
  ProviderSyncResult,
  RevenueSnapshotInput,
} from "./types"

const DEFAULT_BASE_URL = "https://api.lemonsqueezy.com/v1"

type LemonListResponse<T> = {
  data?: T[]
  meta?: {
    page?: {
      current?: number
      last?: number
      total?: number
      total_pages?: number
      totalPages?: number
    }
  }
}

type LemonResource<TAttributes = any> = {
  id?: string
  attributes?: TAttributes
}

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  )
}

function toDayKey(date: Date): string {
  const year = date.getUTCFullYear()
  const month = (date.getUTCMonth() + 1).toString().padStart(2, "0")
  const day = date.getUTCDate().toString().padStart(2, "0")
  return `${year}-${month}-${day}`
}

function getBaseUrl() {
  const raw = process.env.LEMONSQUEEZY_API_BASE_URL
  if (raw && raw.trim().length) return raw.replace(/\/+$/, "")
  return DEFAULT_BASE_URL
}

async function lemonRequest<T>({
  apiKey,
  path,
  query,
}: {
  apiKey: string
  path: string
  query?: Record<string, string | number | undefined>
}): Promise<T> {
  const base = getBaseUrl()
  const url = new URL(
    path.startsWith("http") ? path : `${base}${path.startsWith("/") ? "" : "/"}${path}`,
  )
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === null) return
      url.searchParams.set(key, String(value))
    })
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/vnd.api+json",
    },
  })

  if (!response.ok) {
    const text = await response.text().catch(() => "")
    throw new Error(
      `Lemon Squeezy request failed (${response.status} ${response.statusText}): ${text.slice(0, 300)}`,
    )
  }

  return (await response.json()) as T
}

async function listLemonCollection<T>({
  apiKey,
  path,
  storeId,
}: {
  apiKey: string
  path: string
  storeId?: string
}): Promise<T[]> {
  const items: T[] = []
  let page = 1
  const pageSize = 100

  while (true) {
    const data = await lemonRequest<LemonListResponse<T>>({
      apiKey,
      path,
      query: {
        "page[number]": page,
        "page[size]": pageSize,
        ...(storeId ? { "filter[store_id]": storeId } : {}),
      },
    })

    const pageItems = Array.isArray(data?.data) ? data.data : []
    items.push(...pageItems)

    const pageMeta = (data?.meta as any)?.page || {}
    const currentPage =
      Number(pageMeta.current ?? pageMeta.number ?? page) || page
    const lastPage =
      Number(
        pageMeta.last ??
          pageMeta.total_pages ??
          pageMeta.totalPages ??
          pageMeta.total,
      ) || currentPage
    if (currentPage >= lastPage || pageItems.length === 0) break
    page += 1
  }

  return items
}

async function listLemonOrders(apiKey: string, storeId?: string) {
  return listLemonCollection<LemonResource<{ [key: string]: any }>>({
    apiKey,
    path: `/stores/${encodeURIComponent(storeId ?? "")}/orders`,
  })
}

async function fetchLemonStore(apiKey: string, storeId: string) {
  return lemonRequest<LemonResource>({
    apiKey,
    path: `/stores/${encodeURIComponent(storeId)}`,
  })
}

async function listLemonSubscriptions(apiKey: string, storeId?: string) {
  return listLemonCollection<LemonResource<{ [key: string]: any }>>({
    apiKey,
    path: `/stores/${encodeURIComponent(storeId ?? "")}/subscriptions`,
  })
}

function parseAmountToCents(
  value: unknown,
  treatAsDollars = false,
): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    const normalized = treatAsDollars ? value * 100 : value
    return Math.round(normalized)
  }
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^0-9.-]/g, ""))
    if (Number.isFinite(parsed)) {
      return Math.round(parsed * (treatAsDollars ? 100 : 1))
    }
  }
  return null
}

function pickAmount(attributes: Record<string, any>): number | null {
  const candidates: Array<[string, boolean]> = [
    ["total_in_cents", false],
    ["total_cents", false],
    ["total", false],
    ["subtotal_in_cents", false],
    ["subtotal_cents", false],
    ["subtotal", false],
  ]
  for (const [key, treatAsDollars] of candidates) {
    const amount = parseAmountToCents(attributes[key], treatAsDollars)
    if (typeof amount === "number") return amount
  }
  return null
}

function pickCurrency(attributes: Record<string, any>): string | null {
  const raw =
    attributes.currency ||
    attributes.currency_code ||
    attributes.currencyCode ||
    null
  if (typeof raw === "string" && raw.trim().length >= 3) {
    return raw.trim().toUpperCase()
  }
  return null
}

function parseDate(value: unknown): Date | null {
  if (!value) return null
  const d = new Date(value as any)
  if (Number.isNaN(d.getTime())) return null
  return d
}

async function validateLemonApiKey({
  apiKey,
  config,
}: {
  apiKey: string
  config?: PaymentConnectorConfig
}) {
  const trimmedKey = apiKey.trim()
  if (!trimmedKey) throw new Error("Lemon Squeezy API key is required")
  const storeId = config?.accountId?.trim()

  // Basic authentication check
  await lemonRequest({
    apiKey: trimmedKey,
    path: "/stores",
    query: { "page[size]": 1 },
  })

  if (storeId) {
    await fetchLemonStore(trimmedKey, storeId).catch((error) => {
      throw new Error(
        error instanceof Error
          ? `Store ${storeId} is not accessible with this API key: ${error.message}`
          : `Store ${storeId} is not accessible with this API key`,
      )
    })
  } else {
    throw new Error("Lemon Squeezy store ID is required")
  }
}

function buildBaseMaps(
  context: ProviderSyncContext,
): {
  baseByCurrency: Map<string, number>
  latestStartByCurrency: Map<string, Date>
} {
  const baseByCurrency = new Map<string, number>()
  const latestStartByCurrency = new Map<string, Date>()

  if (context.currencyAllTimeBase) {
    for (const [currency, value] of context.currencyAllTimeBase.entries()) {
      if (!currency) continue
      baseByCurrency.set(currency.toUpperCase(), value)
    }
  }
  if (context.latestPeriodStartByCurrency) {
    for (const [currency, date] of context.latestPeriodStartByCurrency.entries()) {
      if (!currency || !date) continue
      latestStartByCurrency.set(
        currency.toUpperCase(),
        startOfUtcDay(new Date(date)),
      )
    }
  }

  return { baseByCurrency, latestStartByCurrency }
}

export async function syncLemonConnector({
  connector,
  apiKey,
  since,
  currencyAllTimeBase,
  latestPeriodStartByCurrency,
}: {
  connector: PaymentConnector
  apiKey: string
} & ProviderSyncContext): Promise<ProviderSyncResult> {
  const config = (connector.config ?? undefined) as
    | PaymentConnectorConfig
    | undefined
  const storeId =
    typeof config?.accountId === "string" && config.accountId.trim().length
      ? config.accountId.trim()
      : undefined
  const environment =
    config?.environment === "test_mode" ? "test_mode" : "live_mode"
  const allowTestMode = !IS_PROD || environment === "test_mode"
  const sinceDate = since ? startOfUtcDay(new Date(since)) : null
  const { baseByCurrency, latestStartByCurrency } = buildBaseMaps({
    currencyAllTimeBase,
    latestPeriodStartByCurrency,
  })

  const [orders, subscriptions] = await Promise.all([
    listLemonOrders(apiKey, storeId),
    listLemonSubscriptions(apiKey, storeId).catch(() => []),
  ])
  const revenueByCurrency = new Map<
    string,
    Map<string, { periodRevenueCents: number; charges: number; periodStart: Date }>
  >()
  const mrrByCurrency = new Map<string, number>()

  for (const order of orders) {
    const attrs = (order as any)?.attributes || {}
    const status = String(attrs.status || "").toLowerCase()
    const createdAt = parseDate(attrs.created_at || attrs.createdAt)
    const amountCents = pickAmount(attrs)
    const currency = (pickCurrency(attrs) || "USD").toUpperCase()
    const isTestMode = Boolean(attrs.test_mode)

    if (!createdAt || !amountCents || amountCents <= 0) continue
    if (sinceDate && startOfUtcDay(createdAt) < sinceDate) continue
    if (isTestMode && !allowTestMode) continue
    if (
      status &&
      ["failed", "refunded", "unpaid", "void", "expired"].includes(status)
    ) {
      continue
    }

    const periodStart = startOfUtcDay(createdAt)
    const dayKey = toDayKey(periodStart)
    const currencyMap =
      revenueByCurrency.get(currency) ||
      new Map<
        string,
        { periodRevenueCents: number; charges: number; periodStart: Date }
      >()
    const bucket =
      currencyMap.get(dayKey) || {
        periodRevenueCents: 0,
        charges: 0,
        periodStart,
      }
    bucket.periodRevenueCents += amountCents
    bucket.charges += 1
    currencyMap.set(dayKey, bucket)
    revenueByCurrency.set(currency, currencyMap)
  }

  for (const sub of subscriptions) {
    const attrs = (sub as any)?.attributes || {}
    const status = String(attrs.status || "").toLowerCase()
    if (!["active", "paused", "trialing"].includes(status)) continue

    const amount = pickAmount(attrs)
    const interval = String(
      attrs.renewal_interval_unit ||
        attrs.interval_unit ||
        attrs.billing_interval ||
        "",
    ).toLowerCase()
    const intervalCount =
      Number(
        attrs.renewal_interval_quantity ||
          attrs.interval_quantity ||
          attrs.interval_count ||
          1,
      ) || 1
    const currency = (pickCurrency(attrs) || "USD").toUpperCase()
    if (!amount || amount <= 0) continue

    const monthly = (() => {
      switch (interval) {
        case "day":
          return Math.round((amount * 365) / (12 * intervalCount))
        case "week":
          return Math.round((amount * 52) / (12 * intervalCount))
        case "year":
          return Math.round(amount / (12 * intervalCount))
        case "month":
        default:
          return Math.round(amount / intervalCount)
      }
    })()

    mrrByCurrency.set(currency, (mrrByCurrency.get(currency) || 0) + monthly)
  }

  const snapshots: RevenueSnapshotInput[] = []
  for (const [currency, buckets] of revenueByCurrency.entries()) {
    const ordered = Array.from(buckets.values()).sort((a, b) =>
      a.periodStart.getTime() > b.periodStart.getTime() ? 1 : -1,
    )
    let runningTotal = baseByCurrency.get(currency) ?? 0
    const mrrCents = mrrByCurrency.get(currency) ?? null
    for (const bucket of ordered) {
      runningTotal += bucket.periodRevenueCents
      snapshots.push({
        currencyCode: currency,
        periodStart: bucket.periodStart,
        periodRevenueCents: bucket.periodRevenueCents,
        allTimeRevenueCents: runningTotal,
        mrrCents,
        data: {
          provider: "lemonsqueezy",
          storeId,
          charges: bucket.charges,
        },
      })
    }
  }

  if (snapshots.length === 0) {
    const fallbackCurrency =
      connector.latestCurrencyCode?.toUpperCase() ||
      Array.from(baseByCurrency.keys())[0] ||
      "USD"
    const fallbackStart =
      latestStartByCurrency.get(fallbackCurrency) || startOfUtcDay(new Date())
    const priorAllTime =
      connector.latestAllTimeRevenueCents ??
      baseByCurrency.get(fallbackCurrency) ??
      0

    snapshots.push({
      currencyCode: fallbackCurrency,
      periodStart: fallbackStart,
      periodRevenueCents: 0,
      allTimeRevenueCents: priorAllTime,
      mrrCents: connector.latestMrrCents ?? null,
      data: { provider: "lemonsqueezy", storeId, charges: 0 },
    })
  }

  return { snapshots }
}

export const lemonSqueezyProvider: PaymentProviderDefinition = {
  provider: PaymentConnectorProvider.lemonsqueezy,
  validateApiKey: async ({ apiKey, config }) =>
    validateLemonApiKey({
      apiKey,
      config,
    }),
  sync: async ({ connector, apiKey, since, currencyAllTimeBase, latestPeriodStartByCurrency }) =>
    syncLemonConnector({
      connector,
      apiKey,
      since,
      currencyAllTimeBase,
      latestPeriodStartByCurrency,
    }),
}

import { IS_PROD } from "@/lib/constants"
import {
  PaymentConnectorProvider,
  type PaymentConnector,
} from "@/lib/vendor/prisma/client"

import type {
  PaymentConnectorConfig,
  PaymentProviderDefinition,
  ProviderSyncContext,
  ProviderSyncResult,
  RevenueSnapshotInput,
} from "./types"

const DEFAULT_PADDLE_API_BASE = "https://api.paddle.com"
const SANDBOX_PADDLE_API_BASE = "https://sandbox-api.paddle.com"

type PaddleListResponse<T> = {
  data?: T[]
  meta?: {
    pagination?: {
      per_page?: number
      page?: number
      has_more?: boolean
      total?: number
    }
  }
}

function resolveEnvironment(): "live_mode" | "test_mode" {
  return IS_PROD ? "live_mode" : "test_mode"
}

function getPaddleBaseUrl(environment: "live_mode" | "test_mode") {
  const override = process.env.PADDLE_API_BASE_URL?.trim()
  if (override) return override.replace(/\/+$/, "")
  return (
    environment === "test_mode"
      ? SANDBOX_PADDLE_API_BASE
      : DEFAULT_PADDLE_API_BASE
  ).replace(/\/+$/, "")
}

function ensurePaddleKeyMatchesEnvironment({
  apiKey,
  environment,
}: {
  apiKey: string
  environment: "live_mode" | "test_mode"
}) {
  const trimmed = apiKey.trim()
  const expectedPrefix =
    environment === "test_mode" ? "pdl_sdbx_apikey_" : "pdl_live_apikey_"

  if (!trimmed.startsWith(expectedPrefix)) {
    throw new Error(
      environment === "test_mode"
        ? "Sandbox Paddle keys must start with pdl_sdbx_apikey_."
        : "Live Paddle keys must start with pdl_live_apikey_.",
    )
  }

  return trimmed
}

async function paddleRequest<T>({
  apiKey,
  path,
  environment,
  query,
}: {
  apiKey: string
  path: string
  environment: "live_mode" | "test_mode"
  query?: Record<string, string | number | boolean | null | undefined>
}): Promise<T> {
  const base = getPaddleBaseUrl(environment)
  const url = new URL(
    path.startsWith("http")
      ? path
      : `${base}${path.startsWith("/") ? "" : "/"}${path}`,
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
      Accept: "application/json",
    },
  })

  if (!response.ok) {
    const text = await response.text().catch(() => "")
    throw new Error(
      `Paddle request failed (${response.status} ${response.statusText}) for ${path}: ${text.slice(0, 300)}`,
    )
  }

  return (await response.json()) as T
}

async function listPaddleCollection<T>({
  apiKey,
  path,
  environment,
  query,
  limit,
}: {
  apiKey: string
  path: string
  environment: "live_mode" | "test_mode"
  query?: Record<string, string | number | boolean | null | undefined>
  limit?: number
}): Promise<T[]> {
  const items: T[] = []
  let page = 1
  const perPage = Math.min(Math.max(limit ?? 200, 1), 200)

  while (true) {
    const data = await paddleRequest<PaddleListResponse<T>>({
      apiKey,
      path,
      environment,
      query: { ...(query ?? {}), page, per_page: perPage },
    })

    const pageItems = Array.isArray(data?.data) ? data.data : []
    items.push(...pageItems)

    if (limit && items.length >= limit) {
      return items.slice(0, limit)
    }

    const pagination = (data?.meta as any)?.pagination ?? {}
    const hasMore =
      typeof pagination?.has_more === "boolean"
        ? pagination.has_more
        : typeof pagination?.total === "number"
          ? page * (pagination?.per_page ?? perPage) < pagination.total
          : pageItems.length === perPage

    if (!hasMore || pageItems.length === 0) break
    page += 1
  }

  return items
}

async function listPaddleTransactions({
  apiKey,
  environment,
  limit,
}: {
  apiKey: string
  environment: "live_mode" | "test_mode"
  limit?: number
}) {
  return listPaddleCollection<any>({
    apiKey,
    path: "/transactions",
    environment,
    limit,
  })
}

async function listPaddleSubscriptions({
  apiKey,
  environment,
}: {
  apiKey: string
  environment: "live_mode" | "test_mode"
}) {
  return listPaddleCollection<any>({
    apiKey,
    path: "/subscriptions",
    environment,
  })
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

function parseDate(value: unknown): Date | null {
  if (!value) return null
  const d = new Date(value as any)
  if (Number.isNaN(d.getTime())) return null
  return d
}

function parseAmountToCents(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    const hasDecimals = value % 1 !== 0
    return Math.round(hasDecimals ? value * 100 : value)
  }
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^0-9.-]/g, ""))
    if (Number.isFinite(parsed)) {
      const hasDecimals = parsed % 1 !== 0
      return Math.round(hasDecimals ? parsed * 100 : parsed)
    }
  }
  return null
}

function pickAmountCents(entry: any): number | null {
  const candidates: unknown[] = [
    entry?.amount,
    entry?.amount_cents,
    entry?.unit_price,
    entry?.unit_price_cents,
    entry?.total,
    entry?.total_cents,
    entry?.gross_amount,
    entry?.gross_amount_cents,
    entry?.details?.totals?.total,
    entry?.details?.totals?.grand_total,
    entry?.details?.totals?.subtotal,
    entry?.totals?.total,
    entry?.totals?.subtotal,
  ]

  for (const value of candidates) {
    const amount = parseAmountToCents(value)
    if (typeof amount === "number" && amount > 0) return amount
  }

  return null
}

function pickCurrency(entry: any): string | null {
  const candidates = [
    entry?.currency_code,
    entry?.currency,
    entry?.currencyCode,
    entry?.price?.currency_code,
    entry?.price?.currency,
    entry?.unit_price?.currency_code,
  ]
  for (const value of candidates) {
    if (typeof value === "string" && value.trim().length >= 3) {
      return value.trim().toUpperCase()
    }
  }
  return null
}

function buildBaseMaps(context: ProviderSyncContext): {
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
    for (const [
      currency,
      date,
    ] of context.latestPeriodStartByCurrency.entries()) {
      if (!currency || !date) continue
      latestStartByCurrency.set(
        currency.toUpperCase(),
        startOfUtcDay(new Date(date)),
      )
    }
  }

  return { baseByCurrency, latestStartByCurrency }
}

function isSuccessfulStatus(status?: string | null): boolean {
  const value = (status || "").toLowerCase()
  if (
    ["refunded", "void", "chargeback", "failed", "canceled", "cancelled"].some(
      (bad) => value.includes(bad),
    )
  ) {
    return false
  }
  if (!value) return true
  return (
    ["complete", "completed", "paid", "billed", "processed"].some((ok) =>
      value.includes(ok),
    ) || value === "active"
  )
}

export async function validatePaddleApiKey({
  apiKey,
  config,
}: {
  apiKey: string
  config?: PaymentConnectorConfig
}) {
  const environment = resolveEnvironment()
  const trimmed = ensurePaddleKeyMatchesEnvironment({
    apiKey,
    environment,
  })

  await listPaddleTransactions({
    apiKey: trimmed,
    environment,
    limit: 1,
  })
}

export async function syncPaddleConnector({
  connector,
  apiKey,
  since,
  currencyAllTimeBase,
  latestPeriodStartByCurrency,
}: {
  connector: PaymentConnector
  apiKey: string
} & ProviderSyncContext): Promise<ProviderSyncResult> {
  const environment = resolveEnvironment()
  const sinceDate = since ? startOfUtcDay(new Date(since)) : null
  const { baseByCurrency, latestStartByCurrency } = buildBaseMaps({
    currencyAllTimeBase,
    latestPeriodStartByCurrency,
  })

  const transactions = await listPaddleTransactions({
    apiKey,
    environment,
  })

  const revenueByCurrency = new Map<
    string,
    Map<
      string,
      { periodRevenueCents: number; charges: number; periodStart: Date }
    >
  >()

  for (const tx of transactions as any[]) {
    const status =
      (typeof tx?.status === "string" ? tx.status : "") ||
      (typeof tx?.payment_status === "string" ? tx.payment_status : "") ||
      (typeof tx?.state === "string" ? tx.state : "")
    const createdAt =
      parseDate(tx?.billed_at) ||
      parseDate(tx?.created_at) ||
      parseDate(tx?.generated_at) ||
      parseDate(tx?.updated_at)
    const amountCents = pickAmountCents(tx)
    const currency = (pickCurrency(tx) || "USD").toUpperCase()

    if (!createdAt || !amountCents || amountCents <= 0) continue
    const periodStart = startOfUtcDay(createdAt)
    if (sinceDate && periodStart < sinceDate) continue
    if (!isSuccessfulStatus(status)) continue

    const dayKey = toDayKey(periodStart)
    const currencyMap =
      revenueByCurrency.get(currency) ||
      new Map<
        string,
        { periodRevenueCents: number; charges: number; periodStart: Date }
      >()
    const bucket = currencyMap.get(dayKey) || {
      periodRevenueCents: 0,
      charges: 0,
      periodStart,
    }

    bucket.periodRevenueCents += amountCents
    bucket.charges += 1
    currencyMap.set(dayKey, bucket)
    revenueByCurrency.set(currency, currencyMap)
  }

  const snapshots: RevenueSnapshotInput[] = []
  for (const [currency, buckets] of revenueByCurrency.entries()) {
    const ordered = Array.from(buckets.values()).sort((a, b) =>
      a.periodStart.getTime() > b.periodStart.getTime() ? 1 : -1,
    )
    let runningTotal = baseByCurrency.get(currency) ?? 0
    for (const bucket of ordered) {
      runningTotal += bucket.periodRevenueCents
      snapshots.push({
        currencyCode: currency,
        periodStart: bucket.periodStart,
        periodRevenueCents: bucket.periodRevenueCents,
        allTimeRevenueCents: runningTotal,
        data: {
          provider: "paddle",
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
      data: { provider: "paddle", charges: 0 },
    })
  }

  return { snapshots }
}

export const paddleProvider: PaymentProviderDefinition = {
  provider: PaymentConnectorProvider.paddle,
  validateApiKey: async ({ apiKey, config }) =>
    validatePaddleApiKey({
      apiKey,
      config,
    }),
  sync: async ({
    connector,
    apiKey,
    since,
    currencyAllTimeBase,
    latestPeriodStartByCurrency,
  }) =>
    syncPaddleConnector({
      connector,
      apiKey,
      since,
      currencyAllTimeBase,
      latestPeriodStartByCurrency,
    }),
}

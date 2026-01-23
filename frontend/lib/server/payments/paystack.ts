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

const DEFAULT_PAYSTACK_API_BASE = "https://api.paystack.co"

type PaystackListResponse<T> = {
  status?: boolean
  message?: string
  data?: T[]
  meta?: {
    total?: number
    perPage?: number
    page?: number
    pageCount?: number
    skipped?: number
  }
}

type PaystackTransaction = {
  id?: number | string
  status?: string
  amount?: number | string
  currency?: string
  paid_at?: string
  paidAt?: string
  transaction_date?: string
  created_at?: string
  createdAt?: string
  fees?: number | string
  refunded?: boolean
  subaccount?: string
}

function resolveApiBase() {
  const override = process.env.PAYSTACK_API_BASE_URL?.trim()
  return (override || DEFAULT_PAYSTACK_API_BASE).replace(/\/+$/, "")
}

function ensurePaystackKeyMatchesEnvironment(apiKey: string) {
  const trimmed = apiKey.trim()
  const expectedPrefix = IS_PROD ? "sk_live_" : "sk_test_"

  if (!trimmed.startsWith(expectedPrefix)) {
    throw new Error(
      IS_PROD
        ? "Use a Paystack live secret key starting with sk_live_."
        : "Use a Paystack test secret key starting with sk_test_.",
    )
  }

  return trimmed
}

async function paystackRequest<T>({
  apiKey,
  path,
  query,
}: {
  apiKey: string
  path: string
  query?: Record<string, string | number | boolean | undefined>
}): Promise<T> {
  const base = resolveApiBase()
  const url = new URL(
    path.startsWith("http")
      ? path
      : `${base}${path.startsWith("/") ? "" : "/"}${path}`,
  )

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined) return
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

  const text = await response.text()
  let json: any = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = null
  }

  if (!response.ok) {
    throw new Error(
      `Paystack request failed (${response.status} ${response.statusText}) for ${path}: ${text.slice(0, 300)}`,
    )
  }

  if (json && typeof json.status === "boolean" && json.status === false) {
    const message = json.message || `Paystack request failed for ${path}`
    throw new Error(message)
  }

  return (json as T) ?? ({} as T)
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

function pickPaidAt(tx: PaystackTransaction): Date | null {
  return (
    parseDate(tx.paid_at) ||
    parseDate(tx.paidAt) ||
    parseDate((tx as any)?.paidAt) ||
    parseDate(tx.transaction_date) ||
    parseDate(tx.created_at) ||
    parseDate(tx.createdAt) ||
    null
  )
}

function parseAmountToCents(amount: unknown): number | null {
  if (typeof amount === "number" && Number.isFinite(amount)) {
    const hasDecimals = amount % 1 !== 0
    return Math.round(hasDecimals ? amount * 100 : amount)
  }
  if (typeof amount === "string") {
    const parsed = Number(amount.replace(/[^0-9.-]/g, ""))
    if (Number.isFinite(parsed)) {
      const hasDecimals = parsed % 1 !== 0
      return Math.round(hasDecimals ? parsed * 100 : parsed)
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

async function listPaystackTransactions({
  apiKey,
  since,
}: {
  apiKey: string
  since?: Date | null
}) {
  const transactions: PaystackTransaction[] = []
  const perPage = 100
  const maxPages = 200
  let page = 1
  const fromDate = since ? toDayKey(startOfUtcDay(new Date(since))) : undefined

  while (page <= maxPages) {
    const body = await paystackRequest<
      PaystackListResponse<PaystackTransaction>
    >({
      apiKey,
      path: "/transaction",
      query: {
        perPage,
        page,
        status: "success",
        ...(fromDate ? { from: fromDate } : {}),
      },
    })

    const data = Array.isArray(body?.data) ? body.data : []
    transactions.push(...data)

    const meta = body?.meta || {}
    const pageCount =
      typeof meta.pageCount === "number" ? meta.pageCount : undefined
    const perPageMeta =
      typeof meta.perPage === "number" ? meta.perPage : perPage

    if (pageCount && page >= pageCount) break
    if (data.length < perPageMeta) break
    if (data.length === 0) break
    page += 1
  }

  return transactions
}

export async function validatePaystackApiKey({
  apiKey,
  config,
}: {
  apiKey: string
  config?: PaymentConnectorConfig
}) {
  const trimmed = ensurePaystackKeyMatchesEnvironment(apiKey)

  // Basic authentication check
  await paystackRequest<PaystackListResponse<PaystackTransaction>>({
    apiKey: trimmed,
    path: "/transaction",
    query: { perPage: 1 },
  })

  const subaccount = config?.accountId?.trim()
  if (subaccount) {
    await paystackRequest<any>({
      apiKey: trimmed,
      path: `/subaccount/${encodeURIComponent(subaccount)}`,
    })
  }
}

export async function syncPaystackConnector({
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
  const subaccount =
    typeof config?.accountId === "string" && config.accountId.trim().length
      ? config.accountId.trim()
      : undefined
  const trimmedKey = ensurePaystackKeyMatchesEnvironment(apiKey)
  const sinceDate = since ? startOfUtcDay(new Date(since)) : null
  const { baseByCurrency, latestStartByCurrency } = buildBaseMaps({
    currencyAllTimeBase,
    latestPeriodStartByCurrency,
  })

  const transactions = await listPaystackTransactions({
    apiKey: trimmedKey,
    since: sinceDate ?? undefined,
  })

  const revenueByCurrency = new Map<
    string,
    Map<
      string,
      { periodRevenueCents: number; charges: number; periodStart: Date }
    >
  >()

  for (const tx of transactions) {
    const status = (tx.status || "").toLowerCase()
    if (status !== "success") continue

    const currency = (tx.currency || "USD").toUpperCase()
    const amountCents = parseAmountToCents(tx.amount)
    const paidAt = pickPaidAt(tx)
    const txSubaccount =
      typeof tx.subaccount === "string" ? tx.subaccount.trim() : undefined

    if (!amountCents || amountCents <= 0) continue
    if (!paidAt) continue
    if (sinceDate && startOfUtcDay(paidAt) < sinceDate) continue
    if (subaccount && txSubaccount !== subaccount) continue

    const periodStart = startOfUtcDay(paidAt)
    const dayKey = toDayKey(periodStart)
    const currencyMap =
      revenueByCurrency.get(currency) ||
      new Map<
        string,
        { periodRevenueCents: number; charges: number; periodStart: Date }
      >()
    const bucket =
      currencyMap.get(dayKey) ||
      ({
        periodRevenueCents: 0,
        charges: 0,
        periodStart,
      } as const)

    currencyMap.set(dayKey, {
      periodRevenueCents: bucket.periodRevenueCents + amountCents,
      charges: bucket.charges + 1,
      periodStart,
    })
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
          provider: "paystack",
          charges: bucket.charges,
          ...(subaccount ? { subaccount } : {}),
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
      data: {
        provider: "paystack",
        charges: 0,
        ...(subaccount ? { subaccount } : {}),
      },
    })
  }

  return { snapshots }
}

export const paystackProvider: PaymentProviderDefinition = {
  provider: PaymentConnectorProvider.paystack,
  validateApiKey: async ({ apiKey, config }) =>
    validatePaystackApiKey({ apiKey, config }),
  sync: async ({
    connector,
    apiKey,
    since,
    currencyAllTimeBase,
    latestPeriodStartByCurrency,
  }) =>
    syncPaystackConnector({
      connector,
      apiKey,
      since,
      currencyAllTimeBase,
      latestPeriodStartByCurrency,
    }),
}

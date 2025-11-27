import { PaymentConnectorProvider } from "@/lib/vendor/prisma/client"

import type {
  PaymentConnectorConfig,
  PaymentProviderDefinition,
  ProviderSyncContext,
  RevenueSnapshotInput,
} from "./types"

const CREEM_PROD_BASE = "https://api.creem.io"
const CREEM_TEST_BASE = "https://test-api.creem.io"
const DEFAULT_PAGE_SIZE = 100
const MAX_PAGES = 200

type CreemPagination = {
  current_page?: number | null
  next_page?: number | null
  total_pages?: number | null
}

type CreemTransaction = {
  id?: string
  amount?: number | null
  amount_paid?: number | null
  refunded_amount?: number | null
  currency?: string | null
  status?: string | null
  description?: string | null
  created_at?: number | null
  period_start?: number | null
  period_end?: number | null
  mode?: string | null
}

type CreemTransactionResponse = {
  items?: CreemTransaction[] | null
  pagination?: CreemPagination | null
}

class CreemApiError extends Error {
  status?: number
  baseUrl: string

  constructor(message: string, status: number | undefined, baseUrl: string) {
    super(message)
    this.status = status
    this.baseUrl = baseUrl
  }

  get isAuthError() {
    return this.status === 401 || this.status === 403
  }
}

function normalizeBaseUrl(url?: string | null) {
  const trimmed = (url || "").trim()
  if (!trimmed) return null
  return trimmed.replace(/\/+$/, "")
}

function resolveBaseUrl(config?: PaymentConnectorConfig) {
  const useTest = config?.environment === "test_mode"
  const override = useTest
    ? normalizeBaseUrl(process.env.CREEM_TEST_API_BASE_URL)
    : normalizeBaseUrl(process.env.CREEM_API_BASE_URL)
  if (override) return override
  return useTest ? CREEM_TEST_BASE : CREEM_PROD_BASE
}

async function creemRequest<T>({
  apiKey,
  baseUrl,
  path,
  query,
}: {
  apiKey: string
  baseUrl: string
  path: string
  query?: Record<string, string | number | undefined>
}): Promise<T> {
  const url = new URL(
    path.startsWith("/") ? `${baseUrl}${path}` : `${baseUrl}/${path}`,
  )
  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value === undefined) return
    url.searchParams.set(key, String(value))
  })

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json",
      "x-api-key": apiKey,
    },
  })

  if (!response.ok) {
    const text = await response.text().catch(() => "")
    const message = `Creem request failed (${response.status} ${response.statusText})`
    throw new CreemApiError(
      `${message}: ${text.slice(0, 300)}`,
      response.status,
      baseUrl,
    )
  }

  return (await response.json()) as T
}

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  )
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function parseTimestamp(value: unknown): Date | null {
  const num = toNumber(value)
  if (num === null) return null
  const ms = num > 1e12 ? num : num * 1000
  const date = new Date(ms)
  return Number.isNaN(date.getTime()) ? null : date
}

function resolveTransactionDate(tx: CreemTransaction): Date | null {
  return (
    parseTimestamp(tx.created_at) ??
    parseTimestamp(tx.period_end) ??
    parseTimestamp(tx.period_start)
  )
}

function normalizeCurrency(code?: string | null) {
  const trimmed = (code || "").trim()
  return trimmed.length >= 3 ? trimmed.toUpperCase() : null
}

function netRevenueCents(tx: CreemTransaction) {
  const paid =
    toNumber(tx.amount_paid) ??
    toNumber(tx.amount) ??
    0
  const refunded = toNumber(tx.refunded_amount) ?? 0
  const net = Math.round(paid - refunded)
  return Number.isFinite(net) && net > 0 ? net : 0
}

async function fetchTransactionsFromBase({
  apiKey,
  baseUrl,
  pageSize,
  maxPages,
}: {
  apiKey: string
  baseUrl: string
  pageSize?: number
  maxPages?: number
}) {
  const items: CreemTransaction[] = []
  let page = 1
  const limit = Math.max(1, maxPages ?? MAX_PAGES)

  while (page <= limit) {
    const data = await creemRequest<CreemTransactionResponse>({
      apiKey,
      baseUrl,
      path: "/v1/transactions/search",
      query: {
        page_number: page,
        page_size: pageSize ?? DEFAULT_PAGE_SIZE,
      },
    })

    if (Array.isArray(data.items)) {
      items.push(...data.items)
    }

    const nextPage = data.pagination?.next_page ?? null
    if (!nextPage || nextPage <= page) {
      break
    }
    page = nextPage
  }

  return items
}

async function fetchTransactionsWithFallback({
  apiKey,
  config,
  pageSize,
  maxPages,
}: {
  apiKey: string
  config?: PaymentConnectorConfig
  pageSize?: number
  maxPages?: number
}) {
  const primaryBase = resolveBaseUrl(config)
  const fallbackBase =
    config?.environment === "test_mode"
      ? null
      : resolveBaseUrl({ environment: "test_mode" })

  const bases = [primaryBase, ...(fallbackBase ? [fallbackBase] : [])]
  let lastError: unknown

  for (const baseUrl of bases) {
    try {
      const items = await fetchTransactionsFromBase({
        apiKey,
        baseUrl,
        pageSize,
        maxPages,
      })
      return { items, baseUrl }
    } catch (error) {
      lastError = error
      const authFailed =
        error instanceof CreemApiError && error.isAuthError && !config?.environment
      if (!authFailed) {
        break
      }
    }
  }

  if (lastError instanceof Error) throw lastError
  throw new Error("Creem request failed")
}

function buildSnapshots({
  transactions,
  context,
}: {
  transactions: CreemTransaction[]
  context: ProviderSyncContext
}): RevenueSnapshotInput[] {
  if (transactions.length === 0) return []

  const thresholds =
    context.latestPeriodStartByCurrency ||
    new Map<string, Date | undefined | null>()
  const baseThreshold = context.since ? startOfUtcDay(context.since) : null

  const byCurrency = new Map<
    string,
    Map<
      string,
      { periodStart: Date; periodRevenueCents: number; transactions: number }
    >
  >()

  for (const tx of transactions) {
    const currency = normalizeCurrency(tx.currency) ?? "USD"
    const createdAt = resolveTransactionDate(tx)
    if (!createdAt) continue

    const dayStart = startOfUtcDay(createdAt)
    const currencyThreshold = thresholds.get(currency)
    if (
      baseThreshold &&
      dayStart < baseThreshold &&
      !currencyThreshold
    ) {
      continue
    }
    if (currencyThreshold && dayStart < startOfUtcDay(currencyThreshold)) {
      continue
    }

    const net = netRevenueCents(tx)
    if (net <= 0) continue

    const currencyMap = byCurrency.get(currency) ?? new Map()
    const key = dayStart.toISOString().slice(0, 10)
    const existing =
      currencyMap.get(key) ??
      ({ periodStart: dayStart, periodRevenueCents: 0, transactions: 0 } as {
        periodStart: Date
        periodRevenueCents: number
        transactions: number
      })
    existing.periodRevenueCents += net
    existing.transactions += 1
    currencyMap.set(key, existing)
    byCurrency.set(currency, currencyMap)
  }

  const snapshots: RevenueSnapshotInput[] = []

  for (const [currency, buckets] of byCurrency.entries()) {
    const ordered = Array.from(buckets.values()).sort(
      (a, b) => a.periodStart.getTime() - b.periodStart.getTime(),
    )
    const baseAllTime =
      context.currencyAllTimeBase?.get(currency) ??
      context.currencyAllTimeBase?.get(currency.toUpperCase()) ??
      0
    let running = baseAllTime

    for (const bucket of ordered) {
      running += bucket.periodRevenueCents
      snapshots.push({
        currencyCode: currency,
        periodStart: bucket.periodStart,
        periodRevenueCents: bucket.periodRevenueCents,
        allTimeRevenueCents: running,
        data: {
          transactions: bucket.transactions,
          provider: "creem",
        },
      })
    }
  }

  return snapshots
}

export const creemProvider: PaymentProviderDefinition = {
  provider: PaymentConnectorProvider.creem,
  async validateApiKey({ apiKey, config }) {
    const key = apiKey.trim()
    if (!key) {
      throw new Error("Creem API key is required")
    }
    if (!key.startsWith("creem_")) {
      throw new Error("Creem API keys must start with creem_")
    }
    await fetchTransactionsWithFallback({
      apiKey: key,
      config,
      pageSize: 1,
      maxPages: 1,
    })
  },
  async sync({
    apiKey,
    connector,
    since,
    currencyAllTimeBase,
    latestPeriodStartByCurrency,
  }) {
    const key = apiKey.trim()
    if (!key) {
      throw new Error("Creem API key is required for sync")
    }

    const connectorConfig =
      (connector.config as PaymentConnectorConfig | null) ?? undefined

    const { items } = await fetchTransactionsWithFallback({
      apiKey: key,
      config: connectorConfig,
      pageSize: DEFAULT_PAGE_SIZE,
      maxPages: MAX_PAGES,
    })

    const snapshots = buildSnapshots({
      transactions: items,
      context: { since, currencyAllTimeBase, latestPeriodStartByCurrency },
    })

    return { snapshots }
  },
}

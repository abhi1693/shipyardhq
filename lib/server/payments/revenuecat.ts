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

const DEFAULT_REVENUECAT_API_BASE = "https://api.revenuecat.com"
const REVENUECAT_API_VERSION = "v2"

type Customer = { id: string }

type Subscription = {
  id: string
  starts_at?: number | null
  current_period_starts_at?: number | null
  total_revenue_in_usd?: {
    currency?: string
    gross?: number
    proceeds?: number
    commission?: number
    tax?: number
  }
}

type SubscriptionsPage = {
  items?: Subscription[]
  next_page?: string | null
}

type CustomersPage = {
  items?: Customer[]
  next_page?: string | null
}

type RevenueBucket = {
  periodStart: Date
  revenueCents: number
  charges: number
}

function getBaseUrl() {
  const override = process.env.REVENUECAT_API_BASE_URL?.trim()
  const base = override && override.length ? override : DEFAULT_REVENUECAT_API_BASE
  return base.replace(/\/+$/, "")
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

function parseAmountToCents(
  value: unknown,
  options?: { hint?: string },
): number | null {
  const hint = options?.hint?.toLowerCase() ?? ""
  const treatAsCents = hint.includes("cent")

  if (typeof value === "number" && Number.isFinite(value)) {
    if (treatAsCents) return Math.round(value)
    const hasDecimals = value % 1 !== 0
    const magnitude = Math.abs(value)
    const asCents = hasDecimals || magnitude < 1000 ? value * 100 : value
    return Math.round(asCents)
  }

  if (typeof value === "string" && value.trim().length) {
    const parsed = Number(value.replace(/[^0-9.-]/g, ""))
    if (!Number.isFinite(parsed)) return null
    const hasDecimals = parsed % 1 !== 0
    const magnitude = Math.abs(parsed)
    const asCents =
      treatAsCents || (!hasDecimals && magnitude >= 1000)
        ? parsed
        : parsed * 100
    return Math.round(asCents)
  }

  return null
}

function getProjectId(config?: PaymentConnectorConfig | null): string {
  const raw =
    (config as PaymentConnectorConfig | undefined)?.accountId ||
    (config as any)?.projectId
  if (typeof raw !== "string") return ""
  return raw.trim()
}

function getEnvironment(): "production" | "sandbox" {
  return IS_PROD ? "production" : "sandbox"
}

async function revenueCatRequest<T>({
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
      `RevenueCat request failed (${response.status} ${response.statusText}) for ${path}: ${text.slice(0, 180)}`,
    )
  }

  return (await response.json()) as T
}

async function fetchCustomers({
  apiKey,
  projectId,
  environment,
}: {
  apiKey: string
  projectId: string
  environment?: "production" | "sandbox"
}): Promise<Customer[]> {
  const customers: Customer[] = []
  const firstPath = `/${REVENUECAT_API_VERSION}/projects/${encodeURIComponent(projectId)}/customers`
  let nextPath: string | null = firstPath

  while (nextPath) {
    const path: string = nextPath
    const query: Record<string, string | number | undefined> | undefined =
      nextPath === firstPath && environment
        ? { environment, limit: 100 }
        : nextPath === firstPath
          ? { limit: 100 }
          : undefined
    const payload: CustomersPage = await revenueCatRequest<CustomersPage>({
      apiKey,
      path,
      query,
    })
    if (Array.isArray(payload?.items)) {
      customers.push(...payload.items.filter((c): c is Customer => !!c?.id))
    }
    nextPath = payload?.next_page ?? null
  }

  return customers
}

async function fetchSubscriptions({
  apiKey,
  projectId,
  customerId,
  environment,
}: {
  apiKey: string
  projectId: string
  customerId: string
  environment?: "production" | "sandbox"
}): Promise<Subscription[]> {
  const subscriptions: Subscription[] = []
  const firstPath = `/${REVENUECAT_API_VERSION}/projects/${encodeURIComponent(projectId)}/customers/${encodeURIComponent(customerId)}/subscriptions`
  let nextPath: string | null = firstPath

  while (nextPath) {
    const path: string = nextPath
    const query: Record<string, string | number | undefined> | undefined =
      nextPath === firstPath && environment
        ? { environment, limit: 100 }
        : nextPath === firstPath
          ? { limit: 100 }
          : undefined
    const payload: SubscriptionsPage =
      await revenueCatRequest<SubscriptionsPage>({
        apiKey,
        path,
        query,
      })
    if (Array.isArray(payload?.items)) {
      subscriptions.push(
        ...payload.items.filter((s): s is Subscription => !!s?.id),
      )
    }
    nextPath = payload?.next_page ?? null
  }

  return subscriptions
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

async function syncRevenueCatConnector({
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
  const projectId = getProjectId(config)
  if (!projectId) {
    throw new Error("RevenueCat project ID is required")
  }
  const environment = getEnvironment()

  const currencyCode = connector.latestCurrencyCode?.toUpperCase() || "USD"

  const customers = await fetchCustomers({ apiKey, projectId, environment })
  const subscriptions: Subscription[] = []
  for (const customer of customers) {
    const records = await fetchSubscriptions({
      apiKey,
      projectId,
      customerId: customer.id,
      environment,
    })
    subscriptions.push(...records)
  }

  const lookbackStart = since ? startOfUtcDay(new Date(since)) : null
  const { baseByCurrency, latestStartByCurrency } = buildBaseMaps({
    currencyAllTimeBase,
    latestPeriodStartByCurrency,
  })

  const revenueByCurrency = new Map<string, Map<string, RevenueBucket>>()

  for (const sub of subscriptions) {
    const ts =
      sub.starts_at ??
      sub.current_period_starts_at ??
      sub.current_period_starts_at
    if (!ts) continue
    const start = startOfUtcDay(new Date(ts))
    if (Number.isNaN(start.getTime())) continue
    if (lookbackStart && start < lookbackStart) continue

    const amount = sub.total_revenue_in_usd
    const currency = amount?.currency?.toUpperCase?.() || "USD"
    const revenueValue =
      amount?.gross ?? amount?.proceeds ?? amount?.tax ?? amount?.commission
    const revenueCents = parseAmountToCents(revenueValue, {
      hint: "subscription.total_revenue_in_usd",
    })
    if (revenueCents == null || revenueCents <= 0) continue

    const dayKey = toDayKey(start)
    const currencyMap =
      revenueByCurrency.get(currency) || new Map<string, RevenueBucket>()
    const bucket =
      currencyMap.get(dayKey) || {
        periodStart: start,
        revenueCents: 0,
        charges: 0,
      }
    bucket.revenueCents += revenueCents
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
      runningTotal += bucket.revenueCents
      snapshots.push({
        currencyCode: currency,
        periodStart: bucket.periodStart,
        periodRevenueCents: bucket.revenueCents,
        allTimeRevenueCents: runningTotal,
        data: {
          provider: "revenuecat",
          projectId,
          metricSource: "subscriptions",
          charges: bucket.charges,
        },
      })
    }
  }

  if (snapshots.length === 0) {
    const fallbackCurrency =
      connector.latestCurrencyCode?.toUpperCase() ||
      Array.from(baseByCurrency.keys())[0] ||
      currencyCode
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
      data: { provider: "revenuecat", projectId, charges: 0 },
    })
  }

  return { snapshots }
}

export const revenueCatProvider: PaymentProviderDefinition = {
  provider: PaymentConnectorProvider.revenuecat,
  validateApiKey: async ({ apiKey, config }) => {
    const key = apiKey.trim()
    if (!key) throw new Error("RevenueCat API key is required")
    const projectId = getProjectId(config)
    if (!projectId) throw new Error("RevenueCat project ID is required")
  },
  sync: async ({
    connector,
    apiKey,
    since,
    currencyAllTimeBase,
    latestPeriodStartByCurrency,
  }) =>
    syncRevenueCatConnector({
      connector,
      apiKey,
      since,
      currencyAllTimeBase,
      latestPeriodStartByCurrency,
    }),
}

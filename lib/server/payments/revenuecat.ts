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

const DEFAULT_REVENUECAT_API_BASE = "https://api.revenuecat.com"

type RevenueCatPoint = {
  periodStart: Date
  currencyCode: string
  revenueCents: number
  mrrCents?: number | null
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

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10)
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

function pickCurrency(entry: any, fallback?: string | null): string | null {
  const candidates = [
    entry?.currency,
    entry?.currency_code,
    entry?.currencyCode,
    entry?.revenue?.currency,
    entry?.amount?.currency,
    entry?.metrics?.currency,
    fallback,
  ]
  for (const value of candidates) {
    if (typeof value === "string" && value.trim().length >= 3) {
      return value.trim().toUpperCase()
    }
  }
  return null
}

function pickAmountCents(entry: any): number | null {
  const candidates: Array<[unknown, string | undefined]> = [
    [entry?.revenue_cents, "revenue_cents"],
    [entry?.revenueCents, "revenueCents"],
    [entry?.revenue_in_cents, "revenue_in_cents"],
    [entry?.amount_cents, "amount_cents"],
    [entry?.amount, "amount"],
    [entry?.revenue, "revenue"],
    [entry?.value, "value"],
    [entry?.total, "total"],
    [entry?.gross, "gross"],
    [entry?.net, "net"],
    [entry?.metrics?.revenue, "metrics.revenue"],
    [entry?.metrics?.value, "metrics.value"],
  ]

  for (const [value, hint] of candidates) {
    const cents = parseAmountToCents(value, { hint })
    if (typeof cents === "number" && cents > 0) return cents
  }

  return null
}

function pickMrrCents(entry: any): number | null {
  const candidates: Array<[unknown, string | undefined]> = [
    [entry?.mrr_cents, "mrr_cents"],
    [entry?.mrrCents, "mrrCents"],
    [entry?.mrr, "mrr"],
    [entry?.recurring_revenue, "recurring_revenue"],
    [entry?.metrics?.mrr, "metrics.mrr"],
  ]

  for (const [value, hint] of candidates) {
    const cents = parseAmountToCents(value, { hint })
    if (typeof cents === "number" && cents > 0) return cents
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

function collectSeriesFromPayload(payload: any): RevenueCatPoint[] {
  const containers: any[] = []
  if (Array.isArray(payload)) containers.push(payload)
  if (Array.isArray(payload?.data)) containers.push(payload.data)
  if (Array.isArray(payload?.series)) containers.push(payload.series)
  if (Array.isArray(payload?.data?.series)) containers.push(payload.data.series)
  if (Array.isArray(payload?.results)) containers.push(payload.results)
  if (Array.isArray(payload?.points)) containers.push(payload.points)

  const fallbackCurrency = pickCurrency(payload, "USD")
  const points: RevenueCatPoint[] = []

  for (const container of containers) {
    if (!Array.isArray(container)) continue
    for (const entry of container) {
      const rawDate =
        entry?.date ??
        entry?.period_start ??
        entry?.periodStart ??
        entry?.timestamp ??
        entry?.time ??
        entry?.day
      const periodStart = rawDate ? startOfUtcDay(new Date(rawDate)) : null
      if (!periodStart || Number.isNaN(periodStart.getTime())) continue

      const currency = pickCurrency(entry, fallbackCurrency)
      const revenueCents = pickAmountCents(entry)
      const mrrCents = pickMrrCents(entry)
      if (!currency || !revenueCents) continue

      points.push({
        periodStart,
        currencyCode: currency,
        revenueCents,
        mrrCents,
      })
    }
  }

  return points
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

async function fetchRevenueCatSeries({
  apiKey,
  projectId,
  start,
  end,
}: {
  apiKey: string
  projectId: string
  start: Date
  end: Date
}) {
  const query = {
    start: formatDate(start),
    end: formatDate(end),
    granularity: "day",
  }

  const pathCandidates = [
    `/v2/projects/${encodeURIComponent(projectId)}/charts/revenue`,
    `/v2/projects/${encodeURIComponent(projectId)}/metrics/revenue`,
    `/v1/projects/${encodeURIComponent(projectId)}/charts/revenue`,
  ]

  let lastError: Error | null = null
  for (const path of pathCandidates) {
    try {
      const payload = await revenueCatRequest<any>({ apiKey, path, query })
      const series = collectSeriesFromPayload(payload)
      if (series.length) return series
      lastError = new Error(
        `RevenueCat response did not include revenue data for ${path}`,
      )
    } catch (error) {
      lastError =
        error instanceof Error
          ? error
          : new Error("RevenueCat request failed")
    }
  }

  if (lastError) throw lastError
  throw new Error("Unable to load RevenueCat revenue data")
}

export async function syncRevenueCatConnector({
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

  const lookbackStart = since ? startOfUtcDay(new Date(since)) : null
  const start =
    lookbackStart ??
    startOfUtcDay(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000))
  const end = startOfUtcDay(new Date())

  const series = await fetchRevenueCatSeries({ apiKey, projectId, start, end })
  const { baseByCurrency, latestStartByCurrency } = buildBaseMaps({
    currencyAllTimeBase,
    latestPeriodStartByCurrency,
  })

  const revenueByCurrency = new Map<
    string,
    Map<string, { periodStart: Date; revenueCents: number; charges: number }>
  >()
  const mrrByCurrency = new Map<string, number>()

  for (const point of series) {
    const currency = point.currencyCode?.toUpperCase() || "USD"
    const dayKey = toDayKey(point.periodStart)
    const currencyMap =
      revenueByCurrency.get(currency) ||
      new Map<string, { periodStart: Date; revenueCents: number; charges: number }>()
    const bucket =
      currencyMap.get(dayKey) || {
        periodStart: point.periodStart,
        revenueCents: 0,
        charges: 0,
      }
    bucket.revenueCents += point.revenueCents
    bucket.charges += 1
    currencyMap.set(dayKey, bucket)
    revenueByCurrency.set(currency, currencyMap)

    if (typeof point.mrrCents === "number") {
      mrrByCurrency.set(currency, point.mrrCents)
    }
  }

  const snapshots: RevenueSnapshotInput[] = []
  for (const [currency, buckets] of revenueByCurrency.entries()) {
    const ordered = Array.from(buckets.values()).sort((a, b) =>
      a.periodStart.getTime() > b.periodStart.getTime() ? 1 : -1,
    )
    let runningTotal = baseByCurrency.get(currency) ?? 0
    const mrrCents = mrrByCurrency.get(currency) ?? null
    for (const bucket of ordered) {
      if (lookbackStart && bucket.periodStart < lookbackStart) continue
      runningTotal += bucket.revenueCents
      snapshots.push({
        currencyCode: currency,
        periodStart: bucket.periodStart,
        periodRevenueCents: bucket.revenueCents,
        allTimeRevenueCents: runningTotal,
        mrrCents,
        data: {
          provider: "revenuecat",
          projectId,
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

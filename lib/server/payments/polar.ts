import { PaymentConnectorProvider } from "@/lib/vendor/prisma/client"

import type { PaymentProviderDefinition } from "./types"

const DEFAULT_POLAR_API_BASE = "https://api.polar.sh"
const SANDBOX_POLAR_API_BASE = "https://sandbox-api.polar.sh"

function getPolarBaseUrl() {
  const envBase = process.env.POLAR_API_BASE_URL?.trim()
  const polarEnv = process.env.POLAR_ENV?.trim().toLowerCase()
  return (
    envBase ||
    (polarEnv === "sandbox" ? SANDBOX_POLAR_API_BASE : DEFAULT_POLAR_API_BASE)
  ).replace(/\/+$/, "")
}

async function fetchPolarCollection(apiKey: string, path: string) {
  const baseUrl = getPolarBaseUrl()
  const limit = 100
  let page = 1
  const items: unknown[] = []

  while (true) {
    const url = `${baseUrl}${path}${
      path.includes("?") ? "&" : "?"
    }page=${page}&limit=${limit}`
    const response = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}` },
    })

    if (!response.ok) {
      throw new Error(
        `Polar request failed (${response.status} ${response.statusText}) for ${path}`,
      )
    }

    const data: any = await response.json()
    const pageItems = Array.isArray(data?.items) ? data.items : []
    items.push(...pageItems)
    const maxPage = Number(data?.pagination?.max_page ?? 0)
    if (!maxPage || page >= maxPage) break
    page += 1
  }

  return items
}

async function listPolarOrganizations(apiKey: string) {
  const items = await fetchPolarCollection(
    apiKey,
    "/v1/organizations/?sorting=created_at",
  )
  return items
}

async function listPolarOrders(apiKey: string) {
  return fetchPolarCollection(
    apiKey,
    "/v1/orders/?sorting=created_at&status=paid",
  )
}

async function listPolarSubscriptions(apiKey: string) {
  return fetchPolarCollection(
    apiKey,
    "/v1/subscriptions/?sorting=created_at&status=active",
  )
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

function normalizeIntervalToMonthly(
  amountCents: number,
  interval: string | undefined,
  count: number | undefined,
): number {
  const safeCount = count && count > 0 ? count : 1
  const key = (interval || "").toLowerCase()
  switch (key) {
    case "day":
      return Math.round((amountCents * 365) / (12 * safeCount))
    case "week":
      return Math.round((amountCents * 52) / (12 * safeCount))
    case "year":
      return Math.round(amountCents / (12 * safeCount))
    case "month":
    default:
      return Math.round(amountCents / safeCount)
  }
}

function pickNumber(obj: any, keys: string[]): number | null {
  for (const key of keys) {
    const value = obj?.[key]
    const num = Number(value)
    if (Number.isFinite(num)) return num
  }
  return null
}

function pickCurrency(obj: any): string | null {
  const candidates = ["currency", "currency_code", "currencyCode"]
  for (const key of candidates) {
    const value = obj?.[key]
    if (typeof value === "string" && value.trim().length >= 3) {
      return value.trim().toUpperCase()
    }
  }
  return null
}

// Placeholder Polar connector to allow storing credentials and scheduling syncs.
export const polarProvider: PaymentProviderDefinition = {
  provider: PaymentConnectorProvider.polar,
  async validateApiKey({ apiKey, productName }) {
    const trimmed = apiKey.trim()
    if (!trimmed.startsWith("polar_oat_")) {
      throw new Error("Polar API keys must start with 'polar_oat_'")
    }

    const orgs = await listPolarOrganizations(trimmed)
    const normalizedOrgNames: string[] = orgs
      .map((org: any) => (typeof org?.name === "string" ? org.name : ""))
      .map((name: string) => name.trim().toLowerCase())
      .filter((name: string): name is string => Boolean(name))

    if (normalizedOrgNames.length === 0) {
      throw new Error("No Polar organizations found for this API key")
    }

    const normalizedProductName = productName?.trim().toLowerCase()
    if (normalizedProductName) {
      const hasMatch = normalizedOrgNames.some(
        (name: string) => name === normalizedProductName,
      )
      if (!hasMatch) {
        throw new Error(
          `Polar organization '${productName}' not found. Create or rename the organization to match your product name.`,
        )
      }
    }
  },
  async sync({ apiKey }) {
    const [orgs, orders, subscriptions] = await Promise.all([
      listPolarOrganizations(apiKey),
      listPolarOrders(apiKey).catch(() => []),
      listPolarSubscriptions(apiKey).catch(() => []),
    ])

    const orgIds = orgs
      .map((org: any) => (typeof org?.id === "string" ? org.id : ""))
      .filter((id: string): id is string => Boolean(id))

    type DailyBucket = {
      periodRevenueCents: number
      allTimeRevenueCents: number
      mrrCents: number | null
      day: string
      periodStart: Date
    }
    const byCurrency = new Map<string, Map<string, DailyBucket>>()
    const mrrByCurrency = new Map<string, number>()

    for (const order of orders as any[]) {
      const amount =
        pickNumber(order, [
          "total_amount",
          "amount",
          "subtotal_amount",
          "subtotal_amount_cents",
          "amount_cents",
          "gross_amount",
          "price_amount",
          "price_amount_cents",
          "value_amount",
          "value_amount_cents",
        ]) || 0
      const currency = pickCurrency(order) || "USD"
      const createdRaw =
        (order as any)?.created_at || (order as any)?.createdAt || Date.now()
      const createdAt = new Date(createdRaw)
      if (!Number.isFinite(amount) || amount <= 0 || Number.isNaN(createdAt)) {
        continue
      }

      const dayKey = toDayKey(createdAt)
      const dayStart = startOfUtcDay(createdAt)
      const currencyMap =
        byCurrency.get(currency) || new Map<string, DailyBucket>()
      const bucket =
        currencyMap.get(dayKey) ||
        ({
          periodRevenueCents: 0,
          allTimeRevenueCents: 0,
          mrrCents: null,
          day: dayKey,
          periodStart: dayStart,
        } satisfies DailyBucket)
      bucket.periodRevenueCents += Math.round(amount)
      currencyMap.set(dayKey, bucket)
      byCurrency.set(currency, currencyMap)
    }

    for (const sub of subscriptions as any[]) {
      const amount =
        pickNumber(sub, [
          "price_amount",
          "price_amount_cents",
          "amount",
          "amount_cents",
          "billing_amount",
        ]) || 0
      const interval =
        ((sub as any)?.billing_interval || (sub as any)?.interval || "") + ""
      const intervalCount =
        pickNumber(sub, ["billing_interval_count", "interval_count"]) ?? 1
      const currency = pickCurrency(sub) || "USD"
      if (!Number.isFinite(amount) || amount <= 0) continue
      const monthly = normalizeIntervalToMonthly(
        amount,
        interval,
        intervalCount,
      )
      const prev = mrrByCurrency.get(currency) ?? 0
      mrrByCurrency.set(currency, prev + monthly)
    }

    const snapshots = Array.from(byCurrency.entries())
      .map(([currency, buckets]) => {
        const ordered = Array.from(buckets.values()).sort((a, b) =>
          a.periodStart.getTime() > b.periodStart.getTime() ? 1 : -1,
        )
        let runningAllTime = 0
        const latest = ordered[ordered.length - 1]
        const mrr = mrrByCurrency.get(currency) ?? null

        return ordered.map((bucket) => {
          runningAllTime += bucket.periodRevenueCents
          return {
            currencyCode: currency,
            periodStart: bucket.periodStart,
            periodRevenueCents: bucket.periodRevenueCents,
            allTimeRevenueCents: runningAllTime,
            mrrCents: bucket === latest ? mrr : null,
            data: {
              source: "polar",
              organizationIds: orgIds,
            },
          }
        })
      })
      .flat()

    // If nothing was found, still emit a single zero snapshot so the sync is considered valid.
    if (snapshots.length === 0) {
      const today = startOfUtcDay(new Date())
      snapshots.push({
        currencyCode: "USD",
        periodStart: today,
        periodRevenueCents: 0,
        allTimeRevenueCents: 0,
        mrrCents: mrrByCurrency.get("USD") ?? null,
        data: {
          source: "polar",
          organizationIds: orgIds,
        },
      })
    }

    return { snapshots }
  },
}

import {
  PaymentConnectorProvider,
  type Prisma,
} from "@/lib/vendor/prisma/client"

import type { PaymentProviderDefinition, RevenueSnapshotInput } from "./types"

const DEFAULT_API_BASE = "https://api.abacatepay.com/v1"
const DEFAULT_CURRENCY = "BRL"

type MerchantInfo = {
  name?: string | null
  website?: string | null
  createdAt?: string | null
}

type RevenueDay = {
  amount?: number | string | null
  count?: number | string | null
  currency?: string | null
}

type RevenuePayload = {
  totalRevenue?: number | null
  totalTransactions?: number | null
  transactionsPerDay?: Record<string, RevenueDay> | null
}

type AbacateResponse<T> = {
  data?: T | null
  error?: unknown
}

function resolveApiBase() {
  const override = process.env.ABACATEPAY_API_BASE_URL?.trim()
  const base = (override || DEFAULT_API_BASE).replace(/\/+$/, "")
  return base.length ? base : DEFAULT_API_BASE
}

function resolveCurrency() {
  const override = process.env.ABACATEPAY_DEFAULT_CURRENCY?.trim()
  return (override || DEFAULT_CURRENCY).toUpperCase()
}

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  )
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return startOfUtcDay(next)
}

function parseDay(dateStr: string): Date | null {
  if (!dateStr || typeof dateStr !== "string") return null
  const parsed = new Date(`${dateStr}T00:00:00Z`)
  return Number.isNaN(parsed.getTime()) ? null : startOfUtcDay(parsed)
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

async function abacateRequest<T>(
  apiKey: string,
  path: string,
  query?: Record<string, string | number | undefined>,
): Promise<T> {
  const baseUrl = resolveApiBase()
  const url = new URL(`${baseUrl}${path.startsWith("/") ? path : `/${path}`}`)
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

  if (response.status === 401) {
    throw new Error("AbacatePay authentication failed. Check the API token.")
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "")
    throw new Error(
      `AbacatePay request failed (${response.status} ${response.statusText}): ${text.slice(0, 200)}`,
    )
  }

  const json = (await response.json()) as AbacateResponse<T>
  if (json.error) {
    const message =
      typeof json.error === "string"
        ? json.error
        : "AbacatePay returned an error response"
    throw new Error(message)
  }
  if (!json.data) {
    throw new Error("AbacatePay responded without data")
  }
  return json.data
}

async function fetchMerchantInfo(apiKey: string) {
  return abacateRequest<MerchantInfo>(apiKey, "/public-mrr/merchant-info")
}

async function fetchRevenue(
  apiKey: string,
  startDate: string,
  endDate: string,
) {
  return abacateRequest<RevenuePayload>(apiKey, "/public-mrr/revenue", {
    startDate,
    endDate,
  })
}

export const abacatePayProvider: PaymentProviderDefinition = {
  provider: PaymentConnectorProvider.abacatepay,
  async validateApiKey({ apiKey }) {
    const trimmed = apiKey.trim()
    if (!trimmed) {
      throw new Error("AbacatePay API key is required")
    }
    if (!trimmed.startsWith("mrr_")) {
      throw new Error("AbacatePay API keys must start with 'mrr_'")
    }
    await fetchMerchantInfo(trimmed)
  },
  async sync({ apiKey, currencyAllTimeBase, latestPeriodStartByCurrency }) {
    const token = apiKey.trim()
    if (!token) {
      throw new Error("AbacatePay API key is required for sync")
    }

    const defaultCurrency = resolveCurrency()
    const today = startOfUtcDay(new Date())
    const threshold =
      latestPeriodStartByCurrency?.get(defaultCurrency) ||
      latestPeriodStartByCurrency?.get(defaultCurrency.toLowerCase()) ||
      null
    const thresholdDay = threshold ? startOfUtcDay(new Date(threshold)) : null
    const endDay = addUtcDays(today, -1) // only sync through yesterday to avoid future dates
    let startDay = thresholdDay
      ? addUtcDays(thresholdDay, 1) // fetch only missing days after the last snapshot
      : new Date("1970-01-01T00:00:00Z")

    // If we've already synced yesterday (or later), step the window back one more day.
    if (thresholdDay && thresholdDay >= endDay) {
      startDay = addUtcDays(endDay, -1)
    }

    // Defensive: ensure endDay is after startDay.
    if (endDay <= startDay) {
      startDay = addUtcDays(endDay, -1)
    }

    // If start is still after end, there is nothing new to pull.
    if (startDay >= endDay) {
      return { snapshots: [] }
    }

    const startDate = startDay.toISOString().slice(0, 10)
    const endDate = endDay.toISOString().slice(0, 10)

    const [merchantInfo, revenue] = await Promise.all([
      fetchMerchantInfo(token).catch((error) => {
        console.warn("[payments.abacatepay] merchant info fetch failed", {
          error,
        })
        return null
      }),
      fetchRevenue(token, startDate, endDate),
    ])

    const currencyBase = (currencyCode: string) =>
      currencyAllTimeBase?.get(currencyCode) ??
      currencyAllTimeBase?.get(currencyCode.toLowerCase()) ??
      0

    const bucketsByCurrency = new Map<
      string,
      Map<
        string,
        {
          periodStart: Date
          periodRevenueCents: number
          transactions?: number
        }
      >
    >()

    const transactions = revenue.transactionsPerDay ?? {}
    for (const [dayStr, entry] of Object.entries(transactions)) {
      const periodStart = parseDay(dayStr)
      if (!periodStart) continue
      if (thresholdDay && periodStart < thresholdDay) continue

      const amountCents = Math.round(toNumber(entry?.amount) ?? 0)
      if (!Number.isFinite(amountCents) || amountCents < 0) continue
      const currencyCode =
        typeof entry?.currency === "string" && entry.currency.trim().length >= 3
          ? entry.currency.trim().toUpperCase()
          : defaultCurrency

      const dayKey = periodStart.toISOString().slice(0, 10)
      const currencyMap = bucketsByCurrency.get(currencyCode) || new Map()
      const count = toNumber(entry?.count)
      const bucket = currencyMap.get(dayKey) || {
        periodStart,
        periodRevenueCents: 0,
        transactions: 0,
      }
      bucket.periodRevenueCents += amountCents
      if (Number.isFinite(count ?? NaN)) {
        bucket.transactions = (bucket.transactions ?? 0) + Number(count)
      }
      currencyMap.set(dayKey, bucket)
      bucketsByCurrency.set(currencyCode, currencyMap)
    }

    if (bucketsByCurrency.size === 0 && thresholdDay) {
      return { snapshots: [] }
    }

    if (bucketsByCurrency.size === 0) {
      const fallback =
        !thresholdDay && currencyBase(defaultCurrency) === 0
          ? Math.round(toNumber(revenue.totalRevenue) ?? 0)
          : 0
      const periodStart = thresholdDay ?? startOfUtcDay(new Date())
      bucketsByCurrency.set(
        defaultCurrency,
        new Map([
          [
            periodStart.toISOString().slice(0, 10),
            {
              periodStart,
              periodRevenueCents: Math.max(fallback, 0),
              transactions: toNumber(revenue.totalTransactions) ?? undefined,
            },
          ],
        ]),
      )
    }

    const snapshots: RevenueSnapshotInput[] = []

    for (const [currencyCode, dayMap] of bucketsByCurrency.entries()) {
      const ordered = Array.from(dayMap.values()).sort((a, b) =>
        a.periodStart.getTime() > b.periodStart.getTime() ? 1 : -1,
      )
      let runningAllTime = currencyBase(currencyCode)

      for (const bucket of ordered) {
        runningAllTime += bucket.periodRevenueCents
        const snapshotData: Prisma.InputJsonValue = {
          source: "abacatepay",
          merchantName: merchantInfo?.name ?? null,
          merchantWebsite: merchantInfo?.website ?? null,
          merchantCreatedAt: merchantInfo?.createdAt ?? null,
          totalTransactions: revenue.totalTransactions ?? null,
          dayTransactions: bucket.transactions ?? null,
        }

        snapshots.push({
          currencyCode,
          periodStart: bucket.periodStart,
          periodRevenueCents: bucket.periodRevenueCents,
          allTimeRevenueCents: runningAllTime,
          data: snapshotData,
        })
      }
    }

    if (snapshots.length === 0) {
      const today = startOfUtcDay(new Date())
      const snapshotData: Prisma.InputJsonValue = {
        source: "abacatepay",
        merchantName: merchantInfo?.name ?? null,
        merchantWebsite: merchantInfo?.website ?? null,
        merchantCreatedAt: merchantInfo?.createdAt ?? null,
        totalTransactions: revenue.totalTransactions ?? null,
      }
      snapshots.push({
        currencyCode: defaultCurrency,
        periodStart: today,
        periodRevenueCents: 0,
        allTimeRevenueCents: currencyBase(defaultCurrency),
        data: snapshotData,
      })
    }

    return { snapshots }
  },
}

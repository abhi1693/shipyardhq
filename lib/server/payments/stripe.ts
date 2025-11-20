import { IS_PROD } from "@/lib/constants"
import { PaymentConnectorProvider } from "@/lib/vendor/prisma/client"

import type {
  PaymentConnectorConfig,
  PaymentProviderDefinition,
  RevenueSnapshotInput,
} from "./types"

const STRIPE_API_BASE = "https://api.stripe.com/v1"
const STRIPE_VERSION = "2024-06-20"

type StripeListResponse<T> = {
  data?: T[]
  has_more?: boolean
}

type StripeCharge = {
  id: string
  amount?: number
  amount_captured?: number
  amount_refunded?: number
  currency?: string
  created?: number
  status?: string
  paid?: boolean
}

type StripeSubscription = {
  id: string
  currency?: string
  status?: string
  items?: {
    data?: Array<{
      quantity?: number
      price?: {
        unit_amount?: number | null
        currency?: string | null
        recurring?: {
          interval?: string | null
          interval_count?: number | null
        } | null
      } | null
    }>
  }
}

type StripeListParams = Record<string, string | number | boolean | undefined>

function encodeBasicAuth(apiKey: string) {
  return Buffer.from(`${apiKey}:`, "utf8").toString("base64")
}

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  )
}

function normalizeIntervalToMonthly(
  amountCents: number,
  interval: string | undefined | null,
  intervalCount: number | undefined | null,
): number {
  const safeCount = intervalCount && intervalCount > 0 ? intervalCount : 1
  switch ((interval || "").toLowerCase()) {
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

function ensureStripeKeyMatchesEnvironment(apiKey: string): "live" | "test" {
  const trimmed = apiKey.trim()
  const expectedPrefix = IS_PROD ? "rk_live_" : "rk_test_"
  if (!trimmed.startsWith(expectedPrefix)) {
    throw new Error(
      IS_PROD
        ? "Production requires a Stripe restricted key starting with rk_live_."
        : "Non-production requires a Stripe restricted key starting with rk_test_.",
    )
  }

  return IS_PROD ? "live" : "test"
}

async function stripeRequest<T>({
  apiKey,
  path,
  params,
  accountId,
}: {
  apiKey: string
  path: string
  params?: StripeListParams
  accountId?: string
}): Promise<T> {
  const url = new URL(`${STRIPE_API_BASE}${path}`)

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined) return
      url.searchParams.append(key, String(value))
    })
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Basic ${encodeBasicAuth(apiKey)}`,
      "Stripe-Version": STRIPE_VERSION,
      ...(accountId ? { "Stripe-Account": accountId } : {}),
    },
  })

  if (!response.ok) {
    const text = await response.text().catch(() => "")
    throw new Error(
      `Stripe request failed (${response.status} ${response.statusText}): ${text.slice(0, 300)}`,
    )
  }

  return (await response.json()) as T
}

async function* iterateStripeList<T>({
  apiKey,
  path,
  params,
  accountId,
}: {
  apiKey: string
  path: string
  params?: StripeListParams
  accountId?: string
}): AsyncGenerator<T, void, unknown> {
  let startingAfter: string | undefined
  while (true) {
    const pageParams: StripeListParams = {
      limit: 100,
      ...params,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    }
    const page = await stripeRequest<StripeListResponse<T>>({
      apiKey,
      path,
      params: pageParams,
      accountId,
    })
    const data = Array.isArray(page.data) ? page.data : []
    for (const item of data) {
      yield item
    }
    if (!page.has_more || data.length === 0) break
    startingAfter = (data[data.length - 1] as any)?.id
    if (!startingAfter) break
  }
}

async function collectCharges({
  apiKey,
  accountId,
  createdGte,
}: {
  apiKey: string
  accountId?: string
  createdGte?: number
}) {
  type DailyBucket = {
    periodRevenueCents: number
    charges: number
    day: string
    periodStart: Date
  }

  const byCurrency = new Map<string, Map<string, DailyBucket>>()

  for await (const charge of iterateStripeList<StripeCharge>({
    apiKey,
    path: "/charges",
    accountId,
    params: {
      ...(createdGte ? { "created[gte]": createdGte } : {}),
    },
  })) {
    const status = (charge.status || "").toLowerCase()
    const paid = !!charge.paid
    if (status !== "succeeded" && status !== "paid" && !paid) continue

    const currency =
      typeof charge.currency === "string"
        ? charge.currency.toUpperCase()
        : undefined
    const created =
      typeof charge.created === "number"
        ? new Date(charge.created * 1000)
        : null
    if (!currency || !created) continue

    const amountCaptured =
      typeof charge.amount_captured === "number"
        ? charge.amount_captured
        : typeof charge.amount === "number"
          ? charge.amount
          : 0
    const amountRefunded =
      typeof charge.amount_refunded === "number" ? charge.amount_refunded : 0
    const netAmount = Math.round(amountCaptured - amountRefunded)
    if (!Number.isFinite(netAmount) || netAmount <= 0) continue

    const day = startOfUtcDay(created)
    const dayKey = day.toISOString().slice(0, 10)
    const currencyMap =
      byCurrency.get(currency) || new Map<string, DailyBucket>()
    const bucket =
      currencyMap.get(dayKey) ||
      ({
        periodRevenueCents: 0,
        charges: 0,
        day: dayKey,
        periodStart: day,
      } satisfies DailyBucket)

    bucket.periodRevenueCents += netAmount
    bucket.charges += 1
    currencyMap.set(dayKey, bucket)
    byCurrency.set(currency, currencyMap)
  }

  return byCurrency
}

async function collectSubscriptions({
  apiKey,
  accountId,
}: {
  apiKey: string
  accountId?: string
}) {
  const mrrByCurrency = new Map<string, number>()

  for await (const sub of iterateStripeList<StripeSubscription>({
    apiKey,
    path: "/subscriptions",
    accountId,
    params: {
      status: "active",
      "expand[]": "data.items.data.price",
    },
  })) {
    if (!sub || (sub.status && sub.status !== "active")) continue
    const items = sub.items?.data ?? []
    for (const item of items) {
      const price = item?.price
      if (!price) continue
      const currency =
        typeof price.currency === "string"
          ? price.currency.toUpperCase()
          : typeof sub.currency === "string"
            ? sub.currency.toUpperCase()
            : undefined
      if (!currency) continue

      const amount = Number(price.unit_amount ?? 0) * (item.quantity ?? 1)
      if (!Number.isFinite(amount) || amount <= 0) continue
      const interval = price.recurring?.interval ?? "month"
      const intervalCount = price.recurring?.interval_count ?? 1
      const monthly = normalizeIntervalToMonthly(
        Math.round(amount),
        interval,
        intervalCount,
      )

      mrrByCurrency.set(currency, (mrrByCurrency.get(currency) || 0) + monthly)
    }
  }

  return mrrByCurrency
}

function buildSnapshots({
  chargesByCurrency,
  mrrByCurrency,
  mode,
  accountIds,
  includePlatform,
  allTimeBaseByCurrency,
}: {
  chargesByCurrency: Map<
    string,
    Map<
      string,
      { periodRevenueCents: number; charges: number; periodStart: Date }
    >
  >
  mrrByCurrency: Map<string, number>
  mode: "live" | "test"
  accountIds: string[]
  includePlatform: boolean
  allTimeBaseByCurrency?: Map<string, number>
}): RevenueSnapshotInput[] {
  const snapshots: RevenueSnapshotInput[] = []

  const currencies = new Set<string>([
    ...chargesByCurrency.keys(),
    ...mrrByCurrency.keys(),
    ...(allTimeBaseByCurrency ? Array.from(allTimeBaseByCurrency.keys()) : []),
  ])

  for (const currency of currencies) {
    const buckets = chargesByCurrency.get(currency) || new Map()
    const ordered = Array.from(buckets.values()).sort((a, b) =>
      a.periodStart.getTime() > b.periodStart.getTime() ? 1 : -1,
    )
    const baseAllTime =
      allTimeBaseByCurrency?.get(currency.toUpperCase()) ??
      allTimeBaseByCurrency?.get(currency) ??
      0
    let runningAllTime = baseAllTime
    const latestBucket = ordered[ordered.length - 1]
    const mrr = mrrByCurrency.get(currency) ?? null

    if (ordered.length === 0) {
      const today = startOfUtcDay(new Date())
      snapshots.push({
        currencyCode: currency,
        periodStart: today,
        periodRevenueCents: 0,
        allTimeRevenueCents: runningAllTime,
        mrrCents: mrr,
        data: {
          source: "stripe",
          mode,
          accountIds,
          includesPlatform: includePlatform,
          charges: 0,
        },
      })
      continue
    }

    for (const bucket of ordered) {
      runningAllTime += bucket.periodRevenueCents
      snapshots.push({
        currencyCode: currency,
        periodStart: bucket.periodStart,
        periodRevenueCents: bucket.periodRevenueCents,
        allTimeRevenueCents: runningAllTime,
        mrrCents: bucket === latestBucket ? mrr : null,
        data: {
          source: "stripe",
          mode,
          accountIds,
          includesPlatform: includePlatform,
          charges: bucket.charges,
        },
      })
    }
  }

  if (snapshots.length === 0) {
    const today = startOfUtcDay(new Date())
    const fallbackBase =
      allTimeBaseByCurrency?.get("USD") ??
      allTimeBaseByCurrency?.get("usd") ??
      0
    snapshots.push({
      currencyCode: "USD",
      periodStart: today,
      periodRevenueCents: 0,
      allTimeRevenueCents: fallbackBase,
      mrrCents: mrrByCurrency.get("USD") ?? null,
      data: {
        source: "stripe",
        mode,
        accountIds,
        includesPlatform: includePlatform,
        charges: 0,
      },
    })
  }

  return snapshots
}

async function validateStripeAccess({
  apiKey,
  accountId,
}: {
  apiKey: string
  accountId?: string
}) {
  // A lightweight probe that requires charges read permission.
  await stripeRequest<StripeListResponse<StripeCharge>>({
    apiKey,
    accountId,
    path: "/charges",
    params: { limit: 1 },
  })
}

export const stripeProvider: PaymentProviderDefinition = {
  provider: PaymentConnectorProvider.stripe,
  async validateApiKey({ apiKey, config }) {
    ensureStripeKeyMatchesEnvironment(apiKey)
    const accountId = (config as PaymentConnectorConfig | undefined)?.accountId
    await validateStripeAccess({ apiKey, accountId })
    // Return void; success means validation passed for the expected environment.
    return
  },
  async sync({
    connector,
    apiKey,
    since,
    currencyAllTimeBase,
    latestPeriodStartByCurrency,
  }) {
    ensureStripeKeyMatchesEnvironment(apiKey)
    const config = (connector.config ?? undefined) as
      | PaymentConnectorConfig
      | undefined
    const primaryAccountId =
      typeof config?.accountId === "string" && config.accountId.trim().length
        ? config.accountId.trim()
        : undefined
    const connectedAccountIds = Array.isArray(config?.connectedAccountIds)
      ? config.connectedAccountIds
          .filter((id) => typeof id === "string")
          .map((id) => id.trim())
          .filter(Boolean)
      : []
    const includePlatformOnly =
      !primaryAccountId && connectedAccountIds.length === 0
    const targetAccounts: (string | undefined)[] = [
      ...(includePlatformOnly ? [undefined] : []), // platform account only when no explicit accounts set
      primaryAccountId,
      ...connectedAccountIds,
    ].filter((value, index, self) => self.indexOf(value) === index)
    const includesPlatform = targetAccounts.some((value) => value === undefined)
    const usedAccountIds = new Set<string>()
    const mode: "live" | "test" = IS_PROD ? "live" : "test"
    const allTimeBaseByCurrency = new Map<string, number>()
    const latestStartByCurrency = new Map<string, Date>()
    if (currencyAllTimeBase) {
      for (const [currency, value] of currencyAllTimeBase.entries()) {
        allTimeBaseByCurrency.set(currency.toUpperCase(), value)
      }
    }
    if (latestPeriodStartByCurrency) {
      for (const [currency, date] of latestPeriodStartByCurrency.entries()) {
        if (currency) {
          const normalized = startOfUtcDay(new Date(date))
          latestStartByCurrency.set(currency.toUpperCase(), normalized)
        }
      }
    }

    const createdSince = since ? startOfUtcDay(new Date(since)) : null
    const createdGte = createdSince
      ? Math.floor(createdSince.getTime() / 1000)
      : undefined
    console.info("[payments.stripe] sync start", {
      connectorId: connector.id,
      productId: connector.productId,
      mode,
      createdSince,
      targetAccounts: targetAccounts.map((id) => id || "platform"),
      latestPeriodStartByCurrency: Array.from(
        latestStartByCurrency.entries(),
      ).map(([currency, date]) => ({
        currency,
        periodStart: date.toISOString(),
      })),
    })

    const chargesByCurrency = new Map<
      string,
      Map<
        string,
        { periodRevenueCents: number; charges: number; periodStart: Date }
      >
    >()
    const mrrByCurrency = new Map<string, number>()

    for (const accountId of targetAccounts) {
      try {
        const charges = await collectCharges({ apiKey, accountId, createdGte })
        let totalRevenue = 0
        let bucketCount = 0
        for (const [currency, buckets] of charges.entries()) {
          const existing = chargesByCurrency.get(currency) || new Map()
          for (const [dayKey, bucket] of buckets.entries()) {
            const prev = existing.get(dayKey)
            existing.set(dayKey, {
              periodRevenueCents:
                (prev?.periodRevenueCents ?? 0) + bucket.periodRevenueCents,
              charges: (prev?.charges ?? 0) + bucket.charges,
              periodStart: bucket.periodStart,
            })
            totalRevenue += bucket.periodRevenueCents
            bucketCount += 1
          }
          chargesByCurrency.set(currency, existing)
        }
        console.info("[payments.stripe] collected charges", {
          connectorId: connector.id,
          accountId: accountId || "platform",
          currencies: charges.size,
          dayBuckets: bucketCount,
          revenueCents: totalRevenue,
        })
        if (accountId) usedAccountIds.add(accountId)
      } catch (error) {
        console.warn(
          "[payments.stripe] failed to collect charges for account",
          accountId || "platform",
          error,
        )
      }
    }

    for (const [currency, buckets] of chargesByCurrency.entries()) {
      const threshold = latestStartByCurrency.get(currency)
      if (threshold) {
        let removed = 0
        for (const [dayKey, bucket] of Array.from(buckets.entries())) {
          if (bucket.periodStart < threshold) {
            buckets.delete(dayKey)
            removed += 1
          }
        }
        if (removed > 0) {
          console.info("[payments.stripe] pruned historical buckets", {
            connectorId: connector.id,
            currency,
            removed,
            threshold: threshold.toISOString(),
          })
        }
      }
    }

    for (const accountId of targetAccounts) {
      try {
        const mrrMap = await collectSubscriptions({ apiKey, accountId }).catch(
          () => new Map<string, number>(),
        )
        for (const [currency, mrr] of mrrMap.entries()) {
          mrrByCurrency.set(currency, (mrrByCurrency.get(currency) || 0) + mrr)
        }
        if (accountId) usedAccountIds.add(accountId)
      } catch (error) {
        console.warn(
          "[payments.stripe] failed to collect subscriptions for account",
          accountId || "platform",
          error,
        )
      }
    }

    const snapshots = buildSnapshots({
      chargesByCurrency,
      mrrByCurrency,
      mode,
      accountIds: Array.from(usedAccountIds),
      includePlatform: includesPlatform,
      allTimeBaseByCurrency,
    })
    console.info("[payments.stripe] sync complete", {
      connectorId: connector.id,
      productId: connector.productId,
      mode,
      currencies: snapshots.reduce(
        (set, snap) => set.add(snap.currencyCode),
        new Set<string>(),
      ).size,
      chargeDayBuckets: Array.from(chargesByCurrency.values()).reduce(
        (sum, map) => sum + map.size,
        0,
      ),
      mrrCurrencies: mrrByCurrency.size,
      snapshots: snapshots.length,
      accountIds: Array.from(usedAccountIds),
      includesPlatform,
    })

    return { snapshots }
  },
}

import DodoPayments from "dodopayments"

import {
  ProviderSyncResult,
  type PaymentConnectorConfig,
  type RevenueSnapshotInput,
} from "./types"

type CurrencyAggregate = {
  daily: Map<
    string,
    {
      amountCents: number
      charges: number
    }
  >
  allTime: number
}

function toDayKey(date: Date): string {
  const year = date.getUTCFullYear()
  const month = (date.getUTCMonth() + 1).toString().padStart(2, "0")
  const day = date.getUTCDate().toString().padStart(2, "0")
  return `${year}-${month}-${day}`
}

function startOfDayFromKey(key: string): Date {
  const [year, month, day] = key.split("-").map((part) => Number(part))
  return new Date(Date.UTC(year, (month || 1) - 1, day || 1, 0, 0, 0, 0))
}

function normalizePaymentFrequencyToMonthly(
  amount: number,
  interval: "Day" | "Week" | "Month" | "Year",
  count: number | null | undefined,
): number {
  const safeCount = count && count > 0 ? count : 1
  let periodsPerYear = 12
  switch (interval) {
    case "Day":
      periodsPerYear = 365 / safeCount
      break
    case "Week":
      periodsPerYear = 52 / safeCount
      break
    case "Year":
      periodsPerYear = 1 / safeCount
      break
    case "Month":
    default:
      periodsPerYear = 12 / safeCount
  }

  const monthly = (amount * periodsPerYear) / 12
  return Math.round(monthly)
}

function resolveEnvironment(
  config?: PaymentConnectorConfig,
): "live_mode" | "test_mode" {
  const env =
    config?.environment ||
    (process.env.DODO_ENV as "live_mode" | "test_mode" | undefined) ||
    "live_mode"
  return env === "test_mode" ? "test_mode" : "live_mode"
}

export async function syncDodoConnector({
  apiKey,
  config,
}: {
  apiKey: string
  config?: PaymentConnectorConfig
}): Promise<ProviderSyncResult> {
  const environment = resolveEnvironment(config)
  const client = new DodoPayments({
    bearerToken: apiKey,
    environment,
  })

  const revenueByCurrency = new Map<string, CurrencyAggregate>()
  for await (const payment of client.payments.list({
    status: "succeeded",
    page_size: 100,
  } as any)) {
    const currency = (payment as any)?.currency as string | undefined
    const amount = Number((payment as any)?.total_amount ?? 0)
    const createdAt = (payment as any)?.created_at
    if (!currency || !Number.isFinite(amount) || amount <= 0 || !createdAt)
      continue

    const dayKey = toDayKey(new Date(createdAt))
    const aggregate =
      revenueByCurrency.get(currency) ||
      ({
        daily: new Map(),
        allTime: 0,
      } satisfies CurrencyAggregate)

    const entry = aggregate.daily.get(dayKey) || { amountCents: 0, charges: 0 }
    aggregate.daily.set(dayKey, {
      amountCents: entry.amountCents + Math.round(amount),
      charges: entry.charges + 1,
    })
    aggregate.allTime += Math.round(amount)
    revenueByCurrency.set(currency, aggregate)
  }

  const mrrByCurrency = new Map<string, number>()
  for await (const subscription of client.subscriptions.list({
    status: "active",
    page_size: 100,
  } as any)) {
    const currency = (subscription as any)?.currency as string | undefined
    const amount = Number((subscription as any)?.recurring_pre_tax_amount ?? 0)
    const interval = (subscription as any)?.payment_frequency_interval as
      | "Day"
      | "Week"
      | "Month"
      | "Year"
      | undefined
    const count = Number((subscription as any)?.payment_frequency_count ?? 1)
    if (!currency || !interval || !Number.isFinite(amount) || amount <= 0)
      continue

    const monthlyAmount = normalizePaymentFrequencyToMonthly(
      amount,
      interval,
      count,
    )
    mrrByCurrency.set(
      currency,
      (mrrByCurrency.get(currency) || 0) + monthlyAmount,
    )
  }

  const allCurrencies = new Set<string>([
    ...revenueByCurrency.keys(),
    ...mrrByCurrency.keys(),
  ])

  const snapshots: RevenueSnapshotInput[] = []
  for (const currency of allCurrencies) {
    const aggregates = revenueByCurrency.get(currency) || {
      daily: new Map<string, { amountCents: number; charges: number }>(),
      allTime: 0,
    }

    const dayKeys = Array.from(aggregates.daily.keys()).sort()
    if (dayKeys.length === 0) {
      const now = new Date()
      snapshots.push({
        currencyCode: currency,
        periodStart: startOfDayFromKey(toDayKey(now)),
        periodRevenueCents: 0,
        allTimeRevenueCents: aggregates.allTime,
        data: { provider: "dodo", environment, charges: 0 },
      })
      continue
    }

    let runningTotal = 0
    for (const dayKey of dayKeys) {
      const entry = aggregates.daily.get(dayKey) || {
        amountCents: 0,
        charges: 0,
      }
      const periodRevenueCents = entry.amountCents
      runningTotal += periodRevenueCents
      snapshots.push({
        currencyCode: currency,
        periodStart: startOfDayFromKey(dayKey),
        periodRevenueCents,
        allTimeRevenueCents: runningTotal,
        data: { provider: "dodo", environment, charges: entry.charges },
      })
    }
  }

  return { snapshots }
}

import DodoPayments, { AuthenticationError } from "dodopayments"

import { PaymentConnectorProvider } from "@/lib/vendor/prisma/client"

import {
  ProviderSyncResult,
  type PaymentConnectorConfig,
  type PaymentProviderDefinition,
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

function resolveEnvironment(
  config?: PaymentConnectorConfig,
): "live_mode" | "test_mode" {
  const env =
    config?.environment ||
    (process.env.DODO_ENV as "live_mode" | "test_mode" | undefined) ||
    "live_mode"
  return env === "test_mode" ? "test_mode" : "live_mode"
}

export async function validateDodoApiKey({
  apiKey,
  config,
}: {
  apiKey: string
  config?: PaymentConnectorConfig
}) {
  const environment = resolveEnvironment(config)

  const client = new DodoPayments({
    bearerToken: apiKey.trim(),
    environment,
  })

  try {
    // Basic authentication check; will throw for invalid keys or env mismatch
    await client.brands.list({ page_size: 1 } as any)

    const brandId = config?.brandId?.trim()
    if (brandId) {
      try {
        await client.brands.retrieve(brandId as any)
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown brand lookup error"
        throw new Error(message)
      }
    }
  } catch (error) {
    if (error instanceof AuthenticationError) {
      throw new Error(
        `Dodo authentication failed for environment '${environment}'. Please use a key provisioned for this environment.`,
      )
    }
    throw new Error(
      error instanceof Error
        ? `Failed to validate Dodo API key: ${error.message}`
        : "Failed to validate Dodo API key",
    )
  }
}

export async function syncDodoConnector({
  apiKey,
  config,
}: {
  apiKey: string
  config?: PaymentConnectorConfig
}): Promise<ProviderSyncResult> {
  const environment = resolveEnvironment(config)
  const brandId = config?.brandId?.trim()
  const client = new DodoPayments({
    bearerToken: apiKey,
    environment,
  })

  const revenueByCurrency = new Map<string, CurrencyAggregate>()
  for await (const payment of client.payments.list({
    status: "succeeded",
    page_size: 100,
    brand_id: brandId
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

  const allCurrencies = new Set<string>([...revenueByCurrency.keys()])

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
        data: {
          provider: "dodo",
          environment,
          charges: 0,
          ...(brandId ? { brandId } : {}),
        },
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
        data: {
          provider: "dodo",
          environment,
          charges: entry.charges,
          ...(brandId ? { brandId } : {}),
        },
      })
    }
  }

  return { snapshots }
}

export const dodoProvider: PaymentProviderDefinition = {
  provider: PaymentConnectorProvider.dodo,
  validateApiKey: validateDodoApiKey,
  sync: async ({ connector, apiKey }) =>
    syncDodoConnector({
      apiKey,
      config: (connector.config ?? undefined) as
        | PaymentConnectorConfig
        | undefined,
    }),
}

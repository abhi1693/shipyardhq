"use server"

import prisma from "@/lib/prisma"
import {
  Prisma,
  PaymentConnectorProvider,
  PaymentConnectorStatus,
  PaymentCredentialStatus,
  type PaymentConnector,
  type PaymentConnectorCredential,
} from "@/lib/vendor/prisma/client"
import { sendPaymentConnectorSyncErrorEmail } from "@/lib/server/email/paymentConnectorSyncError"
import { awardRewardsSafely, getProductOwnerId } from "@/lib/server/rewards/helpers"
import {
  buildConnectorKeyHint,
  decryptConnectorSecret,
  encryptConnectorSecret,
} from "./connectorSecrets"
import { getProviderDefinition } from "./providers"
import { getUsdConversionRates } from "./currency"
import { type PaymentConnectorConfig, type RevenueSnapshotInput } from "./types"
import { buildRevenueSummary, cacheRevenueSummary } from "./revenue"

const PAYMENT_CONNECTOR_REWARD_RULE_KEY = "rewards.payment.connector"

async function sendConnectorErrorEmail(params: {
  productId: string
  errorMessage: string
}) {
  try {
    await sendPaymentConnectorSyncErrorEmail(params)
  } catch (notifyError) {
    console.error("[payments.connector.error] notification failed", {
      productId: params.productId,
      error:
        notifyError instanceof Error ? notifyError.message : String(notifyError),
    })
  }
}

async function notifySyncErrorOnce(
  connector: PaymentConnector,
  message: string,
) {
  const alreadyNotified =
    connector.status === PaymentConnectorStatus.error &&
    (connector.lastSyncError ?? undefined) === message
  if (alreadyNotified) return

  await sendConnectorErrorEmail({
    productId: connector.productId,
    errorMessage: message,
  })
}

async function markConnectorSyncError(
  connector: PaymentConnector,
  message: string,
): Promise<{ error: string }> {
  await prisma.paymentConnector.update({
    where: { id: connector.id },
    data: { status: PaymentConnectorStatus.error, lastSyncError: message },
  })

  await notifySyncErrorOnce(connector, message)

  return { error: message }
}

export async function validateConnectorApiKey({
  productId,
  provider,
  apiKey,
  config,
}: {
  productId?: string
  provider: PaymentConnectorProvider
  apiKey: string
  config?: PaymentConnectorConfig
}) {
  const providerDefinition = getProviderDefinition(provider)
  if (!providerDefinition?.validateApiKey) return

  try {
    await providerDefinition.validateApiKey({ apiKey, config })
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Payment connector validation failed"
    if (productId) {
      await sendConnectorErrorEmail({
        productId,
        errorMessage: message,
      })
    }
    throw error
  }
}

async function getActiveCredential(
  connectorId: string,
): Promise<PaymentConnectorCredential | null> {
  const connector = await prisma.paymentConnector.findUnique({
    where: { id: connectorId },
    select: {
      credentials: {
        where: { status: PaymentCredentialStatus.active },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  })
  return connector?.credentials?.[0] || null
}

async function getSyncContext(connectorId: string) {
  const currencyAllTimeBase = new Map<string, number>()
  const latestPeriodStartByCurrency = new Map<string, Date>()

  type LatestByCurrency = {
    currencyCode: string | null
    _max: { periodStart: Date | null }
  }

  const latestByCurrency: LatestByCurrency[] =
    await prisma.paymentRevenueSnapshot.groupBy({
      by: ["currencyCode"],
      where: { connectorId },
      _max: { periodStart: true },
    })

  const since =
    latestByCurrency.reduce<Date | null>(
      (earliest: Date | null, entry: LatestByCurrency) => {
        const periodStart = entry._max.periodStart
        if (!periodStart) return earliest
        if (!earliest || periodStart < earliest) return periodStart
        return earliest
      },
      null,
    ) ?? null

  const lookups = latestByCurrency
    .map((entry) => ({
      currencyCode: entry.currencyCode,
      periodStart: entry._max.periodStart,
    }))
    .filter(
      (entry): entry is { currencyCode: string; periodStart: Date } =>
        Boolean(entry.currencyCode) && Boolean(entry.periodStart),
    )

  if (lookups.length > 0) {
    const snapshots = await prisma.paymentRevenueSnapshot.findMany({
      where: {
        connectorId,
        OR: lookups,
      },
      select: {
        currencyCode: true,
        periodStart: true,
        periodRevenueCents: true,
        allTimeRevenueCents: true,
      },
    })

    for (const snapshot of snapshots) {
      const currency = snapshot.currencyCode?.toUpperCase()
      if (!currency) continue
      const baseBeforeLatest =
        snapshot.allTimeRevenueCents - snapshot.periodRevenueCents
      currencyAllTimeBase.set(currency, Math.max(baseBeforeLatest, 0))
      latestPeriodStartByCurrency.set(currency, snapshot.periodStart)
    }
  }

  return { since, currencyAllTimeBase, latestPeriodStartByCurrency }
}

async function applySnapshots(
  connectorId: string,
  snapshots: RevenueSnapshotInput[],
): Promise<void> {
  if (snapshots.length === 0) return

  // Batch in chunks to avoid long-running transactions.
  const chunkSize = 10
  for (let i = 0; i < snapshots.length; i += chunkSize) {
    const chunk = snapshots.slice(i, i + chunkSize)
    await Promise.all(
      chunk.map((snapshot) =>
        prisma.paymentRevenueSnapshot.upsert({
          where: {
            connectorId_periodStart_currencyCode: {
              connectorId,
              periodStart: snapshot.periodStart,
              currencyCode: snapshot.currencyCode,
            },
          },
          create: {
            connectorId,
            currencyCode: snapshot.currencyCode,
            periodStart: snapshot.periodStart,
            periodRevenueCents: snapshot.periodRevenueCents,
            allTimeRevenueCents: snapshot.allTimeRevenueCents,
            data: snapshot.data,
          },
          update: {
            periodRevenueCents: snapshot.periodRevenueCents,
            allTimeRevenueCents: snapshot.allTimeRevenueCents,
            data: snapshot.data,
          },
        }),
      ),
    )
  }
}

function selectPrimarySnapshot(
  snapshots: RevenueSnapshotInput[],
): RevenueSnapshotInput | undefined {
  if (snapshots.length === 0) return undefined
  const latestByCurrency = new Map<string, RevenueSnapshotInput>()
  for (const snap of snapshots) {
    const existing = latestByCurrency.get(snap.currencyCode)
    if (!existing || snap.periodStart > existing.periodStart) {
      latestByCurrency.set(snap.currencyCode, snap)
    }
  }

  return Array.from(latestByCurrency.values()).sort(
    (a, b) => b.allTimeRevenueCents - a.allTimeRevenueCents,
  )[0]
}

export async function upsertPaymentConnector({
  productId,
  provider,
  apiKey,
  config,
}: {
  productId: string
  provider: PaymentConnectorProvider
  apiKey: string
  config?: PaymentConnectorConfig
}) {
  const encryptedKey = encryptConnectorSecret(apiKey)
  const keyHint = buildConnectorKeyHint(apiKey)
  const normalizedConfig = config ? (config as object) : undefined

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const connector = await tx.paymentConnector.upsert({
      where: { productId },
      update: {
        status: PaymentConnectorStatus.active,
        config: normalizedConfig ?? undefined,
        provider,
      },
      create: {
        productId,
        provider,
        status: PaymentConnectorStatus.active,
        config: normalizedConfig ?? undefined,
      },
    })

    await tx.paymentConnectorCredential.updateMany({
      where: {
        connectorId: connector.id,
        status: PaymentCredentialStatus.active,
      },
      data: { status: PaymentCredentialStatus.revoked },
    })

    const credential = await tx.paymentConnectorCredential.create({
      data: {
        connectorId: connector.id,
        encryptedKey,
        keyHint,
        status: PaymentCredentialStatus.active,
      },
    })

    return { connector, credential }
  })
}

export async function syncPaymentConnector(connectorId: string) {
  const connector = await prisma.paymentConnector.findUnique({
    where: { id: connectorId },
  })
  if (!connector) {
    return { error: "Payment connector not found" }
  }

  const credential = await getActiveCredential(connector.id)
  if (!credential) {
    return markConnectorSyncError(
      connector,
      "No active credential configured",
    )
  }

  const providerDefinition = getProviderDefinition(connector.provider)
  if (!providerDefinition?.sync) {
    return markConnectorSyncError(
      connector,
      `Provider ${connector.provider} is not supported yet`,
    )
  }

  let apiKey: string
  try {
    apiKey = decryptConnectorSecret(credential.encryptedKey)
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to decrypt connector secret"
    return markConnectorSyncError(connector, message)
  }

  try {
    const { since, currencyAllTimeBase, latestPeriodStartByCurrency } =
      await getSyncContext(connector.id)
    console.info("[payments.connector.sync] context", {
      connectorId: connector.id,
      since,
      currencies: Array.from(currencyAllTimeBase.keys()),
    })
    const result = await providerDefinition.sync({
      connector,
      apiKey,
      since,
      currencyAllTimeBase,
      latestPeriodStartByCurrency,
    })
    await applySnapshots(connector.id, result.snapshots)

    const fullHistory =
      (await prisma.paymentRevenueSnapshot.findMany({
        where: { connectorId: connector.id },
        orderBy: { periodStart: "asc" },
      })) ?? []
    const historyForSummary =
      fullHistory.length > 0 ? fullHistory : result.snapshots

    const requiresConversion = historyForSummary.some(
      (snapshot: { currencyCode: any }) =>
        (snapshot.currencyCode || "USD").toUpperCase() !== "USD",
    )
    const rates = requiresConversion
      ? await getUsdConversionRates()
      : new Map<string, number>([["USD", 1]])
    const now = new Date()
    const summary = buildRevenueSummary({
      productId: connector.productId,
      connectorId: connector.id,
      provider: connector.provider,
      status: PaymentConnectorStatus.active,
      lastSyncedAt: now,
      history: historyForSummary,
      rates,
    })

    const primary = selectPrimarySnapshot(historyForSummary)
    const sortedByDate = [...historyForSummary].sort(
      (a, b) => a.periodStart.getTime() - b.periodStart.getTime(),
    )
    const latestSnapshot = sortedByDate[sortedByDate.length - 1]
    const latestPoint = summary?.points[summary.points.length - 1]

    await prisma.paymentConnector.update({
      where: { id: connector.id },
      data: {
        status: PaymentConnectorStatus.active,
        lastSyncError: null,
        lastSyncedAt: now,
        verifiedAt: primary ? now : connector.verifiedAt,
        // Store connector rollup in USD when possible so it stays aligned with
        // aggregated snapshots even when providers use other currencies.
        latestAllTimeRevenueCents:
          summary?.latestAllTimeRevenueCents ??
          primary?.allTimeRevenueCents ??
          latestSnapshot?.allTimeRevenueCents ??
          0,
        latestCurrencyCode:
          summary?.currencyCode ??
          primary?.currencyCode ??
          latestSnapshot?.currencyCode ??
          "USD",
        latestPeriodStart:
          latestPoint?.periodStart
            ? new Date(latestPoint.periodStart)
            : primary?.periodStart ?? latestSnapshot?.periodStart,
      },
    })
    if (summary) {
      await cacheRevenueSummary(summary)
    }

    const revenueForReward =
      summary?.latestAllTimeRevenueCents ??
      primary?.allTimeRevenueCents ??
      latestSnapshot?.allTimeRevenueCents ??
      0

    if (revenueForReward > 0) {
      const existingReward = await prisma.rewardTransaction.findFirst({
        where: {
          ruleKey: PAYMENT_CONNECTOR_REWARD_RULE_KEY,
          OR: [
            { productId: connector.productId },
            { targetId: connector.productId },
          ],
        },
        select: { id: true },
      })

      if (!existingReward) {
        const ownerId = await getProductOwnerId(connector.productId)
        if (ownerId) {
          await awardRewardsSafely(
            ownerId,
            PAYMENT_CONNECTOR_REWARD_RULE_KEY,
            {
              eventId: `payment-connector:${connector.productId}`,
              productId: connector.productId,
              sourceType: "payment.connector",
              sourceId: connector.id,
              targetType: "product",
              targetId: connector.productId,
              metadata: {
                connectorId: connector.id,
                provider: connector.provider,
                latestAllTimeRevenueCents: revenueForReward,
                currencyCode:
                  summary?.currencyCode ??
                  primary?.currencyCode ??
                  latestSnapshot?.currencyCode ??
                  connector.latestCurrencyCode ??
                  null,
              },
            },
            "award payment connector revenue reward",
          )
        }
      }
    }

    return {
      connectorId: connector.id,
      snapshots: result.snapshots,
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unexpected connector sync failure"
    console.error("[payments.connector.sync] failed", {
      connectorId: connector.id,
      provider: connector.provider,
      error: message,
    })
    return markConnectorSyncError(connector, message)
  }
}

export async function getConnectorRevenueHistory({
  productId,
  provider,
  limit,
}: {
  productId: string
  provider?: PaymentConnectorProvider
  limit?: number
}) {
  const where = { productId, ...(provider ? { provider } : {}) }
  const historyOrder = limit
    ? { periodStart: "desc" as const }
    : { periodStart: "asc" as const }

  const connector = await prisma.paymentConnector.findFirst({
    where,
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      provider: true,
      status: true,
      lastSyncedAt: true,
      lastSyncError: true,
      latestAllTimeRevenueCents: true,
      latestCurrencyCode: true,
      latestPeriodStart: true,
      revenueHistory: {
        orderBy: historyOrder,
        take: limit,
        select: {
          id: true,
          currencyCode: true,
          periodStart: true,
          periodRevenueCents: true,
          allTimeRevenueCents: true,
          data: true,
          createdAt: true,
        },
      },
    },
  })

  if (!connector) return null

  const sortedHistory = [...(connector.revenueHistory ?? [])].sort(
    (a, b) =>
      new Date(a.periodStart).getTime() - new Date(b.periodStart).getTime(),
  )

  return { ...connector, revenueHistory: sortedHistory }
}

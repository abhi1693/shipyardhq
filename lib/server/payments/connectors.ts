"use server"

import prisma from "@/lib/prisma"
import {
  PaymentConnectorProvider,
  PaymentConnectorStatus,
  PaymentCredentialStatus,
  type PaymentConnectorCredential,
} from "@/lib/vendor/prisma/client"
import {
  buildConnectorKeyHint,
  decryptConnectorSecret,
  encryptConnectorSecret,
} from "./connectorSecrets"
import { getProviderDefinition } from "./providers"
import { type PaymentConnectorConfig, type RevenueSnapshotInput } from "./types"

export async function validateConnectorApiKey({
  provider,
  apiKey,
  config,
  productName,
}: {
  provider: PaymentConnectorProvider
  apiKey: string
  config?: PaymentConnectorConfig
  productName?: string
}) {
  const providerDefinition = getProviderDefinition(provider)
  if (!providerDefinition?.validateApiKey) return

  await providerDefinition.validateApiKey({ apiKey, config, productName })
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

async function applySnapshots(
  connectorId: string,
  snapshots: RevenueSnapshotInput[],
): Promise<void> {
  if (snapshots.length === 0) return

  await prisma.$transaction(
    snapshots.map((snapshot) =>
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

  return prisma.$transaction(async (tx) => {
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
    await prisma.paymentConnector.update({
      where: { id: connector.id },
      data: {
        status: PaymentConnectorStatus.error,
        lastSyncError: "No active credential configured",
      },
    })
    return { error: "No active credential configured" }
  }

  const providerDefinition = getProviderDefinition(connector.provider)
  if (!providerDefinition?.sync) {
    await prisma.paymentConnector.update({
      where: { id: connector.id },
      data: {
        status: PaymentConnectorStatus.error,
        lastSyncError: `Provider ${connector.provider} is not supported yet`,
      },
    })
    return { error: `Provider ${connector.provider} is not supported yet` }
  }

  let apiKey: string
  try {
    apiKey = decryptConnectorSecret(credential.encryptedKey)
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to decrypt connector secret"
    await prisma.paymentConnector.update({
      where: { id: connector.id },
      data: { status: PaymentConnectorStatus.error, lastSyncError: message },
    })
    return { error: message }
  }

  try {
    const result = await providerDefinition.sync({ connector, apiKey })
    await applySnapshots(connector.id, result.snapshots)
    const primary = selectPrimarySnapshot(result.snapshots)
    const now = new Date()

    await prisma.paymentConnector.update({
      where: { id: connector.id },
      data: {
        status: PaymentConnectorStatus.active,
        lastSyncError: null,
        lastSyncedAt: now,
        verifiedAt: primary ? now : connector.verifiedAt,
        latestAllTimeRevenueCents: primary?.allTimeRevenueCents ?? 0,
        latestCurrencyCode: primary?.currencyCode,
        latestPeriodStart: primary?.periodStart,
      },
    })

    return {
      connectorId: connector.id,
      snapshots: result.snapshots,
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unexpected connector sync failure"
    await prisma.paymentConnector.update({
      where: { id: connector.id },
      data: { status: PaymentConnectorStatus.error, lastSyncError: message },
    })
    return { error: message }
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

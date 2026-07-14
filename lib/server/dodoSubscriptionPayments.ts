import { dodoClient } from "@/lib/dodo"
import prisma from "@/lib/prisma"
import { readMetadataString } from "@/lib/server/subscriptionMetadata"

function metadataRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

export async function isLatestSubscriptionPaymentSucceeded(
  subscriptionId: string,
  productId: string,
) {
  let latestCreatedAt = Number.NEGATIVE_INFINITY
  let latestStatus: string | null = null

  for await (const payment of dodoClient.payments.list({
    subscription_id: subscriptionId,
    product_id: productId,
    page_size: 100,
  })) {
    const createdAt = Date.parse(payment.created_at)
    if (!Number.isFinite(createdAt) || createdAt < latestCreatedAt) continue
    latestCreatedAt = createdAt
    latestStatus = payment.status?.toLowerCase() ?? null
  }

  return latestStatus === "succeeded"
}

export async function hasVerifiedDodoSubscriptionPlanChangePayment(args: {
  subscriptionId: string
  productId: string
  status?: string | null
  metadata?: unknown
}) {
  if (args.status?.toLowerCase() !== "active") return false

  const existingGrant = await prisma.productPlanGrant.findUnique({
    where: { externalSubscriptionId: args.subscriptionId },
    select: { plan: { select: { externalId: true } } },
  })
  let baselineExternalId = existingGrant?.plan.externalId
  if (!existingGrant) {
    const metadataPlanId = readMetadataString(
      metadataRecord(args.metadata),
      "planId",
      "plan_id",
    )
    if (metadataPlanId) {
      const metadataPlan = await prisma.plan.findUnique({
        where: { id: metadataPlanId },
        select: { externalId: true },
      })
      baselineExternalId = metadataPlan?.externalId
    }
  }

  if (!baselineExternalId || baselineExternalId === args.productId) {
    return false
  }

  return isLatestSubscriptionPaymentSucceeded(
    args.subscriptionId,
    args.productId,
  )
}

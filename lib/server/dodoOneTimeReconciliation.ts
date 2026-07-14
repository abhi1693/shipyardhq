import { dodoClient } from "@/lib/dodo"
import prisma from "@/lib/prisma"
import { readMetadataString } from "@/lib/server/subscriptionMetadata"
import { refreshProductPlanGrantCachesFromWorker } from "@/lib/server/productPlanGrantCache"
import {
  reconcileDodoOneTimePaymentState,
  type ProductPlanGrantResult,
} from "@/lib/server/productPlanGrants"
import {
  PlanType,
  ProductPlanGrantSource,
  ProductPlanGrantStatus,
} from "@/lib/vendor/prisma/client"

const MINIMUM_LOOKBACK_DAYS = 7
const LOOKBACK_BUFFER_DAYS = 2
const MS_PER_DAY = 24 * 60 * 60 * 1000

function metadataRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function belongsToProductPlanPayment(payment: {
  metadata?: unknown
  subscription_id?: string | null
}) {
  if (payment.subscription_id) return false
  const metadata = metadataRecord(payment.metadata)
  return Boolean(
    readMetadataString(metadata, "productId", "product_id") &&
    readMetadataString(metadata, "planId", "plan_id"),
  )
}

function shouldRefreshResult(result: ProductPlanGrantResult) {
  return (
    result.productId &&
    result.outcome !== "ignored" &&
    result.outcome !== "invalid"
  )
}

export async function reconcileRecentDodoOneTimePayments(
  now: Date = new Date(),
) {
  const [longestPlan, activeGrants] = await Promise.all([
    prisma.plan.aggregate({
      where: {
        isDefault: false,
        type: PlanType.one_time_price,
        price: { gt: 0 },
      },
      _max: { boostForDays: true },
    }),
    prisma.productPlanGrant.findMany({
      where: {
        source: ProductPlanGrantSource.dodo_payment,
        status: ProductPlanGrantStatus.active,
      },
      select: { externalPaymentId: true },
    }),
  ])
  const lookbackDays = Math.max(
    MINIMUM_LOOKBACK_DAYS,
    (longestPlan._max.boostForDays ?? 0) + LOOKBACK_BUFFER_DAYS,
  )
  const cutoff = new Date(now.getTime() - lookbackDays * MS_PER_DAY)
  const paymentIds = new Set(
    activeGrants.flatMap((grant) =>
      grant.externalPaymentId ? [grant.externalPaymentId] : [],
    ),
  )
  const touchedProductIds = new Set<string>()
  const changedProductIds = new Set<string>()
  const outcomeCounts: Record<ProductPlanGrantResult["outcome"], number> = {
    applied: 0,
    recorded: 0,
    duplicate: 0,
    ignored: 0,
    invalid: 0,
  }
  let failures = 0

  try {
    for await (const payment of dodoClient.payments.list({
      status: "succeeded",
      created_at_gte: cutoff.toISOString(),
      page_size: 100,
    })) {
      if (belongsToProductPlanPayment(payment)) {
        paymentIds.add(payment.payment_id)
      }
    }
  } catch (error) {
    failures += 1
    console.error("[cron] one-time payment discovery failed", {
      cutoff: cutoff.toISOString(),
      error,
    })
  }

  for (const paymentId of paymentIds) {
    try {
      const payment = await dodoClient.payments.retrieve(paymentId)
      const result = await reconcileDodoOneTimePaymentState(payment, { now })
      outcomeCounts[result.outcome] += 1
      if (result.outcome === "invalid") {
        failures += 1
        console.error("[cron] one-time payment reconciliation invalid", {
          paymentId,
          productId: result.productId,
          reason: result.reason,
        })
      }
      if (shouldRefreshResult(result)) {
        touchedProductIds.add(result.productId!)
      }
      if (
        result.productId &&
        (result.grantChanged || result.projectionChanged)
      ) {
        changedProductIds.add(result.productId)
      }
    } catch (error) {
      failures += 1
      console.error("[cron] one-time payment reconciliation failed", {
        paymentId,
        error,
      })
    }
  }

  if (touchedProductIds.size) {
    try {
      await refreshProductPlanGrantCachesFromWorker(
        [...touchedProductIds],
        "one-time-payments.reconciled",
      )
    } catch (error) {
      failures += 1
      console.error("[cron] one-time payment cache refresh failed", { error })
    }
  }

  const summary = {
    lookbackDays,
    paymentCount: paymentIds.size,
    touchedProducts: touchedProductIds.size,
    changedProducts: changedProductIds.size,
    outcomes: outcomeCounts,
    failures,
  }
  console.info("[cron] one-time payment reconciliation complete", summary)

  if (failures > 0) {
    throw new Error(
      `${failures} one-time payment reconciliation operation(s) failed`,
    )
  }
  return summary
}

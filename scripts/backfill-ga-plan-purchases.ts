/**
 * Backfill GA4 purchase events using Dodo Payments as the source of truth.
 *
 * Required env:
 *   DODO_API_KEY, DODO_ENV=live_mode|test_mode
 *   GOOGLE_ANALYTICS_ID, GOOGLE_ANALYTICS_API_SECRET
 *
 * Optional env:
 *   BACKFILL_STATUS=succeeded     // Dodo payment status filter (default: succeeded)
 *   BACKFILL_PAGE_SIZE=100        // page size for pagination
 *
 * Run:
 *   npx tsx scripts/backfill-ga-plan-purchases.ts
 */

import { dodoClient } from "@/lib/dodo"
import { trackPlanPurchaseInGa } from "@/lib/server/analytics/planPurchaseTracking"
import type { Payments } from "dodopayments/resources/payments"
import type { Subscriptions } from "dodopayments/resources/subscriptions"
import { IS_PROD } from "@/lib/constants"

function parseDate(input?: string | null) {
  if (!input) return null
  const d = new Date(input)
  return Number.isFinite(d.getTime()) ? d : null
}

function extractProductIds(payment: Payments.Payment) {
  const ids = new Set<string>()
  const cart = (payment.product_cart as Payments.Payment.ProductCart[]) || []
  for (const item of cart) {
    if (item?.product_id) ids.add(item.product_id)
  }
  const metaIds = (() => {
    try {
      const raw = (payment.metadata || {}) as any
      const pid = raw?.planId || raw?.productId
      return typeof pid === "string" ? [pid] : []
    } catch {
      return []
    }
  })()
  for (const mid of metaIds) ids.add(mid)
  return Array.from(ids)
}

export async function runGaPlanPurchaseBackfill() {
  if (!process.env.GOOGLE_ANALYTICS_ID || !process.env.GOOGLE_ANALYTICS_API_SECRET) {
    console.error("Missing GA env: GOOGLE_ANALYTICS_ID and GOOGLE_ANALYTICS_API_SECRET are required.")
    process.exit(1)
  }

  const status = (process.env.BACKFILL_STATUS || "succeeded").trim()
  const pageSize = Math.max(1, parseInt(process.env.BACKFILL_PAGE_SIZE || "100", 10) || 100)

  console.log(
    `[ga-backfill] starting with status=${status}, pageSize=${pageSize}, env=${
      IS_PROD ? "prod" : "debug"
    } endpoint`,
  )

  let processed = 0
  let sent = 0
  const subscriptionProductCache = new Map<string, string>()

  const paymentQuery: Payments.PaymentListParams = {
    status: status as Payments.IntentStatus,
    page_size: pageSize,
  }

  for await (const payment of dodoClient.payments.list(paymentQuery)) {
    processed += 1
    const paymentId = payment.payment_id
    if (!paymentId) continue

    let detailed: Payments.Payment | null = null
    try {
      detailed = (await dodoClient.payments.retrieve(paymentId)) as Payments.Payment
    } catch (error) {
      console.error(`Failed to retrieve payment ${paymentId}`, error)
      continue
    }

    const paymentRecord = detailed ?? (payment as unknown as Payments.Payment)

    let productIds = extractProductIds(paymentRecord as Payments.Payment)
    if ((!productIds || productIds.length === 0) && paymentRecord.subscription_id) {
      const pid = await resolveSubscriptionProductId(
        paymentRecord.subscription_id,
        subscriptionProductCache,
      )
      if (pid) productIds = [pid]
    }
    if (!productIds.length) {
      console.warn(`Skipping payment ${paymentId}: no product_id found`)
      continue
    }

    for (const productId of productIds) {
      const priceCents =
        productIds.length === 1 && typeof paymentRecord.total_amount === "number"
          ? paymentRecord.total_amount
          : undefined
      const currency = (paymentRecord.currency || "USD").toString().toUpperCase()
      const planRef = {
        id: productId,
        name: paymentRecord.metadata?.planName || productId,
        slug: productId,
        price: priceCents ?? null,
        type: paymentRecord.subscription_id ? "recurring_price" : null,
      }
      const source = paymentRecord.subscription_id ? "subscription" : "product"
      await trackPlanPurchaseInGa({
        userId: payment.customer?.customer_id || "unknown",
        transactionId: paymentId,
        plan: planRef,
        priceCents,
        currency,
        source,
      })
      console.log(
        `[ga-backfill] emitted purchase: payment=${paymentId} product=${productId} price=${priceCents ?? "n/a"} currency=${currency} source=${source}`,
      )
      sent += 1
    }
  }

  console.log(
    `Backfill complete. Processed ${processed} payments, emitted ${sent} plan purchase events.`,
  )
}

const isDirectRun =
  process.argv[1]?.includes("backfill-ga-plan-purchases") ||
  process.argv[1]?.includes("backfill-ga-plan-purchases.ts") ||
  process.argv[1]?.includes("backfill-ga-plan-purchases.js")

if (isDirectRun) {
  runGaPlanPurchaseBackfill().catch((err) => {
    console.error("Backfill failed", err)
    process.exit(1)
  })
}

async function resolveSubscriptionProductId(
  subId: string,
  cache: Map<string, string>,
): Promise<string | null> {
  if (cache.has(subId)) return cache.get(subId) || null
  try {
    const sub = await dodoClient.subscriptions.retrieve(subId)
    const pid = (sub as Subscriptions.Subscription).product_id
    if (pid) cache.set(subId, pid)
    return pid ?? null
  } catch (error) {
    console.error(`Failed to fetch subscription ${subId}`, error)
    cache.set(subId, "")
    return null
  }
}

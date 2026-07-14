import { NextResponse } from "next/server"

import { dodoClient } from "@/lib/dodo"
import {
  trackPlanPurchaseInGa,
  trackRefundInGa,
} from "@/lib/server/analytics/planPurchaseTracking"
import { refreshProductPlanGrantCaches } from "@/lib/server/productPlanGrantCache"
import { hasVerifiedDodoSubscriptionPlanChangePayment } from "@/lib/server/dodoSubscriptionPayments"
import {
  fulfillDodoOneTimePayment,
  refundDodoOneTimePayment,
  revokeDodoOneTimePaymentForDispute,
  syncDodoSubscriptionGrant,
  type ProductPlanGrantResult,
  UNVERIFIED_SUBSCRIPTION_PLAN_CHANGE_REASON,
} from "@/lib/server/productPlanGrants"

const WEBHOOK_SECRET = process.env.DODO_WEBHOOK_SECRET?.trim()

async function refreshChangedProjection(
  grantResult: ProductPlanGrantResult,
  reason: string,
) {
  if (grantResult.outcome === "invalid") {
    throw new Error(
      `Invalid product plan grant result: ${grantResult.reason ?? "unknown"}`,
    )
  }
  if (grantResult.outcome === "ignored" || !grantResult.productId) return
  await refreshProductPlanGrantCaches(grantResult.productId, reason)
}

export async function POST(req: Request) {
  if (!WEBHOOK_SECRET) {
    console.error("[dodo-webhook] missing DODO_WEBHOOK_SECRET")
    return NextResponse.json(
      { error: "webhook secret missing" },
      { status: 400 },
    )
  }

  const rawBody = await req.text()

  let event:
    | Awaited<ReturnType<typeof dodoClient.webhooks.unwrap>>
    | Awaited<ReturnType<typeof dodoClient.webhooks.unsafeUnwrap>>

  try {
    event = await dodoClient.webhooks.unwrap(rawBody, {
      headers: Object.fromEntries(req.headers),
      key: WEBHOOK_SECRET,
    })
  } catch (error) {
    console.error("[dodo-webhook] failed to unwrap", error)
    return NextResponse.json({ error: "invalid webhook" }, { status: 400 })
  }

  try {
    switch (event.type) {
      case "payment.succeeded": {
        const payment = event.data
        let grantResult: ProductPlanGrantResult
        if (payment.subscription_id) {
          const subscription = await dodoClient.subscriptions.retrieve(
            payment.subscription_id,
          )
          const providerObservedAt = new Date()
          const planChangePaymentSucceeded =
            await hasVerifiedDodoSubscriptionPlanChangePayment({
              subscriptionId: subscription.subscription_id,
              productId: subscription.product_id,
              status: subscription.status,
              metadata: subscription.metadata,
            })
          grantResult = await syncDodoSubscriptionGrant(subscription, {
            providerObservedAt,
            planChangePaymentSucceeded,
          })
        } else {
          grantResult = await fulfillDodoOneTimePayment(payment)
        }
        await refreshChangedProjection(grantResult, "dodo.payment.succeeded")
        if (grantResult.reason === UNVERIFIED_SUBSCRIPTION_PLAN_CHANGE_REASON) {
          throw new Error(UNVERIFIED_SUBSCRIPTION_PLAN_CHANGE_REASON)
        }

        console.info("[dodo-webhook] payment entitlement handled", {
          paymentId: payment.payment_id,
          productId: grantResult.productId,
          outcome: grantResult.outcome,
          reason: grantResult.reason,
        })

        const customerId = payment.customer?.customer_id
        if (customerId) {
          await trackPlanPurchaseInGa({
            userId: customerId,
            paymentId: payment.payment_id,
            payment,
          })
        }
        break
      }
      case "refund.succeeded": {
        const refund = event.data
        const paymentId = refund.payment_id?.trim()
        if (!paymentId) {
          throw new Error("Missing payment id for refund.succeeded")
        }
        const payment = await dodoClient.payments.retrieve(paymentId)
        const grantResult = await refundDodoOneTimePayment(payment, refund)
        await refreshChangedProjection(grantResult, "dodo.refund.succeeded")

        console.info("[dodo-webhook] refund entitlement handled", {
          paymentId,
          refundId: refund.refund_id,
          productId: grantResult.productId,
          outcome: grantResult.outcome,
          reason: grantResult.reason,
        })

        await trackRefundInGa({
          userId: refund.customer?.customer_id,
          transactionId: refund.payment_id || refund.refund_id,
          amountCents: typeof refund.amount === "number" ? refund.amount : null,
          currency: refund.currency,
        })
        break
      }
      case "dispute.accepted":
      case "dispute.lost": {
        const dispute = event.data
        const paymentId = dispute.payment_id?.trim()
        if (!paymentId) {
          throw new Error(`Missing payment id for ${event.type}`)
        }
        const payment = await dodoClient.payments.retrieve(paymentId)
        const grantResult = await revokeDodoOneTimePaymentForDispute(
          payment,
          dispute,
        )
        await refreshChangedProjection(grantResult, `dodo.${event.type}`)

        console.info("[dodo-webhook] dispute entitlement handled", {
          paymentId,
          disputeId: dispute.dispute_id,
          productId: grantResult.productId,
          outcome: grantResult.outcome,
          reason: grantResult.reason,
        })
        break
      }
      case "subscription.active":
      case "subscription.renewed":
      case "subscription.updated":
      case "subscription.plan_changed":
      case "subscription.cancelled":
      case "subscription.expired":
      case "subscription.failed":
      case "subscription.on_hold": {
        const deliveredSubscription = event.data
        const subscriptionId = deliveredSubscription.subscription_id?.trim()
        if (!subscriptionId) {
          throw new Error(`Missing subscription id for ${event.type}`)
        }
        // Webhooks can arrive out of order. Re-read the provider's current
        // snapshot instead of applying the potentially stale event payload.
        const subscription =
          await dodoClient.subscriptions.retrieve(subscriptionId)
        const providerObservedAt = new Date()
        const planChangePaymentSucceeded =
          await hasVerifiedDodoSubscriptionPlanChangePayment({
            subscriptionId,
            productId: subscription.product_id,
            status: subscription.status,
            metadata: subscription.metadata,
          })
        const grantResult = await syncDodoSubscriptionGrant(subscription, {
          providerObservedAt,
          planChangePaymentSucceeded,
        })
        await refreshChangedProjection(
          grantResult,
          `dodo.${event.type.replaceAll(".", "-")}`,
        )
        if (grantResult.reason === UNVERIFIED_SUBSCRIPTION_PLAN_CHANGE_REASON) {
          throw new Error(UNVERIFIED_SUBSCRIPTION_PLAN_CHANGE_REASON)
        }

        console.info("[dodo-webhook] subscription entitlement handled", {
          subscriptionId,
          productId: grantResult.productId,
          eventType: event.type,
          outcome: grantResult.outcome,
          reason: grantResult.reason,
        })
        break
      }
      default:
        console.info("[dodo-webhook] ignored event", event.type)
    }
  } catch (error) {
    console.error("[dodo-webhook] handler error", error)
    return NextResponse.json({ error: "handler error" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

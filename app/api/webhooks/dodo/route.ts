import { NextResponse } from "next/server"

import { dodoClient } from "@/lib/dodo"
import {
  trackPlanPurchaseInGa,
  trackRefundInGa,
} from "@/lib/server/analytics/planPurchaseTracking"

const WEBHOOK_SECRET = process.env.DODO_WEBHOOK_SECRET?.trim()

export async function POST(req: Request) {
  if (!WEBHOOK_SECRET) {
    console.error("[dodo-webhook] missing DODO_WEBHOOK_SECRET")
    return NextResponse.json(
      { error: "webhook secret missing" },
      { status: 400 },
    )
  }

  const rawBody = await req.text()
  console.info("[dodo-webhook] received", rawBody)

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
        const userId = payment.customer?.customer_id
        if (!userId) {
          console.error("[dodo-webhook] payment missing customer_id")
          return NextResponse.json(
            { error: "missing customer_id" },
            { status: 400 },
          )
        }

        await trackPlanPurchaseInGa({
          userId,
          paymentId: payment.payment_id,
          payment,
        })
        break
      }
      case "refund.succeeded": {
        const refund = event.data
        const userId = refund.customer?.customer_id
        if (!userId) {
          console.error("[dodo-webhook] refund missing customer_id")
          return NextResponse.json(
            { error: "missing customer_id" },
            { status: 400 },
          )
        }

        await trackRefundInGa({
          userId,
          transactionId: refund.payment_id || refund.refund_id,
          amountCents: typeof refund.amount === "number" ? refund.amount : null,
          currency: refund.currency,
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

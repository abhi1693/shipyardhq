import { randomUUID } from "crypto"

import type { Payments } from "dodopayments/resources/payments"

import { IS_PROD } from "@/lib/constants"
import { dodoClient } from "@/lib/dodo"

type PurchaseSource = "product" | "organization" | "subscription"

const MEASUREMENT_ID = process.env.GOOGLE_ANALYTICS_ID?.trim()
const API_SECRET = process.env.GOOGLE_ANALYTICS_API_SECRET?.trim()
const GA_ENDPOINT = IS_PROD
  ? "https://www.google-analytics.com/mp/collect"
  : "https://www.google-analytics.com/debug/mp/collect"

const hasGaConfig = () => Boolean(MEASUREMENT_ID && API_SECRET)

type TrackInput = {
  userId: string
  paymentId?: string
  subscriptionId?: string
  source?: PurchaseSource
}

export async function trackPlanPurchaseInGa(input: TrackInput) {
  if (!hasGaConfig()) return
  if (!input.paymentId?.trim() && !input.subscriptionId?.trim()) return

  const measurementId = MEASUREMENT_ID!
  const apiSecret = API_SECRET!

  try {
    const payload = await buildPurchasePayload(input)
    if (!payload) return

    const body = {
      client_id: randomUUID(),
      user_id: input.userId,
      events: [
        {
          name: "purchase",
          params: payload,
        },
      ],
    }

    console.info(
      "[analytics] GA purchase request body",
      JSON.stringify(body, null, 2),
    )

    const response = await fetch(
      `${GA_ENDPOINT}?measurement_id=${encodeURIComponent(measurementId)}&api_secret=${encodeURIComponent(apiSecret)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      },
    )

    if (!response.ok) {
      const errorText = await response.text().catch(() => "")
      console.error("[analytics] failed to record GA plan purchase", {
        status: response.status,
        body: errorText?.slice?.(0, 256),
      })
    }
  } catch (error) {
    console.error("[analytics] GA plan purchase request threw", error)
  }
}

async function buildPurchasePayload(input: TrackInput) {
  if (input.paymentId) {
    return buildFromPayment(input)
  }

  if (input.subscriptionId) {
    return buildFromSubscription(input)
  }

  return null
}

async function buildFromPayment(input: TrackInput) {
  const payment = await dodoClient.payments.retrieve(input.paymentId!)
  if (!payment) return null
  if (payment.status && payment.status !== "succeeded") return null

  const lineItems = await dodoClient.payments
    .retrieveLineItems(payment.payment_id)
    .catch(() => null)

  const currency = (payment.currency || "USD").toUpperCase()
  const totalAmountCents = Number(payment.total_amount ?? 0)
  const taxCents =
    typeof payment.tax === "number" ? Math.max(0, payment.tax) : undefined
  const coupon =
    payment.metadata?.discount_code ||
    payment.metadata?.coupon ||
    payment.discount_id ||
    undefined

  const cartItems = Array.isArray(payment.product_cart)
    ? payment.product_cart
    : []
  const lineItemsList = Array.isArray(lineItems?.items) ? lineItems!.items : []
  const itemCount = Math.max(cartItems.length, lineItemsList.length, 1)

  type TempItem = {
    id: string
    name: string
    quantity: number
    basePriceCents?: number
    affiliation?: string
    variant?: string
  }

  const tempItems: TempItem[] = []
  let subtotalCents = 0

  for (let i = 0; i < itemCount; i++) {
    const cart = cartItems[i]
    const line = lineItemsList[i] as (Payments.PaymentRetrieveLineItemsResponse.Item & {
      items_id?: string
    }) | undefined

    const quantity = cart?.quantity && cart.quantity > 0 ? cart.quantity : 1
    const basePriceCents =
      typeof line?.amount === "number" ? Math.max(0, Math.round(line.amount)) : undefined
    const itemSubtotal =
      typeof basePriceCents === "number" ? basePriceCents * quantity : undefined
    if (typeof itemSubtotal === "number") subtotalCents += itemSubtotal

    tempItems.push({
      id:
        line?.items_id ||
        cart?.product_id ||
        payment.metadata?.planId ||
        payment.metadata?.productId ||
        `item_${i + 1}`,
      name:
        line?.name ||
        line?.description ||
        payment.metadata?.planName ||
        cart?.product_id ||
        `Item ${i + 1}`,
      quantity,
      basePriceCents,
      affiliation: payment.metadata?.productSlug,
      variant: payment.metadata?.planSlug || cart?.product_id,
    })
  }

  if (subtotalCents === 0 && totalAmountCents > 0) {
    const fallbackUnitPrice = Math.round(totalAmountCents / itemCount)
    subtotalCents = fallbackUnitPrice * itemCount
    for (const item of tempItems) {
      item.basePriceCents = fallbackUnitPrice
    }
  }

  const discountTotalCents =
    subtotalCents > 0 && totalAmountCents > 0 && subtotalCents > totalAmountCents
      ? subtotalCents - totalAmountCents
      : 0

  const items = tempItems.map((item) => {
    const priceCents =
      typeof item.basePriceCents === "number" ? item.basePriceCents : 0
    const itemSubtotal = priceCents * item.quantity
    const itemDiscountCents =
      discountTotalCents > 0 && subtotalCents > 0
        ? Math.round((itemSubtotal / subtotalCents) * discountTotalCents)
        : 0
    const finalPricePerUnitCents = Math.max(
      0,
      Math.round((itemSubtotal - itemDiscountCents) / item.quantity),
    )

    return {
      item_id: item.id,
      item_name: item.name,
      item_category: "plan_purchase",
      quantity: item.quantity,
      price: finalPricePerUnitCents / 100,
      ...(itemDiscountCents > 0 ? { discount: itemDiscountCents / 100 } : {}),
      ...(item.affiliation ? { affiliation: item.affiliation } : {}),
      ...(item.variant ? { item_variant: item.variant } : {}),
    }
  })

  const params: Record<string, any> = {
    transaction_id: payment.payment_id || input.paymentId,
    currency,
    value: totalAmountCents > 0 ? totalAmountCents / 100 : undefined,
    ...(typeof taxCents === "number" ? { tax: taxCents / 100 } : {}),
    ...(coupon ? { coupon } : {}),
    ...(input.source ? { purchase_source: input.source } : {}),
    items,
  }

  return params
}

async function buildFromSubscription(input: TrackInput) {
  const subscription = await dodoClient.subscriptions.retrieve(
    input.subscriptionId!,
  )
  if (!subscription) return null

  const currency = (subscription.currency || "USD").toUpperCase()
  const perUnitCents = Math.max(0, subscription.recurring_pre_tax_amount || 0)
  const quantity = subscription.quantity > 0 ? subscription.quantity : 1
  const totalAmountCents = perUnitCents * quantity

  const params: Record<string, any> = {
    transaction_id: subscription.subscription_id || input.subscriptionId,
    currency,
    value: totalAmountCents > 0 ? totalAmountCents / 100 : undefined,
    ...(subscription.metadata?.coupon ? { coupon: subscription.metadata.coupon } : {}),
    ...(input.source ? { purchase_source: input.source } : {}),
    items: [
      {
        item_id: subscription.product_id,
        item_name: subscription.metadata?.planName || subscription.product_id,
        item_category: "plan_subscription",
        quantity,
        price: perUnitCents / 100,
        ...(subscription.metadata?.planSlug
          ? { item_variant: subscription.metadata.planSlug }
          : {}),
      },
    ],
  }

  return params
}

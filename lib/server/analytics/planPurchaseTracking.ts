import type { Payments } from "dodopayments/resources/payments"
import type { Subscription as DodoSubscription } from "dodopayments/resources/subscriptions"
import { dodoClient } from "@/lib/dodo"
import {
  acquisitionFromCheckoutMetadata,
  type AcquisitionContext,
} from "@/lib/analytics/acquisition"
import { sendAttributedGaEvent } from "@/lib/server/analytics/attributedEvents"

type TrackInput = {
  userId: string
  context?: AcquisitionContext
  paymentId?: string
  payment?: Payments.Payment
  subscriptionId?: string
  subscription?: DodoSubscription
}

export async function trackPlanPurchaseInGa(input: TrackInput) {
  if (!input.paymentId?.trim()) return
  try {
    const payload = await buildPurchasePayload(input)
    if (!payload) return
    return await sendAttributedGaEvent({
      key: `purchase:${input.paymentId}`,
      userId: input.userId,
      name: "purchase",
      context:
        input.context ??
        acquisitionFromCheckoutMetadata(input.payment?.metadata),
      params: payload,
    })
  } catch {
    return
  }
}

export async function trackRefundInGa(input: {
  userId?: string
  transactionId: string
  refundId?: string
  amountCents?: number | null
  currency?: string | null
  coupon?: string | null
  shippingCents?: number | null
  context?: AcquisitionContext
}) {
  if (!input.userId || !input.refundId || !input.transactionId.trim()) return
  return sendAttributedGaEvent({
    key: `refund:${input.refundId}`,
    userId: input.userId,
    name: "refund",
    context: input.context,
    params: {
      transaction_id: input.transactionId,
      ...(input.currency ? { currency: input.currency.toUpperCase() } : {}),
      ...(typeof input.amountCents === "number"
        ? { value: input.amountCents / 100 }
        : {}),
      ...(typeof input.shippingCents === "number"
        ? { shipping: input.shippingCents / 100 }
        : {}),
    },
  })
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

function safeCoupon(value?: string) {
  return value &&
    /^[a-z0-9_-]{1,40}$/i.test(value) &&
    !/(?:secret|token|password|^sk[-_])/i.test(value)
    ? value
    : undefined
}

function textValue(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value.trim() || undefined
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return `${value}`
  }
  return undefined
}

function metadataTextValue(
  metadata: Record<string, unknown> | null | undefined,
  key: string,
): string | undefined {
  return textValue(metadata?.[key])
}

async function buildFromPayment(input: TrackInput) {
  let payment = input.payment
  if (!payment && input.paymentId) {
    try {
      payment = await dodoClient.payments.retrieve(input.paymentId)
    } catch {
      payment = undefined
    }
  }
  if (!payment) return null
  if (payment.status !== "succeeded") return null

  const candidateCoupon =
    metadataTextValue(payment.metadata, "discount_code") ||
    metadataTextValue(payment.metadata, "coupon") ||
    textValue(payment.discounts?.[0]?.code) ||
    textValue(payment.discounts?.[0]?.discount_id) ||
    undefined
  const coupon = safeCoupon(candidateCoupon)

  const lineItems = await dodoClient.payments
    .retrieveLineItems(payment.payment_id)
    .catch(() => null)

  if (
    !payment.currency ||
    typeof payment.total_amount !== "number" ||
    !Number.isFinite(payment.total_amount) ||
    payment.total_amount < 0
  )
    return null
  const currency = payment.currency.toUpperCase()
  const totalAmountCents = payment.total_amount
  const taxCents =
    typeof payment.tax === "number" ? Math.max(0, payment.tax) : undefined
  const shippingCents =
    typeof (payment as any)?.shipping_amount === "number"
      ? Math.max(0, (payment as any).shipping_amount)
      : undefined

  const cartItems = Array.isArray(payment.product_cart)
    ? payment.product_cart
    : []
  const lineItemsList = Array.isArray(lineItems?.items) ? lineItems.items : []
  const itemCount = Math.max(cartItems.length, lineItemsList.length, 1)

  type TempItem = {
    id: string
    name: string
    productId?: string
    quantity: number
    basePriceCents?: number
    affiliation?: string
    variant?: string
  }

  const tempItems: TempItem[] = []
  let subtotalCents = 0

  for (let i = 0; i < itemCount; i++) {
    const cart = cartItems[i]
    const line = lineItemsList[i] as
      | (Payments.PaymentRetrieveLineItemsResponse.Item & {
          items_id?: string
        })
      | undefined

    const quantity = cart?.quantity && cart.quantity > 0 ? cart.quantity : 1
    const basePriceCents =
      typeof line?.amount === "number"
        ? Math.max(0, Math.round(line.amount))
        : undefined
    const itemSubtotal =
      typeof basePriceCents === "number" ? basePriceCents * quantity : undefined
    if (typeof itemSubtotal === "number") subtotalCents += itemSubtotal

    tempItems.push({
      id:
        line?.items_id ||
        cart?.product_id ||
        metadataTextValue(payment.metadata, "planId") ||
        metadataTextValue(payment.metadata, "productId") ||
        `item_${i + 1}`,
      name: line?.name || line?.description || "Unknown item",
      productId: cart?.product_id || line?.items_id,
      quantity,
      basePriceCents,
      affiliation: metadataTextValue(payment.metadata, "productSlug"),
      variant:
        metadataTextValue(payment.metadata, "planSlug") || cart?.product_id,
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
    subtotalCents > 0 &&
    totalAmountCents > 0 &&
    subtotalCents > totalAmountCents
      ? subtotalCents - totalAmountCents
      : 0

  const lookupIds = Array.from(
    new Set(
      tempItems
        .map((item) => item.productId || item.id)
        .filter((id): id is string => Boolean(id)),
    ),
  )

  const productNameById = new Map<string, string | undefined>()
  if (lookupIds.length) {
    await Promise.all(
      lookupIds.map(async (id) => {
        try {
          const product = await dodoClient.products.retrieve(id)
          productNameById.set(id, product?.name || undefined)
        } catch {
          productNameById.set(id, undefined)
        }
      }),
    )
  }

  let valueCents = 0

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
    valueCents += finalPricePerUnitCents * item.quantity

    const lookupId = item.productId || item.id
    const productName = lookupId ? productNameById.get(lookupId) : undefined

    return {
      item_id: item.id,
      item_name: productName || item.name || "Unknown item",
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
    ...(valueCents > 0 ? { value: valueCents / 100 } : {}),
    ...(typeof taxCents === "number" ? { tax: taxCents / 100 } : {}),
    ...(typeof shippingCents === "number"
      ? { shipping: shippingCents / 100 }
      : {}),
    ...(coupon ? { coupon } : {}),
    items,
  }

  return params
}

async function buildFromSubscription(input: TrackInput) {
  let subscription = input.subscription
  if (!subscription && input.subscriptionId) {
    try {
      subscription = await dodoClient.subscriptions.retrieve(
        input.subscriptionId,
      )
    } catch {
      subscription = undefined
    }
  }
  if (!subscription) return null

  const currency = (subscription.currency || "USD").toUpperCase()
  const perUnitCents = Math.max(0, subscription.recurring_pre_tax_amount || 0)
  const quantity = subscription.quantity > 0 ? subscription.quantity : 1
  const totalAmountCents = perUnitCents * quantity

  const candidateCoupon =
    metadataTextValue(subscription.metadata, "discount_code") ||
    metadataTextValue(subscription.metadata, "coupon") ||
    undefined
  const planSlug = metadataTextValue(subscription.metadata, "planSlug")
  const coupon = safeCoupon(candidateCoupon)

  let productName: string | undefined
  if (subscription.product_id) {
    try {
      const product = await dodoClient.products.retrieve(
        subscription.product_id,
      )
      productName = product?.name || undefined
    } catch (error) {
      console.error(
        `[analytics] failed to retrieve product ${subscription.product_id} for GA`,
        error,
      )
    }
  }

  const params: Record<string, any> = {
    transaction_id: subscription.subscription_id || input.subscriptionId,
    currency,
    ...(totalAmountCents > 0 ? { value: totalAmountCents / 100 } : {}),
    ...(coupon ? { coupon } : {}),
    items: [
      {
        item_id: subscription.product_id,
        item_name: productName || "Unknown product",
        quantity,
        price: perUnitCents / 100,
        ...(planSlug ? { item_variant: planSlug } : {}),
      },
    ],
  }

  return params
}

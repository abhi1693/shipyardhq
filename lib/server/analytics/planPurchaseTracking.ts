import { randomUUID } from "crypto"

import { IS_PROD } from "@/lib/constants"

type PlanRef = {
  id: string
  name?: string | null
  slug?: string | null
  price?: number | null
  type?: string | null
}

type ProductRef = { id: string; slug?: string | null; name?: string | null }

type PurchaseSource = "product" | "organization" | "subscription"

const MEASUREMENT_ID = process.env.GOOGLE_ANALYTICS_ID?.trim()
const API_SECRET = process.env.GOOGLE_ANALYTICS_API_SECRET?.trim()
const GA_ENDPOINT = IS_PROD
  ? "https://www.google-analytics.com/mp/collect"
  : "https://www.google-analytics.com/debug/mp/collect"

const hasGaConfig = () => Boolean(MEASUREMENT_ID && API_SECRET)

export async function trackPlanPurchaseInGa(input: {
  userId: string
  transactionId: string
  plan: PlanRef
  priceCents?: number | null
  currency?: string
  product?: ProductRef
  source?: PurchaseSource
}) {
  if (!hasGaConfig()) return
  if (!input.transactionId?.trim()) return

  const priceCents =
    typeof input.priceCents === "number"
      ? input.priceCents
      : typeof input.plan.price === "number"
        ? input.plan.price
        : undefined

  // Skip free plans or zero-value purchases
  if (typeof priceCents === "number" && priceCents <= 0) return

  const measurementId = MEASUREMENT_ID!
  const apiSecret = API_SECRET!
  const currency = (input.currency || "USD").toUpperCase()
  const value =
    typeof priceCents === "number" ? Math.max(0, priceCents) / 100 : undefined

  const params: Record<string, any> = {
    transaction_id: input.transactionId,
    currency,
    ...(typeof value === "number" ? { value } : {}),
    plan_id: input.plan.id,
    ...(input.plan.name ? { plan_name: input.plan.name } : {}),
    ...(input.plan.slug ? { plan_slug: input.plan.slug } : {}),
    ...(input.plan.type ? { plan_type: input.plan.type } : {}),
    ...(input.source ? { purchase_source: input.source } : {}),
    ...(input.product?.id ? { product_id: input.product.id } : {}),
    ...(input.product?.slug ? { product_slug: input.product.slug } : {}),
  }

  const items = [
    {
      item_id: input.plan.id,
      item_name: input.plan.name || input.plan.slug || "Plan",
      item_category: "plan",
      quantity: 1,
      ...(typeof value === "number" ? { price: value } : {}),
      ...(input.plan.slug ? { item_variant: input.plan.slug } : {}),
      ...(input.product?.slug ? { affiliation: input.product.slug } : {}),
    },
  ]

  const body = {
    client_id: randomUUID(),
    user_id: input.userId,
    events: [
      {
        name: "purchase",
        params: {
          ...params,
          items,
        },
      },
    ],
  }

  try {
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

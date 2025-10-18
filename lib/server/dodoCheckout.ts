import { dodoClient } from "@/lib/dodo"
import type { PlanType } from "@/lib/vendor/prisma/client"

type CheckoutPlan = {
  externalId: string
  type?: PlanType | null
}

type CheckoutCustomer = {
  email: string
  name?: string | null
}

type CheckoutOptions = {
  plan: CheckoutPlan
  customer: CheckoutCustomer
  metadata?: Record<string, string>
  returnUrl?: string
}

export type CheckoutResult = { url: string; kind: "checkout_session" }

export async function createPlanCheckout({
  plan,
  customer,
  metadata,
  returnUrl,
}: CheckoutOptions): Promise<CheckoutResult> {
  const planId = plan.externalId?.trim()
  if (!planId) {
    throw new Error("Missing plan external id for checkout")
  }

  const customerPayload: CheckoutCustomer = {
    email: customer.email,
  }
  if (customer.name) {
    customerPayload.name = customer.name
  }

  const isRecurring = plan.type === ("recurring_price" as PlanType)

  const session = (await dodoClient.checkoutSessions.create({
    product_cart: [{ product_id: planId, quantity: 1 }],
    customer: customerPayload as any,
    metadata,
    return_url: returnUrl,
    ...(isRecurring ? undefined : { subscription_data: null }),
  } as any)) as { checkout_url?: string }

  const url = session.checkout_url?.trim()
  if (!url) {
    throw new Error("Missing checkout URL from Dodo session response")
  }

  return { url, kind: "checkout_session" }
}

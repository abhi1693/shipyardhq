import { dodoClient } from "@/lib/dodo"

type CheckoutPlan = {
  externalId: string
  type?: string | null
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
  discountCode?: string
}

export type CheckoutResult = { url: string }

export async function createPlanCheckout({
  plan,
  customer,
  metadata,
  returnUrl,
  discountCode,
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

  const isRecurring = (plan.type || "").toString() === "recurring_price"
  const normalizedDiscountCode = discountCode?.trim()

  const session = (await dodoClient.checkoutSessions.create({
    product_cart: [{ product_id: planId, quantity: 1 }],
    minimal_address: true,
    customer: customerPayload as any,
    metadata,
    return_url: returnUrl,
    ...(normalizedDiscountCode
      ? { discount_code: normalizedDiscountCode }
      : {}),
    ...(isRecurring ? undefined : { subscription_data: null }),
  } as any)) as { checkout_url?: string }

  const url = session.checkout_url?.trim()
  if (!url) {
    throw new Error("Missing checkout URL from Dodo session response")
  }

  return { url }
}

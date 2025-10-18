import { dodoClient } from "@/lib/dodo"
import type { PlanType } from "@/lib/vendor/prisma/client"
import type { Payments } from "dodopayments/resources/payments"

type CheckoutPlan = {
  externalId: string
  type?: PlanType | null
}

type CheckoutCustomer = {
  email: string
  name?: string | null
  create_new_customer?: boolean
}

type CheckoutOptions = {
  plan: CheckoutPlan
  customer: CheckoutCustomer
  metadata?: Record<string, string>
  returnUrl?: string
  billing?: Payments.BillingAddress
}

export type CheckoutResult =
  | { url: string; kind: "subscription" }
  | { url: string; kind: "payment_link" }

export async function createPlanCheckout({
  plan,
  customer,
  metadata,
  returnUrl,
  billing,
}: CheckoutOptions): Promise<CheckoutResult> {
  const planId = plan.externalId?.trim()
  if (!planId) {
    throw new Error("Missing plan external id for checkout")
  }

  const customerPayload: CheckoutCustomer = {
    email: customer.email,
  }
  if (customer.create_new_customer !== undefined) {
    customerPayload.create_new_customer = customer.create_new_customer
  }
  if (customer.name) {
    customerPayload.name = customer.name
  }

  const isRecurring = plan.type === ("recurring_price" as PlanType)

  if (isRecurring) {
    const session = (await dodoClient.checkoutSessions.create({
      product_cart: [{ product_id: planId, quantity: 1 }],
      customer: customerPayload as any,
      metadata,
      return_url: returnUrl,
    } as any)) as { checkout_url?: string }

    const url = session.checkout_url?.trim()
    if (!url) {
      throw new Error("Missing checkout URL from Dodo session response")
    }

    return { url, kind: "subscription" }
  }

  const payment = (await dodoClient.payments.create({
    billing: billing ?? {
      street: "",
      city: "",
      state: "",
      zipcode: "",
      country: "US",
    },
    customer: customerPayload as any,
    product_cart: [{ product_id: planId, quantity: 1 }],
    metadata,
    payment_link: true,
    return_url: returnUrl,
  } as any)) as { payment_link?: string }

  const url = payment.payment_link?.trim()
  if (!url) {
    throw new Error("Missing payment link from Dodo payment response")
  }

  return { url, kind: "payment_link" }
}

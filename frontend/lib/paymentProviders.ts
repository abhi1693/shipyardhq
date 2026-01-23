import { PaymentConnectorProvider } from "@/lib/vendor/prisma/client/enums"

export type PaymentProvider = {
  id: PaymentConnectorProvider
  name: string
  logoSrc: string
}

export const PAYMENT_PROVIDERS: readonly PaymentProvider[] = [
  {
    id: PaymentConnectorProvider.stripe,
    name: "Stripe",
    logoSrc: "/providers/stripe.jpeg",
  },
  {
    id: PaymentConnectorProvider.polar,
    name: "Polar",
    logoSrc: "/providers/polar.png",
  },
  {
    id: PaymentConnectorProvider.paddle,
    name: "Paddle",
    logoSrc: "/providers/paddle.png",
  },
  {
    id: PaymentConnectorProvider.paystack,
    name: "Paystack",
    logoSrc: "/providers/paystack.png",
  },
  {
    id: PaymentConnectorProvider.dodo,
    name: "Dodo Payments",
    logoSrc: "/providers/dodo.jpeg",
  },
  {
    id: PaymentConnectorProvider.revenuecat,
    name: "RevenueCat",
    logoSrc: "/providers/revenuecat.png",
  },
  {
    id: PaymentConnectorProvider.lemonsqueezy,
    name: "Lemon Squeezy",
    logoSrc: "/providers/lemon.jpeg",
  },
  {
    id: PaymentConnectorProvider.abacatepay,
    name: "AbacatePay",
    logoSrc: "/providers/abacatepay.jpeg",
  },
  {
    id: PaymentConnectorProvider.creem,
    name: "Creem",
    logoSrc: "/providers/creem.svg",
  },
] as const satisfies readonly PaymentProvider[]

export const PAYMENT_PROVIDERS_BY_ID: Record<
  PaymentConnectorProvider,
  PaymentProvider
> = PAYMENT_PROVIDERS.reduce(
  (acc, provider) => {
    acc[provider.id] = provider
    return acc
  },
  {} as Record<PaymentConnectorProvider, PaymentProvider>,
)

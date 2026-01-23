import { PaymentConnectorProvider } from "@/lib/vendor/prisma/client"

import { abacatePayProvider } from "./abacatepay"
import { creemProvider } from "./creem"
import { dodoProvider } from "./dodo"
import { lemonSqueezyProvider } from "./lemonsqueezy"
import { paddleProvider } from "./paddle"
import { polarProvider } from "./polar"
import { paystackProvider } from "./paystack"
import { revenueCatProvider } from "./revenuecat"
import { stripeProvider } from "./stripe"
import type { PaymentProviderDefinition } from "./types"

const PROVIDERS: Partial<
  Record<PaymentConnectorProvider, PaymentProviderDefinition>
> = {
  [PaymentConnectorProvider.abacatepay]: abacatePayProvider,
  [PaymentConnectorProvider.creem]: creemProvider,
  [PaymentConnectorProvider.dodo]: dodoProvider,
  [PaymentConnectorProvider.lemonsqueezy]: lemonSqueezyProvider,
  [PaymentConnectorProvider.paddle]: paddleProvider,
  [PaymentConnectorProvider.paystack]: paystackProvider,
  [PaymentConnectorProvider.polar]: polarProvider,
  [PaymentConnectorProvider.revenuecat]: revenueCatProvider,
  [PaymentConnectorProvider.stripe]: stripeProvider,
}

export function getProviderDefinition(
  provider: PaymentConnectorProvider,
): PaymentProviderDefinition | null {
  return PROVIDERS[provider] ?? null
}

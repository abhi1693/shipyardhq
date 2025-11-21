import { PaymentConnectorProvider } from "@/lib/vendor/prisma/client"

import { dodoProvider } from "./dodo"
import { lemonSqueezyProvider } from "./lemonsqueezy"
import { paddleProvider } from "./paddle"
import { polarProvider } from "./polar"
import { stripeProvider } from "./stripe"
import type { PaymentProviderDefinition } from "./types"

const PROVIDERS: Partial<
  Record<PaymentConnectorProvider, PaymentProviderDefinition>
> = {
  [PaymentConnectorProvider.dodo]: dodoProvider,
  [PaymentConnectorProvider.lemonsqueezy]: lemonSqueezyProvider,
  [PaymentConnectorProvider.paddle]: paddleProvider,
  [PaymentConnectorProvider.polar]: polarProvider,
  [PaymentConnectorProvider.stripe]: stripeProvider,
}

export function getProviderDefinition(
  provider: PaymentConnectorProvider,
): PaymentProviderDefinition | null {
  return PROVIDERS[provider] ?? null
}

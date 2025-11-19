import { PaymentConnectorProvider } from "@/lib/vendor/prisma/client"

import { dodoProvider } from "./dodo"
import { polarProvider } from "./polar"
import type { PaymentProviderDefinition } from "./types"

const PROVIDERS: Partial<
  Record<PaymentConnectorProvider, PaymentProviderDefinition>
> = {
  [PaymentConnectorProvider.dodo]: dodoProvider,
  [PaymentConnectorProvider.polar]: polarProvider,
}

export function getProviderDefinition(
  provider: PaymentConnectorProvider,
): PaymentProviderDefinition | null {
  return PROVIDERS[provider] ?? null
}

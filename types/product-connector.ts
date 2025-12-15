import type { PaymentConnectorProvider, PaymentConnectorStatus } from "@/lib/vendor/prisma/client/enums"

export type ProductWizardConnectorSummary = {
  id: string
  provider: PaymentConnectorProvider
  status: PaymentConnectorStatus | null
  lastSyncedAt?: Date | string | null
  lastSyncError?: string | null
  keyHint?: string | null
  accountId?: string | null
  brandId?: string | null
} | null


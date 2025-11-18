import type {
  PaymentConnector,
  PaymentConnectorProvider,
  Prisma,
} from "@/lib/vendor/prisma/client"

export type PaymentConnectorConfig = {
  environment?: "live_mode" | "test_mode"
  accountId?: string
}

export type RevenueSnapshotInput = {
  currencyCode: string
  periodStart: Date
  periodRevenueCents: number
  allTimeRevenueCents: number
  mrrCents?: number | null
  data?: Prisma.InputJsonValue
}

export type ProviderSyncResult = {
  snapshots: RevenueSnapshotInput[]
}

export type ProviderSyncHandler = (options: {
  connector: PaymentConnector
  apiKey: string
}) => Promise<ProviderSyncResult>

export type ProviderApiValidator = (options: {
  apiKey: string
  config?: PaymentConnectorConfig
  productName?: string
}) => Promise<void>

export type PaymentProviderDefinition = {
  provider: PaymentConnectorProvider
  sync: ProviderSyncHandler
  validateApiKey?: ProviderApiValidator
}

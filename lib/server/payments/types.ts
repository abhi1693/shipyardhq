import type { Prisma } from "@/lib/vendor/prisma/client"

export type PaymentConnectorConfig = {
  environment?: "live_mode" | "test_mode"
  accountId?: string
}

export type RevenueSnapshotInput = {
  currencyCode: string
  periodStart: Date
  periodRevenueCents: number
  allTimeRevenueCents: number
  data?: Prisma.InputJsonValue
}

export type ProviderSyncResult = {
  snapshots: RevenueSnapshotInput[]
}

import type {
  FeatureEntitlement,
  PlacementSchedule,
  PointBalance,
  PointTransaction,
  Redemption,
  RewardCatalogItem,
  RewardRule,
} from "@/lib/vendor/prisma/client"
import type { Prisma } from "@/lib/vendor/prisma/client"

type JsonValue = Prisma.InputJsonValue

export type StreakPayload = {
  count: number
  longest?: number
  tier?: string | null
  activeThrough?: Date | null
  evaluatedAt?: Date | null
}

export type AwardPointsPayload = {
  eventId?: string
  points?: number
  multiplier?: number
  metadata?: JsonValue
  sourceType?: string
  sourceId?: string
  targetType?: string
  targetId?: string
  productId?: string
  notes?: string
  actorUserId?: string
  streak?: StreakPayload
}

export type AwardPointsResult = {
  transaction: PointTransaction
  balance: PointBalance
  rule: RewardRule
  created: boolean
}

export type RedeemReservation = {
  slotKey?: string
  startsAt?: Date
  durationSeconds?: number
}

export type RedeemOptions = {
  productId?: string
  costOverride?: number
  metadata?: JsonValue
  reservation?: RedeemReservation
  actorUserId?: string
  idempotencyKey?: string
  autoActivate?: boolean
  notes?: string
}

export type RedeemResult = {
  transaction: PointTransaction
  balance: PointBalance
  redemption: Redemption
  entitlement: FeatureEntitlement
  placementSchedule?: PlacementSchedule | null
  catalogItem: RewardCatalogItem
  created: boolean
}

export type AdjustPointsOptions = {
  actorUserId: string
  notes?: string
  metadata?: JsonValue
  eventId?: string
}

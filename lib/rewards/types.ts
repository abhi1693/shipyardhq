import type {
  FeatureEntitlement,
  PlacementSchedule,
  RewardBalance,
  RewardTransaction,
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

export type AwardRewardsPayload = {
  eventId?: string
  amount?: number
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

export type AwardRewardsResult = {
  transaction: RewardTransaction
  balance: RewardBalance
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
  transaction: RewardTransaction
  balance: RewardBalance
  redemption: Redemption
  entitlement: FeatureEntitlement
  placementSchedule?: PlacementSchedule | null
  catalogItem: RewardCatalogItem
  created: boolean
}

export type AdjustRewardsOptions = {
  actorUserId: string
  notes?: string
  metadata?: JsonValue
  eventId?: string
}

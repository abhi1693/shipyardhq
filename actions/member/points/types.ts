import type { Prisma } from "@/lib/vendor/prisma/client"
import type {
  FeatureEntitlementStatus,
  PlacementStatus,
  PointTransactionType,
  RedemptionStatus,
  ProductStatus,
  RewardCatalogItem,
} from "@/lib/vendor/prisma/client"

export type RedeemFormState = {
  status: "idle" | "success" | "error"
  message?: string
  redemptionId?: string
  balanceAfter?: number
}

export const initialRedeemState: RedeemFormState = { status: "idle" }

export type MemberPointsSnapshot = {
  balance: {
    balance: number
    lifetimeEarned: number
    lifetimeSpent: number
    lifetimeAdjusted: number
    currentStreakCount: number
    longestStreakCount: number
    currentStreakTier: string | null
    streakActiveThrough: Date | null
    lastEarnedAt: Date | null
    lastRedeemedAt: Date | null
  }
  transactions: Array<{
    id: string
    type: PointTransactionType
    points: number
    balanceAfter: number
    createdAt: Date
    ruleKey: string | null
    ruleName: string | null
    rewardKey: string | null
    rewardName: string | null
    productId: string | null
    productName: string | null
    metadata: Prisma.JsonValue | null
    notes: string | null
    adjustmentAmount: number | null
  }>
  catalog: Array<RewardCatalogItem & {
    canAfford: boolean
    canRedeem: boolean
    reasons: string[]
    activeCount: number
    pendingCount: number
    requiresSchedule: boolean
  }>
  activeEntitlements: Array<{
    id: string
    featureKey: string
    name: string
    status: FeatureEntitlementStatus
    startsAt: Date | null
    expiresAt: Date | null
    productId: string | null
    productName: string | null
    productSlug: string | null
  }>
  recentRedemptions: Array<{
    id: string
    featureKey: string
    name: string
    status: RedemptionStatus
    cost: number
    createdAt: Date
    startsAt: Date | null
    activatedAt: Date | null
    expiresAt: Date | null
    productId: string | null
    productName: string | null
    productSlug: string | null
    placementStatus?: PlacementStatus | null
  }>
  productOptions: Array<{
    id: string
    name: string
    slug: string
    status: ProductStatus
    organizationName: string | null
  }>
}

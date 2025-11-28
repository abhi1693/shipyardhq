import type { EventEnvelopeStatus } from "@/lib/vendor/prisma/client"

export const EVENT_STATUS_KEYS: ReadonlyArray<EventEnvelopeStatus> = [
  "pending",
  "processing",
  "retrying",
  "completed",
  "dead_letter",
]

export const APP_EVENTS = {
  PRODUCT_CREATED: "product.created",
  PRODUCT_UPDATED: "product.updated",
  PRODUCT_PUBLISHED: "product.published",
  PRODUCT_DELETED: "product.deleted",
  PRODUCT_UPVOTED: "product.upvoted",
  PRODUCT_REVIEWED: "product.reviewed",
  PRODUCT_VIEWED: "product.viewed",
  PRODUCT_UPDATE_PUBLISHED: "product.update.published",
  PAYMENTS_CONNECTOR_SYNC: "payments.connector.sync",
  BADGE_ASSIGNED: "badge.assigned",
  BADGE_REMOVED: "badge.removed",
  LEADERBOARD_MONTHLY_WINNERS: "leaderboard.monthly.winners",
  REWARDS_AWARDED: "rewards.awarded",
  REWARDS_REDEEMED: "rewards.redeemed",
  REWARDS_ADJUSTED: "rewards.adjusted",
  REWARDS_REFUNDED: "rewards.refunded",
  REWARDS_DAILY_LOGIN: "rewards.daily-login",
  CLAIM_ATTEMPTS_CLEANUP: "claims.attempts.cleanup",
} as const

export type AppEventKey = (typeof APP_EVENTS)[keyof typeof APP_EVENTS]

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
  LEADERBOARD_REFRESH: "leaderboard.refresh",
  BADGE_ASSIGNED: "badge.assigned",
  BADGE_REMOVED: "badge.removed",
  LEADERBOARD_MONTHLY_WINNERS: "leaderboard.monthly.winners",
  LEADERBOARD_PERIODIC_WINNERS: "leaderboard.periodic.winners",
} as const

export type AppEventKey = (typeof APP_EVENTS)[keyof typeof APP_EVENTS]

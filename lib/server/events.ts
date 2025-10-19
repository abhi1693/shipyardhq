import { randomUUID } from "crypto"

import prisma from "@/lib/prisma"
import { enqueueEvent } from "@/lib/server/events/queueClient"
import type { RedemptionStatus, Prisma } from "@/lib/vendor/prisma/client"
import type { DeviceCategory, ProductTrafficPayload } from "@/types/analytics"
import { IS_PROD } from "@/lib/constants"

type HandlerMode = "sync" | "async"

type RegisteredHandler<K extends keyof AppEvents> = {
  id: string
  mode: HandlerMode
  handler: Handler<K>
}

type ListenerRegistry = Map<string, Array<RegisteredHandler<keyof AppEvents>>>

const DEFAULT_HANDLER_MODE: HandlerMode = "async"
const LISTENERS: ListenerRegistry = new Map()

const DEFAULT_DEAD_LETTER_MESSAGE =
  "Event envelope moved to dead letter because enqueue failed"

export type ProductClickMetadata = {
  referrer?: string | null
  userAgent?: string | null
  device?: DeviceCategory | null
  browser?: string | null
  os?: string | null
  country?: string | null
  region?: string | null
  city?: string | null
  ipHash?: string | null
}

export type ProductCreatedEvent = { productId: string }
export type ProductUpdatedEvent = { productId: string }
export type ProductDeletedEvent = { productId: string }
export type ProductPublishedEvent = { productId: string }
export type ProductClickedEvent = {
  productId: string
  metadata?: ProductClickMetadata
}
export type BadgeAssignedEvent = {
  id: string
  productId: string
  badge: string
  expiresAt?: Date | null
}
export type BadgeRemovedEvent = { id: string; productId: string; badge: string }
export type ProductUpvotedEvent = {
  productId: string
  userId: string
  upvoteId: string
  occurredAt: Date
}
export type ProductDownvotedEvent = {
  productId: string
  userId: string
  upvoteId: string
  occurredAt: Date
}
export type ProductReviewCreatedEvent = {
  reviewId: string
  productId: string
  productOwnerId?: string | null
  userId: string
  rating: number
  messageLength: number
  createdAt: Date
  updatedAt: Date
}
export type ProductTrafficRecordedEvent = ProductTrafficPayload

export type LeaderboardMonthlyWinnersEvent = {
  monthKey: string
  monthLabel: string
  leaderboardUrl: string
  winners: Array<{
    productId: string
    rank: number
    name: string
    slug: string
    twitterHandle?: string | null
  }>
}

export type RewardsAwardedEvent = {
  transactionId: string
  userId: string
  rewardAmount: number
  ruleKey: string
  ruleName: string
  balanceAfter: number
  createdAt: Date
  metadata?: unknown
  sourceType?: string | null
  sourceId?: string | null
  targetType?: string | null
  targetId?: string | null
  productId?: string | null
}

export type RewardsRedeemedEvent = {
  transactionId: string
  userId: string
  featureKey: string
  redemptionId: string
  cost: number
  balanceAfter: number
  status: RedemptionStatus
  createdAt: Date
  productId?: string | null
  autoActivated: boolean
  placementScheduleId?: string | null
}

export type RewardsAdjustedEvent = {
  transactionId: string
  userId: string
  amount: number
  balanceAfter: number
  createdAt: Date
  actorUserId?: string | null
  metadata?: unknown
  notes?: string | null
}

export type RewardsRefundedEvent = {
  transactionId: string
  redemptionId: string
  userId: string
  featureKey: string | null
  amount: number
  balanceAfter: number
  createdAt: Date
  fullyRefunded: boolean
  productId?: string | null
  actorUserId?: string | null
}

export type RewardsDailyLoginEvent = {
  userId: string
  eventId: string
  dayKey: string
  awardedAt: string
}

type AppEvents = {
  "product.created": ProductCreatedEvent
  "product.updated": ProductUpdatedEvent
  "product.published": ProductPublishedEvent
  "product.deleted": ProductDeletedEvent
  "product.clicked": ProductClickedEvent
  "product.upvoted": ProductUpvotedEvent
  "product.downvoted": ProductDownvotedEvent
  "product.reviewed": ProductReviewCreatedEvent
  "badge.assigned": BadgeAssignedEvent
  "badge.removed": BadgeRemovedEvent
  "analytics.product-traffic": ProductTrafficRecordedEvent
  "leaderboard.monthly.winners": LeaderboardMonthlyWinnersEvent
  "rewards.awarded": RewardsAwardedEvent
  "rewards.redeemed": RewardsRedeemedEvent
  "rewards.adjusted": RewardsAdjustedEvent
  "rewards.refunded": RewardsRefundedEvent
  "rewards.daily-login": RewardsDailyLoginEvent
}

type Handler<K extends keyof AppEvents> = (
  payload: AppEvents[K],
) => void | Promise<void>

type RegisterEventHandlerConfig<K extends keyof AppEvents> = {
  event: K
  id: string
  handler: Handler<K>
  mode?: HandlerMode
}

export function registerEventHandler<K extends keyof AppEvents>({
  event,
  handler,
  id,
  mode = DEFAULT_HANDLER_MODE,
}: RegisterEventHandlerConfig<K>): () => void {
  if (!id) {
    throw new Error("Event handler registration requires a stable id")
  }

  const key = String(event)
  const entry: RegisteredHandler<K> = { handler, id, mode }
  const existing = LISTENERS.get(
    key,
  ) as Array<RegisteredHandler<K>> | undefined

  if (existing?.some((item) => item.id === id)) {
    throw new Error(`Duplicate handler id "${id}" registered for event "${key}"`)
  }

  LISTENERS.set(
    key,
    [...(existing ?? []), entry] as Array<RegisteredHandler<keyof AppEvents>>,
  )

  return () => {
    const current = LISTENERS.get(key)
    if (!current) return
    LISTENERS.set(
      key,
      current.filter((item) => item.id !== id),
    )
  }
}

export async function dispatchEvent<K extends keyof AppEvents>(
  event: K,
  payload: AppEvents[K],
): Promise<void> {
  const key = String(event)
  const handlers = LISTENERS.get(key) ?? []

  const syncHandlers = handlers.filter(
    (item) => item.mode === "sync",
  ) as Array<RegisteredHandler<K>>
  const asyncHandlers = handlers.filter(
    (item) => item.mode === "async",
  ) as Array<RegisteredHandler<K>>

  for (const { handler, id: handlerId } of syncHandlers) {
    console.debug("[events] sync handler start", { event: key, handlerId })
    await handler(payload)
    console.debug("[events] sync handler end", { event: key, handlerId })
  }

  if (asyncHandlers.length === 0) {
    console.debug("[events] no async handlers registered", { event: key })
    return
  }

  const now = new Date()
  const handlerIds = asyncHandlers.map((item) => item.id)
  const serializedPayload = toJsonValue(payload)

  const envelopeId = randomUUID()

  await prisma.$executeRaw`
    INSERT INTO "EventEnvelope" (
      "id",
      "event",
      "payload",
      "asyncHandlers",
      "pendingHandlers",
      "status",
      "attempts",
      "enqueuedAt",
      "processingStarted",
      "processedAt",
      "nextRunAt",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      ${envelopeId},
      ${key},
      ${serializedPayload},
      ${handlerIds},
      ${handlerIds},
      ${"pending"}::"EventEnvelopeStatus",
      ${0},
      ${now},
      ${null},
      ${null},
      ${now},
      ${now},
      ${now}
    )
  `

  console.debug("[events] async envelope created", {
    event: key,
    envelopeId,
    handlers: handlerIds,
  })

  void enqueueEvent(envelopeId).catch(async (error) => {
    console.error("[events] enqueue failed", {
      event: key,
      envelopeId,
      error,
    })
    const failureTimestamp = new Date()
    await prisma.$executeRaw`
      UPDATE "EventEnvelope"
      SET "status" = ${"dead_letter"}::"EventEnvelopeStatus",
          "lastError" =
            ${
              error instanceof Error
                ? error.message
                : DEFAULT_DEAD_LETTER_MESSAGE
            },
          "updatedAt" = ${failureTimestamp}
      WHERE "id" = ${envelopeId}
    `
    if (!IS_PROD) {
      console.warn("[events] falling back to inline async execution", {
        event: key,
        envelopeId,
        asyncHandlers: handlerIds,
      })
      for (const { handler, id: handlerId } of asyncHandlers) {
        try {
          console.debug("[events] fallback async handler start", {
            event: key,
            handlerId,
          })
          await handler(payload)
          console.debug("[events] fallback async handler end", {
            event: key,
            handlerId,
          })
        } catch (handlerError) {
          console.error("[events] fallback handler error", {
            event: key,
            handlerId,
            error: handlerError,
          })
        }
      }
      const completionTimestamp = new Date()
      await prisma.$executeRaw`
        UPDATE "EventEnvelope"
        SET "status" = ${"completed"}::"EventEnvelopeStatus",
            "pendingHandlers" = ${[] as string[]},
            "lastError" = NULL,
            "processedAt" = ${completionTimestamp},
            "updatedAt" = ${completionTimestamp}
        WHERE "id" = ${envelopeId}
      `
    }
  })
}

export function resolveRegisteredHandler(
  event: string,
  handlerId: string,
): RegisteredHandler<keyof AppEvents> | undefined {
  const handlers = LISTENERS.get(event)
  return handlers?.find((item) => item.id === handlerId)
}

export function listRegisteredAsyncHandlers(event: string): string[] {
  return (LISTENERS.get(event) ?? [])
    .filter((item) => item.mode === "async")
    .map((item) => item.id)
}

export function resetEventRegistryForTesting(): void {
  LISTENERS.clear()
}

function toJsonValue(payload: unknown): Prisma.JsonValue {
  return JSON.parse(JSON.stringify(payload)) as Prisma.JsonValue
}

export type DispatchEventAsyncOptions = {
  context?: Record<string, unknown>
  onError?: (error: unknown) => void
}

export function dispatchEventAsync<K extends keyof AppEvents>(
  event: K,
  payload: AppEvents[K],
  options: DispatchEventAsyncOptions = {},
): void {
  const { context, onError } = options
  void dispatchEvent(event, payload).catch((error) => {
    console.error("[events] async dispatch failed", {
      event: String(event),
      context,
      error,
    })
    onError?.(error)
  })
}

export type { AppEvents, HandlerMode, Handler, RegisterEventHandlerConfig }

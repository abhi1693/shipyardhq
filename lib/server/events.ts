import { randomUUID } from "crypto"

import prisma from "@/lib/prisma"
import { enqueueEvent } from "@/lib/server/events/queueClient"
import { APP_EVENTS } from "@/lib/server/events/constants"
import {
  DEFAULT_EVENT_QUEUE,
  type EventQueueName,
} from "@/lib/server/events/queues"
import type { RedemptionStatus, Prisma } from "@/lib/vendor/prisma/client"
import type { DeviceCategory, ProductTrafficPayload } from "@/types/analytics"
import { IS_PROD } from "@/lib/constants"

type HandlerMode = "sync" | "async"

type RegisteredHandler<K extends keyof AppEvents> = {
  id: string
  mode: HandlerMode
  handler: Handler<K>
  queue: EventQueueName
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
export type ProductClaimedEvent = {
  productId: string
  slug: string
  claimedByUserId: string
  previousOwnerId: string | null
  claimedAt: Date
}
export type ProductClickedEvent = {
  productId: string
  metadata?: ProductClickMetadata
}
export type ProductViewedEvent = {
  productId: string
  viewerUserId: string
  rewardEventId: string
  productSlug?: string
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

export type ProductUpdatePublishedEvent = {
  productId: string
  productSlug: string | null
  productName: string | null
  productOwnerId: string | null
  updateId: string
  updateTitle: string
  updateSummary: string | null
  updatePublishedAt: Date
  authorId: string | null
}

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
  [APP_EVENTS.PRODUCT_CREATED]: ProductCreatedEvent
  [APP_EVENTS.PRODUCT_UPDATED]: ProductUpdatedEvent
  [APP_EVENTS.PRODUCT_CLAIMED]: ProductClaimedEvent
  [APP_EVENTS.PRODUCT_PUBLISHED]: ProductPublishedEvent
  [APP_EVENTS.PRODUCT_DELETED]: ProductDeletedEvent
  [APP_EVENTS.PRODUCT_CLICKED]: ProductClickedEvent
  [APP_EVENTS.PRODUCT_VIEWED]: ProductViewedEvent
  [APP_EVENTS.PRODUCT_UPVOTED]: ProductUpvotedEvent
  [APP_EVENTS.PRODUCT_DOWNVOTED]: ProductDownvotedEvent
  [APP_EVENTS.PRODUCT_REVIEWED]: ProductReviewCreatedEvent
  [APP_EVENTS.PRODUCT_UPDATE_PUBLISHED]: ProductUpdatePublishedEvent
  [APP_EVENTS.BADGE_ASSIGNED]: BadgeAssignedEvent
  [APP_EVENTS.BADGE_REMOVED]: BadgeRemovedEvent
  [APP_EVENTS.ANALYTICS_PRODUCT_TRAFFIC]: ProductTrafficRecordedEvent
  [APP_EVENTS.LEADERBOARD_MONTHLY_WINNERS]: LeaderboardMonthlyWinnersEvent
  [APP_EVENTS.REWARDS_AWARDED]: RewardsAwardedEvent
  [APP_EVENTS.REWARDS_REDEEMED]: RewardsRedeemedEvent
  [APP_EVENTS.REWARDS_ADJUSTED]: RewardsAdjustedEvent
  [APP_EVENTS.REWARDS_REFUNDED]: RewardsRefundedEvent
  [APP_EVENTS.REWARDS_DAILY_LOGIN]: RewardsDailyLoginEvent
}

type Handler<K extends keyof AppEvents> = (
  payload: AppEvents[K],
) => void | Promise<void>

type RegisterEventHandlerConfig<K extends keyof AppEvents> = {
  event: K
  id: string
  handler: Handler<K>
  mode?: HandlerMode
  queue?: EventQueueName
}

export function registerEventHandler<K extends keyof AppEvents>({
  event,
  handler,
  id,
  mode = DEFAULT_HANDLER_MODE,
  queue,
}: RegisterEventHandlerConfig<K>): () => void {
  if (!id) {
    throw new Error("Event handler registration requires a stable id")
  }

  const key = String(event)
  const resolvedQueue =
    mode === "async" ? (queue ?? DEFAULT_EVENT_QUEUE) : DEFAULT_EVENT_QUEUE
  const entry: RegisteredHandler<K> = {
    handler,
    id,
    mode,
    queue: resolvedQueue,
  }
  const existing = LISTENERS.get(key) as Array<RegisteredHandler<K>> | undefined

  if (existing?.some((item) => item.id === id)) {
    throw new Error(
      `Duplicate handler id "${id}" registered for event "${key}"`,
    )
  }

  LISTENERS.set(key, [...(existing ?? []), entry] as Array<
    RegisteredHandler<keyof AppEvents>
  >)

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

  const syncHandlers = handlers.filter((item) => item.mode === "sync") as Array<
    RegisteredHandler<K>
  >
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

  const asyncHandlersByQueue = asyncHandlers.reduce<
    Map<EventQueueName, Array<RegisteredHandler<K>>>
  >((map, handlerRegistration) => {
    const handlers = map.get(handlerRegistration.queue)
    if (handlers) {
      handlers.push(handlerRegistration)
    } else {
      map.set(handlerRegistration.queue, [handlerRegistration])
    }
    return map
  }, new Map())

  const now = new Date()
  const serializedPayload = toJsonValue(payload)

  for (const [queueName, handlers] of asyncHandlersByQueue) {
    const handlerIds = handlers.map((item) => item.id)
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
        "updatedAt",
        "queue"
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
        ${now},
        ${queueName}
      )
    `

    console.debug("[events] async envelope created", {
      event: key,
      envelopeId,
      queue: queueName,
      handlers: handlerIds,
    })

    void enqueueEvent(envelopeId).catch(async (error) => {
      console.error("[events] enqueue failed", {
        event: key,
        envelopeId,
        queue: queueName,
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
          queue: queueName,
          asyncHandlers: handlerIds,
        })
        for (const { handler, id: handlerId } of handlers) {
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
export {
  DEFAULT_EVENT_QUEUE,
  EVENT_QUEUE_DEFINITIONS,
  EVENT_QUEUE_NAMES,
  type EventQueueName,
} from "@/lib/server/events/queues"

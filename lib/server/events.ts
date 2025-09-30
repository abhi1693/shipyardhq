// Simple in-memory event bus with typed events
// Scales to more events and listeners as needed

import type { DeviceCategory, ProductTrafficPayload } from "@/types/analytics"

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
export type ProductUpvotedEvent = { productId: string; userId: string }
export type ProductDownvotedEvent = { productId: string; userId: string }
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

type AppEvents = {
  "product.created": ProductCreatedEvent
  "product.updated": ProductUpdatedEvent
  "product.published": ProductPublishedEvent
  "product.deleted": ProductDeletedEvent
  "product.clicked": ProductClickedEvent
  "product.upvoted": ProductUpvotedEvent
  "product.downvoted": ProductDownvotedEvent
  "badge.assigned": BadgeAssignedEvent
  "badge.removed": BadgeRemovedEvent
  "analytics.product-traffic": ProductTrafficRecordedEvent
  "leaderboard.monthly.winners": LeaderboardMonthlyWinnersEvent
}

type Handler<K extends keyof AppEvents> = (
  payload: AppEvents[K],
) => void | Promise<void>

type Listener = (payload: unknown) => void | Promise<void>

// Internal listener registry
const listeners: Map<string, Set<Listener>> = new Map()

export function on<K extends keyof AppEvents>(
  event: K,
  handler: Handler<K>,
): () => void {
  const key = String(event)
  const set = listeners.get(key) ?? new Set<Listener>()
  set.add(handler as unknown as Listener)
  listeners.set(key, set)
  return () => set.delete(handler as unknown as Listener)
}

export async function publish<K extends keyof AppEvents>(
  event: K,
  payload: AppEvents[K],
): Promise<void> {
  const key = String(event)
  const set = listeners.get(key)
  if (!set || set.size === 0) return
  const calls = Array.from(set).map(async (fn) => {
    try {
      await (fn as unknown as Handler<K>)(payload)
    } catch (err) {
      console.error(`[events] handler error for ${key}:`, err)
    }
  })
  await Promise.all(calls)
}

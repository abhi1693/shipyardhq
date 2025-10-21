import prisma from "@/lib/prisma"
import { revalidateTag } from "next/cache"
import { cached, DEFAULT_TTL, TAGS } from "@/lib/cache"
import type { NotificationType, Prisma } from "@/lib/vendor/prisma/client"
import type {
  NotificationItem,
  NotificationListResult,
  NotificationMetadata,
} from "@/types/notifications"

const DEFAULT_LIST_LIMIT = 20
const MAX_LIST_LIMIT = 50
const NOTIFICATIONS_CACHE_KEY = "notifications:list"

type ResolvedListOptions = {
  limit: number
  cursor?: string | null
}

export type CreateNotificationInput = {
  userId: string
  type: NotificationType
  message: string
  metadata?: Prisma.InputJsonValue | null
}

export async function createNotification(input: CreateNotificationInput) {
  const { userId, type, message, metadata } = input
  if (!userId) throw new Error("Notification userId is required")
  if (!type) throw new Error("Notification type is required")
  const trimmedMessage = message.trim()
  if (!trimmedMessage) {
    throw new Error("Notification message is required")
  }

  const notification = await prisma.notification.create({
    data: {
      userId,
      type,
      message: trimmedMessage,
      metadata: metadata ?? undefined,
    },
    select: {
      id: true,
      type: true,
      message: true,
      metadata: true,
      readAt: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  invalidateNotificationCache(userId)

  return notification
}

export type ListNotificationsOptions = {
  limit?: number
  cursor?: string | null
}

export async function listNotificationsForUser(
  userId: string,
  options: ListNotificationsOptions = {},
): Promise<NotificationListResult> {
  if (!userId) {
    throw new Error("listNotificationsForUser requires a userId")
  }

  const resolved = resolveListOptions(options)
  return queryNotifications(userId, resolved)
}

const fetchNotificationsCached = cached(
  async (
    userId: string,
    options: ResolvedListOptions,
  ): Promise<NotificationListResult> => queryNotifications(userId, options),
  NOTIFICATIONS_CACHE_KEY,
  {
    ttl: DEFAULT_TTL.slow,
    tags: ([userId]) => [
      TAGS.notifications,
      TAGS.notificationsForUser(userId),
      TAGS.user(userId),
    ],
    keyParts: ([userId, options]) => [
      userId,
      String(options.limit),
      options.cursor ?? "",
    ],
  },
)

export async function listNotificationsForUserCached(
  userId: string,
  options: ListNotificationsOptions = {},
): Promise<NotificationListResult> {
  if (!userId) {
    throw new Error("listNotificationsForUserCached requires a userId")
  }

  const resolved = resolveListOptions(options)
  return fetchNotificationsCached(userId, resolved)
}

export async function markNotificationRead(
  userId: string,
  notificationId: string,
): Promise<boolean> {
  if (!userId || !notificationId) return false

  const result = await prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { readAt: new Date() },
  })

  if (result.count > 0) {
    invalidateNotificationCache(userId)
    return true
  }

  return false
}

export async function markAllNotificationsRead(
  userId: string,
): Promise<number> {
  if (!userId) return 0

  const result = await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  })

  if (result.count > 0) {
    invalidateNotificationCache(userId)
  }

  return result.count
}

function serializeNotification(notification: {
  id: string
  type: NotificationType
  message: string
  metadata: Prisma.JsonValue | null
  readAt: Date | null
  createdAt: Date
  updatedAt: Date
}): NotificationItem {
  return {
    id: notification.id,
    type: notification.type,
    message: notification.message,
    metadata: cloneJson(notification.metadata),
    readAt: notification.readAt ? notification.readAt.toISOString() : null,
    createdAt: notification.createdAt.toISOString(),
    updatedAt: notification.updatedAt.toISOString(),
  }
}

function cloneJson(value: Prisma.JsonValue | null): NotificationMetadata {
  if (value === null || value === undefined) {
    return null
  }

  try {
    return JSON.parse(JSON.stringify(value)) as Record<string, unknown>
  } catch (error) {
    console.error("[notifications] Failed to clone metadata", { error, value })
    return null
  }
}

function resolveListOptions(
  options: ListNotificationsOptions = {},
): ResolvedListOptions {
  const rawLimit = Number.isFinite(options.limit)
    ? Number(options.limit)
    : DEFAULT_LIST_LIMIT
  const limit = Math.max(1, Math.min(Math.trunc(rawLimit), MAX_LIST_LIMIT))

  const cursorValue = options.cursor
  const cursor =
    typeof cursorValue === "string" && cursorValue.length > 0
      ? cursorValue
      : null

  return { limit, cursor }
}

async function queryNotifications(
  userId: string,
  options: ResolvedListOptions,
): Promise<NotificationListResult> {
  const { limit, cursor } = options

  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    cursor: cursor ? { id: cursor } : undefined,
    skip: cursor ? 1 : 0,
    select: {
      id: true,
      type: true,
      message: true,
      metadata: true,
      readAt: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  const hasMore = notifications.length > limit
  const items = hasMore ? notifications.slice(0, limit) : notifications

  const unreadCount = await prisma.notification.count({
    where: { userId, readAt: null },
  })

  const serialized: NotificationItem[] = items.map(serializeNotification)

  return {
    notifications: serialized,
    unreadCount,
    nextCursor: hasMore ? items[items.length - 1].id : undefined,
  }
}

export function getNotificationCacheTag(userId: string): string {
  return TAGS.notificationsForUser(userId)
}

function invalidateNotificationCache(userId: string) {
  try {
    const baseTags = [
      getNotificationCacheTag(userId),
      TAGS.notifications,
      TAGS.user(userId),
    ]

    for (const tag of baseTags) {
      revalidateTag(tag)
    }
  } catch (error) {
    console.error("[notifications] Failed to revalidate cache", {
      error,
      userId,
    })
  }
}

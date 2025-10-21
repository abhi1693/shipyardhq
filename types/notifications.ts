import type { NotificationType } from "@/lib/vendor/prisma/client"

export type NotificationMetadata =
  | Record<string, unknown>
  | Array<unknown>
  | string
  | number
  | boolean
  | null

export type NotificationItem = {
  id: string
  type: NotificationType
  message: string
  metadata: NotificationMetadata
  readAt: string | null
  createdAt: string
  updatedAt: string
}

export type NotificationListResult = {
  notifications: NotificationItem[]
  unreadCount: number
  nextCursor?: string
}

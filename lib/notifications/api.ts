import type { NotificationListResult } from "@/types/notifications"

type FetchOptions = {
  limit?: number
  cursor?: string
}

export async function fetchNotifications(
  options: FetchOptions = {},
): Promise<NotificationListResult> {
  const params = new URLSearchParams()
  if (typeof options.limit === "number" && Number.isFinite(options.limit)) {
    params.set("limit", String(options.limit))
  }
  if (options.cursor) {
    params.set("cursor", options.cursor)
  }

  const path = params.size
    ? `/api/notifications?${params.toString()}`
    : "/api/notifications"

  const response = await fetch(path, {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error("Failed to fetch notifications")
  }

  return (await response.json()) as NotificationListResult
}

export async function markNotificationReadClient(
  notificationId: string,
): Promise<void> {
  const response = await fetch(`/api/notifications/${notificationId}/read`, {
    method: "PATCH",
    credentials: "same-origin",
  })

  if (!response.ok) {
    throw new Error("Failed to mark notification read")
  }
}

export async function markAllNotificationsReadClient(): Promise<void> {
  const response = await fetch("/api/notifications/read-all", {
    method: "PATCH",
    credentials: "same-origin",
  })

  if (!response.ok) {
    throw new Error("Failed to mark all notifications read")
  }
}

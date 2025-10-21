"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Bell, Check, Loader2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

import { Button } from "@/components/atoms/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/atoms/dropdown-menu"
import { Badge } from "@/components/atoms/badge"
import {
  fetchNotifications,
  markAllNotificationsReadClient,
  markNotificationReadClient,
} from "@/lib/notifications/api"
import type {
  NotificationItem,
  NotificationListResult,
  NotificationMetadata,
} from "@/types/notifications"
import { MEMBER_NOTIFICATIONS_PATH } from "@/lib/routes"
import { cn } from "@/lib/utils"

const PREVIEW_LIMIT = 6

export default function NotificationBell() {
  const [state, setState] =
    useState<NotificationListResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [pendingIds, setPendingIds] = useState<Set<string>>(
    () => new Set(),
  )
  const [markingAll, setMarkingAll] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchNotifications({
        limit: PREVIEW_LIMIT,
      })
      setState(data)
    } catch (err) {
      console.error(
        "[notifications] failed to fetch bell notifications",
        err,
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const unreadCount = state?.unreadCount ?? 0
  const notifications = state?.notifications ?? []

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen)
      if (nextOpen) {
        void refresh()
      }
    },
    [refresh],
  )

  const handleMarkRead = useCallback(
    async (notificationId: string) => {
      setPendingIds((prev) => {
        const next = new Set(prev)
        next.add(notificationId)
        return next
      })

      setState((prev) => {
        if (!prev) return prev
        const index = prev.notifications.findIndex(
          (item) => item.id === notificationId,
        )
        if (index === -1) return prev
        const current = prev.notifications[index]
        if (current.readAt) return prev

        const updated: NotificationItem = {
          ...current,
          readAt: new Date().toISOString(),
        }
        const nextNotifications = [...prev.notifications]
        nextNotifications[index] = updated

        return {
          notifications: nextNotifications,
          unreadCount:
            prev.unreadCount > 0
              ? prev.unreadCount - 1
              : prev.unreadCount,
          nextCursor: prev.nextCursor,
        }
      })

      try {
        await markNotificationReadClient(notificationId)
      } catch (err) {
        console.error(
          "[notifications] failed to mark bell notification read",
          { err, notificationId },
        )
        await refresh()
      } finally {
        setPendingIds((prev) => {
          const next = new Set(prev)
          next.delete(notificationId)
          return next
        })
      }
    },
    [refresh],
  )

  const handleMarkAll = useCallback(async () => {
    if (!state || state.unreadCount === 0) return
    setMarkingAll(true)
    const nowIso = new Date().toISOString()
    setState((prev) => {
      if (!prev) return prev
      return {
        notifications: prev.notifications.map((item) =>
          item.readAt ? item : { ...item, readAt: nowIso },
        ),
        unreadCount: 0,
        nextCursor: prev.nextCursor,
      }
    })

    try {
      await markAllNotificationsReadClient()
    } catch (err) {
      console.error(
        "[notifications] failed to mark all from bell",
        err,
      )
      await refresh()
    } finally {
      setMarkingAll(false)
    }
  }, [refresh, state])

  const hasItems = notifications.length > 0

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-9 w-9 rounded-full"
          aria-label={
            unreadCount
              ? `${unreadCount} unread notifications`
              : "Notifications"
          }
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 ? (
            <span className="absolute right-0 top-0 flex min-h-[1.1rem] min-w-[1.1rem] items-center justify-center rounded-full bg-sky-500 px-1 text-xs font-medium text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-80 overflow-hidden p-0"
        forceMount
      >
        <div className="flex items-center justify-between px-3 py-2">
          <div className="text-sm font-medium text-slate-900">
            Notifications
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={handleMarkAll}
            disabled={markingAll || unreadCount === 0}
          >
            {markingAll ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="mr-1.5 h-3.5 w-3.5" />
            )}
            Mark all
          </Button>
        </div>
        <DropdownMenuSeparator />
        <div className="max-h-80 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center px-3 py-6">
              <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
            </div>
          ) : hasItems ? (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={cn(
                  "border-b border-slate-100 px-3 py-3 last:border-b-0",
                  notification.readAt
                    ? "bg-white"
                    : "bg-sky-50/70",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-900">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatRelative(notification.createdAt)}
                    </p>
                    {renderMetadataPreview(notification.metadata)}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 flex-shrink-0"
                    onClick={() =>
                      handleMarkRead(notification.id)
                    }
                    disabled={
                      !!notification.readAt ||
                      pendingIds.has(notification.id)
                    }
                    aria-label="Mark notification read"
                  >
                    {pendingIds.has(notification.id) ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
                {resolveHref(notification.metadata) ? (
                  <div className="mt-2">
                    <Link
                      href={
                        resolveHref(notification.metadata) ?? "#"
                      }
                      className="text-xs font-medium text-sky-600 hover:underline"
                    >
                      View details
                    </Link>
                  </div>
                ) : null}
              </div>
            ))
          ) : (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              You're all caught up!
            </div>
          )}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={MEMBER_NOTIFICATIONS_PATH}>
            View all notifications
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function renderMetadataPreview(metadata: NotificationMetadata) {
  if (!metadata || typeof metadata !== "object") return null
  if (Array.isArray(metadata)) return null

  const record = metadata as Record<string, unknown>
  const parts: string[] = []
  if (typeof record.productName === "string") {
    parts.push(record.productName)
  }
  if (typeof record.reviewerName === "string") {
    parts.push(`Reviewer: ${record.reviewerName}`)
  }
  if (typeof record.rewardAmount === "number") {
    parts.push(
      `${record.rewardAmount.toLocaleString("en-US")} pts`,
    )
  }

  if (!parts.length) return null

  return (
    <Badge
      variant="secondary"
      className="h-5 gap-1 rounded-full px-2 text-[11px]"
    >
      {parts.join(" • ")}
    </Badge>
  )
}

function resolveHref(metadata: NotificationMetadata): string | null {
  if (!metadata || typeof metadata !== "object") {
    return null
  }

  if (Array.isArray(metadata)) return null

  const record = metadata as Record<string, unknown>
  const href = record.href
  if (typeof href === "string" && href.trim()) {
    return href
  }

  const publicHref = record.publicHref
  if (typeof publicHref === "string" && publicHref.trim()) {
    return publicHref
  }

  return null
}

function formatRelative(value: string) {
  return formatDistanceToNow(new Date(value), { addSuffix: true })
}

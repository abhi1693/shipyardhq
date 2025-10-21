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
import {
  fetchNotifications,
  markAllNotificationsReadClient,
  markNotificationReadClient,
} from "@/lib/notifications/api"
import type {
  NotificationItem,
  NotificationListResult,
} from "@/types/notifications"
import {
  buildNotificationPresentation,
} from "@/lib/notifications/format"
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
              <NotificationPreviewItem
                key={notification.id}
                notification={notification}
                onMarkRead={handleMarkRead}
                isPending={pendingIds.has(notification.id)}
              />
            ))
          ) : (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              You&#39;re all caught up!
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

function formatRelative(value: string) {
  return formatDistanceToNow(new Date(value), { addSuffix: true })
}

function NotificationPreviewItem({
  notification,
  onMarkRead,
  isPending,
}: {
  notification: NotificationItem
  onMarkRead: (notificationId: string) => Promise<void>
  isPending: boolean
}) {
  const presentation = buildNotificationPresentation(notification)
  const isUnread = !notification.readAt
  const href = presentation.primaryHref

  const handleClick = () => {
    if (!isUnread || isPending) return
    void onMarkRead(notification.id)
  }

  const content = (
    <div className="space-y-1">
      <p className="text-sm font-medium text-slate-900">
        {notification.message}
      </p>
      <p className="text-xs text-muted-foreground">
        {formatRelative(notification.createdAt)}
      </p>
    </div>
  )

  return (
    <div className={cn("border-b border-slate-100 last:border-b-0")}
    >
      {href ? (
        <Link
          href={href}
          onClick={handleClick}
          className={cn(
            "block rounded-md border px-3 py-3 transition hover:border-sky-300 hover:bg-sky-50/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50",
            isUnread ? "border-sky-200/70 bg-sky-50" : "border-slate-200/70 bg-white",
          )}
        >
          {content}
        </Link>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          disabled={isPending}
          className={cn(
            "w-full rounded-md border px-3 py-3 text-left transition hover:border-sky-300 hover:bg-sky-50/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50",
            isUnread ? "border-sky-200/70 bg-sky-50" : "border-slate-200/70 bg-white",
          )}
        >
          {content}
        </button>
      )}
    </div>
  )
}

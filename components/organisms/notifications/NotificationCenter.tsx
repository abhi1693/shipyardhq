"use client"

import { useCallback, useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { Check, Loader2, RefreshCcw } from "lucide-react"

import { Button } from "@/components/atoms/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"
import { Badge } from "@/components/atoms/badge"
import { cn } from "@/lib/utils"
import {
  fetchNotifications,
  markAllNotificationsReadClient,
  markNotificationReadClient,
} from "@/lib/notifications/api"
import type {
  NotificationItem,
  NotificationListResult,
} from "@/types/notifications"
import { buildNotificationPresentation } from "@/lib/notifications/format"

const FETCH_LIMIT = 25

type NotificationCenterProps = {
  initialData: NotificationListResult
}

export default function NotificationCenter({
  initialData,
}: NotificationCenterProps) {
  const [state, setState] =
    useState<NotificationListResult>(initialData)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingIds, setPendingIds] = useState<Set<string>>(
    () => new Set(),
  )
  const [markingAll, startMarkAllTransition] = useTransition()

  const hasNotifications = state.notifications.length > 0
  const unreadCount = state.unreadCount

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchNotifications({
        limit: FETCH_LIMIT,
      })
      setState(data)
    } catch (err) {
      console.error(
        "[notifications] failed to refresh notifications",
        err,
      )
      setError("Unable to refresh notifications right now.")
    } finally {
      setLoading(false)
    }
  }, [])

  const handleLoadMore = useCallback(async () => {
    if (!state.nextCursor) return
    setLoading(true)
    setError(null)
    try {
      const data = await fetchNotifications({
        limit: FETCH_LIMIT,
        cursor: state.nextCursor,
      })
      setState((prev) => {
        const existingIds = new Set(
          prev.notifications.map((item) => item.id),
        )
        const merged = [
          ...prev.notifications,
          ...data.notifications.filter(
            (item) => !existingIds.has(item.id),
          ),
        ]
        return {
          notifications: merged,
          unreadCount: data.unreadCount,
          nextCursor: data.nextCursor,
        }
      })
    } catch (err) {
      console.error(
        "[notifications] failed to load more notifications",
        err,
      )
      setError("Unable to load more notifications.")
    } finally {
      setLoading(false)
    }
  }, [state.nextCursor])

  const handleMarkRead = useCallback(
    async (notificationId: string) => {
      setPendingIds((prev) => {
        const next = new Set(prev)
        next.add(notificationId)
        return next
      })

      setState((prev) => {
        const index = prev.notifications.findIndex(
          (item) => item.id === notificationId,
        )
        if (index === -1) return prev

        const notification = prev.notifications[index]
        if (notification.readAt) return prev

        const updated: NotificationItem = {
          ...notification,
          readAt: new Date().toISOString(),
        }
        const nextNotifications = [...prev.notifications]
        nextNotifications[index] = updated

        return {
          ...prev,
          notifications: nextNotifications,
          unreadCount:
            prev.unreadCount > 0
              ? prev.unreadCount - 1
              : prev.unreadCount,
        }
      })

      try {
        await markNotificationReadClient(notificationId)
      } catch (err) {
        console.error(
          "[notifications] failed to mark notification read",
          { err, notificationId },
        )
        setError("Unable to update notification status.")
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
    if (!unreadCount) return

    startMarkAllTransition(async () => {
      const nowIso = new Date().toISOString()
      setState((prev) => ({
        notifications: prev.notifications.map((item) =>
          item.readAt ? item : { ...item, readAt: nowIso },
        ),
        unreadCount: 0,
        nextCursor: prev.nextCursor,
      }))

      try {
        await markAllNotificationsReadClient()
      } catch (err) {
        console.error(
          "[notifications] failed to mark all read",
          err,
        )
        setError("Unable to mark notifications as read.")
        await refresh()
      }
    })
  }, [refresh, unreadCount])

  const headerDescription = useMemo(() => {
    if (loading) return "Refreshing notifications..."
    if (unreadCount === 0) return "You're all caught up."
    if (unreadCount === 1) return "You have 1 unread notification."
    return `You have ${unreadCount} unread notifications.`
  }, [loading, unreadCount])

  return (
    <Card className="border-slate-200/80 shadow-sm">
      <CardHeader className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <CardTitle className="text-2xl font-semibold">
            Notification Center
          </CardTitle>
          <CardDescription>{headerDescription}</CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleMarkAll}
            disabled={markingAll || unreadCount === 0}
          >
            {markingAll ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-2 h-4 w-4" />
            )}
            Mark all as read
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <div
            role="alert"
            className="rounded-md border border-rose-200/80 bg-rose-50 px-3 py-2 text-sm text-rose-700"
          >
            {error}
          </div>
        ) : null}
        {hasNotifications ? (
          <ul className="space-y-3">
            {state.notifications.map((notification) => (
              <NotificationRow
                key={notification.id}
                notification={notification}
                onMarkRead={handleMarkRead}
                isPending={pendingIds.has(notification.id)}
              />
            ))}
          </ul>
        ) : (
          <EmptyState />
        )}

        {state.nextCursor ? (
          <div className="pt-1">
            <Button
              variant="ghost"
              onClick={handleLoadMore}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Load more
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

function NotificationRow({
  notification,
  onMarkRead,
  isPending,
}: {
  notification: NotificationItem
  onMarkRead: (notificationId: string) => Promise<void>
  isPending: boolean
}) {
  const isUnread = !notification.readAt
  const presentation = buildNotificationPresentation(notification)
  const href = presentation.primaryHref
  const createdAt = formatRelative(notification.createdAt)

  const handleClick = () => {
    if (!isUnread || isPending) return
    void onMarkRead(notification.id)
  }

  const content = (
    <div className="flex items-start gap-2">
      {isUnread ? (
        <span className="mt-1 inline-block h-2.5 w-2.5 rounded-full bg-sky-500" />
      ) : (
        <span className="mt-1 inline-block h-2.5 w-2.5 rounded-full bg-emerald-500/20" />
      )}
      <div>
        <p className="text-sm font-medium text-slate-900">
          {notification.message}
        </p>
        <p className="text-xs text-muted-foreground">{createdAt}</p>
      </div>
    </div>
  )

  return (
    <li>
      {href ? (
        <Link
          href={href}
          onClick={handleClick}
          className={cn(
            "block rounded-lg border px-4 py-3 transition hover:border-sky-300 hover:bg-sky-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50",
            isUnread
              ? "border-sky-200/70 bg-sky-50"
              : "border-slate-200/70 bg-white",
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
            "w-full rounded-lg border px-4 py-3 text-left transition hover:border-sky-300 hover:bg-sky-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50",
            isUnread
              ? "border-sky-200/70 bg-sky-50"
              : "border-slate-200/70 bg-white",
          )}
        >
          {content}
        </button>
      )}
    </li>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200/80 bg-white py-12 text-center">
      <Badge variant="secondary" className="mb-3">
        No notifications yet
      </Badge>
      <p className="max-w-sm text-sm text-muted-foreground">
        Product upvotes, reviews, rewards, and other important
        activity will show up here as soon as they happen.
      </p>
    </div>
  )
}

function formatRelative(value: string) {
  return formatDistanceToNow(new Date(value), { addSuffix: true })
}

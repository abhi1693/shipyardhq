"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import {
  Bell,
  Check,
  Gift,
  Info,
  Loader2,
  Megaphone,
  MessageSquare,
  Star,
} from "lucide-react"
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
import { buildNotificationPresentation } from "@/lib/notifications/format"
import { MEMBER_NOTIFICATIONS_PATH } from "@/lib/routes"
import { cn } from "@/lib/utils"

const PREVIEW_LIMIT = 6
const POLL_INTERVAL_MS = 20_000

export default function NotificationBell() {
  const [state, setState] = useState<NotificationListResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set())
  const [markingAll, setMarkingAll] = useState(false)
  const refreshInFlightRef = useRef(false)

  const refresh = useCallback(async () => {
    if (refreshInFlightRef.current) return
    refreshInFlightRef.current = true
    setLoading(true)
    try {
      const data = await fetchNotifications({
        limit: PREVIEW_LIMIT,
      })
      setState(data)
    } catch (err) {
      console.error("[notifications] failed to fetch bell notifications", err)
    } finally {
      setLoading(false)
      refreshInFlightRef.current = false
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refresh()
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [refresh])

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return
    }

    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== "visible") return
      void refresh()
    }, POLL_INTERVAL_MS)

    return () => {
      window.clearInterval(intervalId)
    }
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
            prev.unreadCount > 0 ? prev.unreadCount - 1 : prev.unreadCount,
          nextCursor: prev.nextCursor,
        }
      })

      try {
        await markNotificationReadClient(notificationId)
      } catch (err) {
        console.error("[notifications] failed to mark bell notification read", {
          err,
          notificationId,
        })
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
      console.error("[notifications] failed to mark all from bell", err)
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
          className="relative h-9 w-9 rounded-full border border-border/40 bg-white shadow-sm transition hover:border-border/70 hover:bg-white"
          aria-label={
            unreadCount
              ? `${unreadCount} unread notifications`
              : "Notifications"
          }
        >
          <Bell className="h-5 w-5 text-slate-600" />
          {unreadCount > 0 ? (
            <span className="absolute right-1 top-1 inline-flex h-2.5 w-2.5 items-center justify-center rounded-full bg-destructive" />
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        forceMount
        className="w-[21rem] overflow-hidden rounded-2xl border border-border/60 bg-white p-0 shadow-2xl"
      >
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              Notifications
            </p>
            <p className="text-xs text-muted-foreground">
              {unreadCount ? `${unreadCount} unread` : "You're all caught up"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 rounded-full border border-border/60 bg-white text-xs hover:bg-white"
            onClick={handleMarkAll}
            disabled={markingAll || unreadCount === 0}
          >
            {markingAll ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            Mark all
          </Button>
        </div>
        <DropdownMenuSeparator />
        <div className="max-h-80 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
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
            <div className="rounded-xl border border-dashed border-slate-200/80 bg-slate-50/70 px-4 py-6 text-center text-sm text-muted-foreground">
              Nothing new yet. Activity will appear here.
            </div>
          )}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link
            href={MEMBER_NOTIFICATIONS_PATH}
            className="flex w-full items-center justify-center gap-2 rounded-none px-4 py-3 text-sm font-semibold text-[color:var(--brand-1)] hover:text-[color:var(--brand-1)]"
          >
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

function getNotificationVisuals(type: NotificationItem["type"]) {
  switch (type) {
    case "product_upvote":
      return {
        icon: Star,
        bg: "bg-amber-100 text-amber-600",
      }
    case "product_review":
      return {
        icon: MessageSquare,
        bg: "bg-sky-100 text-sky-600",
      }
    case "reward_awarded":
      return {
        icon: Gift,
        bg: "bg-emerald-100 text-emerald-600",
      }
    case "product_update":
      return {
        icon: Megaphone,
        bg: "bg-indigo-100 text-indigo-600",
      }
    default:
      return {
        icon: Info,
        bg: "bg-slate-100 text-slate-600",
      }
  }
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
  const visuals = getNotificationVisuals(notification.type)
  const IconComponent = visuals.icon

  const handleClick = () => {
    if (!isUnread || isPending) return
    void onMarkRead(notification.id)
  }

  const content = (
    <div className="flex items-start gap-3">
      <span
        className={cn(
          "mt-0.5 inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl text-sm",
          visuals.bg,
        )}
      >
        <IconComponent className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-slate-900">
          {notification.message}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatRelative(notification.createdAt)}
        </p>
      </div>
    </div>
  )

  return (
    <div className={cn("border-b border-slate-100 last:border-b-0")}>
      {href ? (
        <Link
          href={href}
          onClick={handleClick}
          className={cn(
            "group block border-l-4 px-4 py-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50",
            isUnread
              ? "border-sky-400/80 bg-sky-50 hover:bg-sky-50/80"
              : "border-transparent bg-white hover:bg-slate-50",
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
            "w-full border-l-4 px-4 py-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50",
            isUnread
              ? "border-sky-400/80 bg-sky-50 hover:bg-sky-50/80"
              : "border-transparent bg-white hover:bg-slate-50",
          )}
        >
          {content}
        </button>
      )}
    </div>
  )
}

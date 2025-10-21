"use client"

import Link from "next/link"
import { ColumnDef } from "@tanstack/react-table"

import type { AdminNotificationRecord } from "@/actions/admin/notifications/actions"
import { Badge } from "@/components/atoms/badge"
import { buildNotificationPresentation } from "@/lib/notifications/format"
import { ADMIN_NOTIFICATION_TYPE_LABELS } from "@/lib/notifications/admin"
import { adminPath } from "@/lib/routes"
import { deriveFirstNameFromEmail } from "@/lib/email/personalization"
import { formatDate } from "@/lib/ui/formatters"

function resolveMemberName(notification: AdminNotificationRecord) {
  if (notification.userName && notification.userName.trim().length > 0) {
    return notification.userName
  }
  if (notification.userEmail) {
    return (
      deriveFirstNameFromEmail(notification.userEmail) ??
      notification.userEmail
    )
  }
  return "Unknown member"
}

export const columns: ColumnDef<AdminNotificationRecord>[] = [
  {
    id: "member",
    header: "Member",
    cell: ({ row }) => {
      const notification = row.original
      const displayName = resolveMemberName(notification)
      return (
        <div className="flex flex-col">
          <Link
            href={adminPath("users", notification.userId)}
            className="text-sm font-semibold text-slate-900 hover:underline"
          >
            {displayName}
          </Link>
          {notification.userEmail ? (
            <span className="text-xs text-muted-foreground">
              {notification.userEmail}
            </span>
          ) : null}
        </div>
      )
    },
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => (
      <Badge variant="secondary">
        {ADMIN_NOTIFICATION_TYPE_LABELS[row.original.type] ??
          row.original.type}
      </Badge>
    ),
  },
  {
    id: "message",
    header: "Message",
    cell: ({ row }) => (
      <span
        className="block max-w-xs truncate text-sm text-slate-700"
        title={row.original.message}
      >
        {row.original.message}
      </span>
    ),
  },
  {
    id: "link",
    header: "Link",
    cell: ({ row }) => {
      const presentation = buildNotificationPresentation(row.original)
      const href = presentation.primaryHref
      if (!href) {
        return <span className="text-xs text-muted-foreground">—</span>
      }

      const isExternal = href.startsWith("http")
      return (
        <Link
          href={href}
          target={isExternal ? "_blank" : undefined}
          rel={isExternal ? "noopener noreferrer" : undefined}
          className="text-sm font-medium text-sky-600 hover:underline"
        >
          Open
        </Link>
      )
    },
  },
  {
    id: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant={row.original.readAt ? "success" : "outline"}>
        {row.original.readAt ? "Read" : "Unread"}
      </Badge>
    ),
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }) => formatDate(row.original.createdAt),
  },
  {
    accessorKey: "updatedAt",
    header: "Updated",
    cell: ({ row }) => formatDate(row.original.updatedAt),
  },
]

"use client"

import { ColumnDef } from "@tanstack/react-table"
import { formatDistanceToNow } from "date-fns"
import Link from "next/link"
import { useFormStatus } from "react-dom"

import { Badge } from "@/components/atoms/badge"
import { Button } from "@/components/atoms/button"
import { adminPath } from "@/lib/routes"
import type { EventEnvelopeStatus } from "@/lib/vendor/prisma/client"
import { requeueEnvelopeAction } from "@/actions/admin/events/actions"

export type EventEnvelopeTableRow = {
  id: string
  event: string
  status: EventEnvelopeStatus
  attempts: number
  asyncHandlers: string[]
  pendingHandlers: string[]
  lastError: string | null
  enqueuedAt: string | Date
  updatedAt: string | Date
}

const statusVariantMap: Record<
  EventEnvelopeStatus,
  "default" | "secondary" | "outline" | "destructive" | "success"
> = {
  pending: "secondary",
  processing: "outline",
  retrying: "default",
  completed: "success",
  dead_letter: "destructive",
}

function formatRelative(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value)
  return formatDistanceToNow(date, { addSuffix: true })
}

export const columns: ColumnDef<EventEnvelopeTableRow>[] = [
  {
    accessorKey: "event",
    header: "Event",
    cell: ({ row }) => (
      <div className="flex flex-col gap-1">
        <Link
          href={adminPath("operations", "events", row.original.id)}
          className="font-medium text-slate-900 hover:underline"
        >
          {row.original.event}
        </Link>
        <span className="font-mono text-[11px] text-muted-foreground">
          {row.original.id}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant={statusVariantMap[row.original.status]}>
        {row.original.status.replace(/_/g, " ")}
      </Badge>
    ),
  },
  {
    accessorKey: "attempts",
    header: "Attempts",
    cell: ({ row }) => (
      <div className="space-y-1 text-sm text-slate-900">
        <div>{row.original.attempts}</div>
        <div className="text-xs text-muted-foreground">
          {row.original.pendingHandlers.length}/{row.original.asyncHandlers.length} pending
        </div>
      </div>
    ),
  },
  {
    accessorKey: "enqueuedAt",
    header: "Enqueued",
    cell: ({ row }) => formatRelative(row.original.enqueuedAt),
  },
  {
    accessorKey: "updatedAt",
    header: "Updated",
    cell: ({ row }) => formatRelative(row.original.updatedAt),
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const disableRequeue = row.original.status === "processing"

      return (
        <div className="flex items-center gap-2">
          <form action={requeueEnvelopeAction} className="inline">
            <input type="hidden" name="envelopeId" value={row.original.id} />
            <RequeueSubmit disabled={disableRequeue} />
          </form>
          <Button asChild size="sm" variant="destructive">
            <Link href={adminPath("operations", "events", row.original.id, "delete")}>
              Delete
            </Link>
          </Button>
        </div>
      )
    },
  },
]

function RequeueSubmit({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus()
  return (
    <Button
      size="sm"
      variant="secondary"
      type="submit"
      disabled={disabled || pending}
      title={disabled ? "Event is currently processing" : undefined}
    >
      {pending ? "Requeueing..." : "Requeue"}
    </Button>
  )
}

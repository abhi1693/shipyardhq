"use client"

import { Relationship } from "@/components/molecules/Relationship"
import { Badge } from "@/components/atoms/badge"
import type { MemberFeedback } from "@/lib/vendor/prisma/client"
import { ColumnDef } from "@tanstack/react-table"
import { formatDate, placeholder } from "@/lib/ui/formatters"

const STATUS_VARIANT: Record<MemberFeedback["status"], "success" | "secondary" | "outline"> = {
  received: "secondary",
  in_review: "outline",
  closed: "success",
}

export function UserFeedbackRelationship({
  rows,
}: {
  rows: MemberFeedback[]
}) {
  const columns: ColumnDef<MemberFeedback>[] = [
    {
      accessorKey: "subject",
      header: "Subject",
      cell: ({ row }) => row.original.subject || placeholder(),
    },
    {
      accessorKey: "message",
      header: "Message",
      cell: ({ row }) => (
        <p className="line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">
          {row.original.message}
        </p>
      ),
    },
    {
      accessorKey: "rating",
      header: "Rating",
      cell: ({ row }) =>
        typeof row.original.rating === "number"
          ? `${row.original.rating}/5`
          : placeholder(),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={STATUS_VARIANT[row.original.status]}>
          {row.original.status.replaceAll("_", " ")}
        </Badge>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Submitted",
      cell: ({ row }) => formatDate(row.original.createdAt),
    },
  ]

  return (
    <Relationship
      title="Feedback Entries"
      rows={rows}
      columns={columns}
      emptyMessage="No feedback submitted by this user."
    />
  )
}

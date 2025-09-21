"use client"

import { ColumnDef } from "@tanstack/react-table"
import type { AdminFeedbackEntry } from "@/actions/admin/feedback/actions"
import { formatDate } from "@/lib/ui/formatters"
import AdminFeedbackStatusSelect from "@/components/molecules/AdminFeedbackStatusSelect"
import AdminFeedbackNoteButton from "@/components/molecules/AdminFeedbackNoteButton"

export const columns: ColumnDef<AdminFeedbackEntry>[] = [
  {
    id: "member",
    header: "Member",
    accessorFn: (row) => row.user.email,
    cell: ({ row }) => {
      const { firstName, lastName, email } = row.original.user
      const name = `${firstName ?? ""} ${lastName ?? ""}`.trim()
      return (
        <div className="flex flex-col">
          <span className="text-sm font-medium text-foreground">
            {name.length ? name : email}
          </span>
          <span className="text-xs text-muted-foreground">{email}</span>
        </div>
      )
    },
  },
  {
    accessorKey: "subject",
    header: "Subject",
    cell: ({ row }) =>
      row.original.subject ? (
        <span className="text-sm text-foreground">{row.original.subject}</span>
      ) : (
        <span className="text-xs text-muted-foreground">(no subject)</span>
      ),
  },
  {
    id: "message",
    header: "Feedback",
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
      typeof row.original.rating === "number" ? (
        <span className="text-sm font-medium text-foreground">
          {row.original.rating}/5
        </span>
      ) : (
        <span className="text-xs text-muted-foreground">—</span>
      ),
  },
  {
    id: "adminNote",
    header: "Admin note",
    cell: ({ row }) => (
      <AdminFeedbackNoteButton
        feedbackId={row.original.id}
        note={row.original.adminNote}
      />
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <AdminFeedbackStatusSelect
        feedbackId={row.original.id}
        status={row.original.status}
      />
    ),
  },
  {
    accessorKey: "createdAt",
    header: "Submitted",
    cell: ({ row }) => formatDate(row.original.createdAt),
  },
]

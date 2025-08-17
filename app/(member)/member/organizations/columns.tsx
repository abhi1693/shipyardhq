"use client"

import { ColumnDef } from "@tanstack/react-table"
import { linkify, formatDistanceToNow } from "@/lib/ui/formatters"

export type MemberOrgRow = {
  id: string
  name: string
  url: string
  createdAt: string | Date
}

export const columns: ColumnDef<MemberOrgRow>[] = [
  {
    accessorKey: "name",
    header: "Organization",
    cell: ({ row }) =>
      linkify({
        label: row.original.name,
        href: `/member/organizations/${row.original.id}`,
      }),
  },
  {
    accessorKey: "url",
    header: "Domain",
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }) => formatDistanceToNow(new Date(row.original.createdAt)),
  },
]

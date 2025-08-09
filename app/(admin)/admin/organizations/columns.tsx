"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Organization } from "@prisma/client"
import { formatDate, linkify } from "@/lib/ui/formatters"

export const columns: ColumnDef<Organization>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) =>
      linkify({ label: row.original.name, href: `/admin/organizations/${row.original.id}` }),
  },
  {
    accessorKey: "url",
    header: "URL",
    cell: ({ row }) => linkify({ href: row.original.url, label: row.original.url, isExternal: true }),
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


"use client"

import { ColumnDef } from "@tanstack/react-table"
import { User } from "@prisma/client"
import { formatDate, linkify } from "@/lib/ui/formatters"

export const columns: ColumnDef<User>[] = [
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) =>
      linkify({
        label: row.original.email,
        href: `/admin/users/${row.original.id}`,
      }),
  },
  {
    id: "name",
    header: "Name",
    cell: ({ row }) => `${row.original.firstName} ${row.original.lastName}`,
  },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => row.original.role,
  },
  {
    accessorKey: "createdAt",
    header: "Created At",
    cell: ({ row }) => formatDate(row.original.createdAt),
  },
  {
    accessorKey: "updatedAt",
    header: "Updated At",
    cell: ({ row }) => formatDate(row.original.updatedAt),
  },
]

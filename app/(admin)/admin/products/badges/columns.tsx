"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@prisma/client"
import { formatDate, linkify } from "@/lib/ui/formatters"
import { Badge as BadgeUI } from "@/components/atoms/badge"

export const columns: ColumnDef<Badge>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) =>
      linkify({
        label: row.original.name,
        href: `/admin/products/badges/${row.original.id}`,
        subtext: row.original.slug,
      }),
  },
  {
    accessorKey: "color",
    header: "Color",
    cell: ({ row }) => (
      <BadgeUI
        className={`bg-${row.original.color}-100 text-${row.original.color}-800`}
      >
        {row.original.color}
      </BadgeUI>
    ),
  },
  {
    accessorKey: "icon",
    header: "Icon",
    cell: ({ row }) => row.original.icon || "-",
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => row.original.description || "-",
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

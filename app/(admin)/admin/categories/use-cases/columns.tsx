"use client"

import { ColumnDef } from "@tanstack/react-table"
import { UseCase } from "@prisma/client"
import { formatDate, slug, linkify } from "@/lib/ui/formatters"

export const columns: ColumnDef<UseCase>[] = [
  {
    accessorKey: "label",
    header: "Label",
    cell: ({ row }) =>
      linkify({
        label: row.original.label,
        href: `/admin/categories/use-cases/${row.original.id}`,
      }),
  },
  {
    accessorKey: "slug",
    header: "Slug",
    cell: ({ row }) => slug(row.original.slug),
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

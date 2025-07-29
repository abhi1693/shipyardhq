"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Category } from "@prisma/client"
import { formatDate, slug, linkify } from "@/lib/ui/formatters"

export const columns: ColumnDef<Category>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) =>
      linkify({
        label: row.original.name,
        href: `/admin/categories/${row.original.id}`,
      }),
  },
  {
    accessorKey: "slug",
    header: "Slug",
    cell: ({ row }) => slug(row.original.slug),
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => row.original.description,
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

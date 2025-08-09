"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Category } from "@prisma/client"
import { formatDate, slug, linkify } from "@/lib/ui/formatters"
import { CategoryIcon } from "@/components/molecules/CategoryIcons"

export const columns: ColumnDef<Category>[] = [
  {
    id: "icon",
    header: "Icon",
    cell: ({ row }) => (
      <span className="inline-flex items-center gap-2">
        <CategoryIcon icon={(row.original as any).icon} />
        <span className="text-xs text-muted-foreground">
          {(row.original as any).icon || "—"}
        </span>
      </span>
    ),
  },
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

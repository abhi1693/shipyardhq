"use client"

import { Relationship } from "@/components/molecules/Relationship"
import { ColumnDef } from "@tanstack/react-table"
import { Category } from "@prisma/client"
import { formatDate, linkify } from "@/lib/ui/formatters"

export function UseCaseCategoryRelationship({ rows }: { rows: Category[] }) {
  const columns: ColumnDef<Category>[] = [
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
      cell: ({ row }) => row.original.slug,
    },
    {
      accessorKey: "createdAt",
      header: "Created At",
      cell: ({ row }) => formatDate(row.original.createdAt),
    },
  ]

  return (
    <Relationship title="Mapped Categories" rows={rows} columns={columns} />
  )
}

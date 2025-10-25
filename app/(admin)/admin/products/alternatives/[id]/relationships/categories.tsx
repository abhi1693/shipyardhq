"use client"

import type { ColumnDef } from "@tanstack/react-table"

import { Relationship } from "@/components/molecules/Relationship"
import { linkify } from "@/lib/ui/formatters"
import { adminPath } from "@/lib/routes"
import { Category } from "@/lib/vendor/prisma/client"

interface Props {
  rows: Category[]
}

export function AlternativeProductCategoryRelationship({ rows }: Props) {
  const columns: ColumnDef<Category>[] = [
    {
      accessorKey: "name",
      header: "Category",
      cell: ({ row }) =>
        linkify({
          label: row.original.name,
          href: adminPath("categories", row.original.id),
          subtext: row.original.slug,
        }),
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => (
        <span className="line-clamp-2 text-sm text-muted-foreground">
          {row.original.description}
        </span>
      ),
    },
  ]

  return (
    <Relationship
      title="Category Coverage"
      rows={rows}
      columns={columns}
      emptyMessage="No categories selected yet. Add categories to highlight where this alternative competes."
    />
  )
}

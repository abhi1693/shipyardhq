"use client"

import { Relationship } from "@/components/molecules/Relationship"
import { ColumnDef } from "@tanstack/react-table"
import type { UseCaseCategory } from "@/lib/vendor/prisma/client"
import { linkify } from "@/lib/ui/formatters"
import { adminPath } from "@/lib/routes"

type CategoryJoin = UseCaseCategory & {
  category: { id: string; name: string; slug: string }
}

export function UseCaseCategoryRelationship({
  rows,
}: {
  rows: CategoryJoin[]
}) {
  const columns: ColumnDef<CategoryJoin>[] = [
    {
      accessorKey: "category.name",
      header: "Category",
      cell: ({ row }) =>
        linkify({
          label: row.original.category.name,
          href: adminPath("categories", row.original.category.id),
          subtext: row.original.category.slug,
        }),
    },
  ]

  return (
    <Relationship title="Related Categories" rows={rows} columns={columns} />
  )
}

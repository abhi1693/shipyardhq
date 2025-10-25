"use client"

import type { ColumnDef } from "@tanstack/react-table"
import Link from "next/link"

import { Relationship } from "@/components/molecules/Relationship"
import { Button } from "@/components/atoms/button"
import { linkify } from "@/lib/ui/formatters"
import { adminPath } from "@/lib/routes"
import { Category } from "@/lib/vendor/prisma/client"

interface Props {
  rows: Category[]
  alternativeId: string
}

export function AlternativeProductCategoryRelationship({ rows, alternativeId }: Props) {
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
      action={
        <Link
          href={adminPath("products", "alternatives", alternativeId, "edit")}
        >
          <Button size="sm" variant="outline">
            Update categories
          </Button>
        </Link>
      }
      emptyMessage="No categories selected yet. Add categories to highlight where this alternative competes."
    />
  )
}

"use client"

import type { ColumnDef } from "@tanstack/react-table"

import { Relationship } from "@/components/molecules/Relationship"
import { formatDate, linkify } from "@/lib/ui/formatters"
import { adminPath } from "@/lib/routes"
import { Prisma } from "@/lib/vendor/prisma/client"

export type ProductWithCategory = Prisma.ProductGetPayload<{
  include: { category: true }
}>

interface Props {
  rows: ProductWithCategory[]
}

export function AlternativeProductProductRelationship({ rows }: Props) {
  const columns: ColumnDef<ProductWithCategory>[] = [
    {
      accessorKey: "name",
      header: "Product",
      cell: ({ row }) => (
        linkify({
          label: row.original.name,
          href: adminPath("products", row.original.id),
          subtext: row.original.slug,
        })
      ),
    },
    {
      id: "category",
      header: "Category",
      cell: ({ row }) =>
        row.original.category
          ? linkify({
              label: row.original.category.name,
              href: adminPath("categories", row.original.category.id),
            })
          : "—",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => row.original.status,
    },
    {
      accessorKey: "updatedAt",
      header: "Updated",
      cell: ({ row }) => formatDate(row.original.updatedAt),
    },
  ]

  return (
    <Relationship
      title="Linked Shipyard Products"
      rows={rows}
      columns={columns}
      emptyMessage="No products are linked to this alternative yet."
    />
  )
}

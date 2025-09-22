"use client"

import { Relationship } from "@/components/molecules/Relationship"
import { ColumnDef } from "@tanstack/react-table"
import { Product, Category } from "@/lib/vendor/prisma/client"
import { linkify, formatDate } from "@/lib/ui/formatters"
import { adminPath } from "@/lib/routes"

type ProductWithCategory = Product & {
  category: Category
}

export function UserProductRelationship({
  rows,
}: {
  rows: ProductWithCategory[]
}) {
  const columns: ColumnDef<ProductWithCategory>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) =>
        linkify({
          label: row.original.name,
          href: adminPath("products", row.original.id),
        }),
    },
    {
      accessorKey: "category.name",
      header: "Category",
      cell: ({ row }) =>
        linkify({
          label: row.original.category.name,
          href: adminPath("categories", row.original.category.id),
        }),
    },
    {
      accessorKey: "createdAt",
      header: "Created At",
      cell: ({ row }) => formatDate(row.original.createdAt),
    },
  ]

  return <Relationship title="Related Products" rows={rows} columns={columns} />
}

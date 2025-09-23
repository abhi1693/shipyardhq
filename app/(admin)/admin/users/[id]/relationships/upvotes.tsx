"use client"

import { Relationship } from "@/components/molecules/Relationship"
import type {
  Category,
  Product,
  ProductUpvote,
} from "@/lib/vendor/prisma/client"
import { ColumnDef } from "@tanstack/react-table"
import { adminPath } from "@/lib/routes"
import { formatDate, linkify, placeholder } from "@/lib/ui/formatters"

type UpvoteWithProduct = ProductUpvote & {
  product: Product & {
    category: Category | null
  }
}

export function UserProductUpvoteRelationship({
  rows,
}: {
  rows: UpvoteWithProduct[]
}) {
  const columns: ColumnDef<UpvoteWithProduct>[] = [
    {
      accessorKey: "product.name",
      header: "Product",
      cell: ({ row }) =>
        linkify({
          label: row.original.product.name,
          href: adminPath("products", row.original.product.id),
        }),
    },
    {
      accessorKey: "product.category.name",
      header: "Category",
      cell: ({ row }) =>
        row.original.product.category
          ? linkify({
              label: row.original.product.category.name,
              href: adminPath(
                "categories",
                row.original.product.category.id,
              ),
            })
          : placeholder(),
    },
    {
      accessorKey: "createdAt",
      header: "Upvoted",
      cell: ({ row }) => formatDate(row.original.createdAt),
    },
  ]

  return (
    <Relationship
      title="Product Upvotes"
      rows={rows}
      columns={columns}
      emptyMessage="No product upvotes recorded."
    />
  )
}

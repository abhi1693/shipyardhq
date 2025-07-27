"use client"

import { ColumnDef } from "@tanstack/react-table"
import { ProductBadge, Badge, Product } from "@prisma/client"
import { formatDate, linkify } from "@/lib/ui/formatters"

export type ProductBadgeWithDetails = ProductBadge & {
  badge: Badge
  product: Pick<Product, "id" | "name">
}

export const columns: ColumnDef<ProductBadgeWithDetails>[] = [
  {
    accessorKey: "id",
    header: "ID",
    cell: ({ row }) =>
      linkify({
        label: row.original.id,
        href: `/admin/products/assignments/badges/${row.original.id}`,
      }),
  },
  {
    accessorKey: "badge",
    header: "Badge",
  },
  {
    accessorKey: "product.name",
    header: "Product",
    cell: ({ row }) =>
      linkify({
        label: row.original.product.name,
        href: `/admin/products/${row.original.product.id}`,
      }),
  },
  {
    accessorKey: "expiresAt",
    header: "Expires At",
    cell: ({ row }) =>
      row.original.expiresAt ? formatDate(row.original.expiresAt) : "Never",
  },
  {
    accessorKey: "createdAt",
    header: "Assigned At",
    cell: ({ row }) => formatDate(row.original.createdAt),
  },
]

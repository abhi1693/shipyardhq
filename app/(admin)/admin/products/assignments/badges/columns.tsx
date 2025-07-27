"use client"

import { ColumnDef } from "@tanstack/react-table"
import { ProductBadge, Badge, Product } from "@prisma/client"
import { formatDate, linkify } from "@/lib/ui/formatters"
import { Badge as BadgeUI } from "@/components/atoms/badge"

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
    accessorKey: "badge.name",
    header: "Badge",
    cell: ({ row }) => {
      const badge = row.original.badge
      return (
        <BadgeUI className={`bg-${badge.color}-100 text-${badge.color}-800`}>
          {badge.name}
        </BadgeUI>
      )
    },
  },
  {
    accessorKey: "badge.slug",
    header: "Slug",
  },
  {
    accessorKey: "badge.icon",
    header: "Icon",
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

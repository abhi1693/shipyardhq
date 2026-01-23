"use client"

import { Relationship } from "@/components/molecules/Relationship"
import { ColumnDef } from "@tanstack/react-table"
import type { Product } from "@/lib/vendor/prisma/client"
import { formatDate, linkify } from "@/lib/ui/formatters"
import { adminPath } from "@/lib/routes"

type ProductWithUser = Product & {
  user: { id: string; email: string }
}

export function CategoryProductRelationship({
  rows,
}: {
  rows: ProductWithUser[]
}) {
  const columns: ColumnDef<ProductWithUser>[] = [
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
      accessorKey: "user.email",
      header: "Created By",
      cell: ({ row }) =>
        linkify({
          label: row.original.user.email,
          href: adminPath("users", row.original.user.id),
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

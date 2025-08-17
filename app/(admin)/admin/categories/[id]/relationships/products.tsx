"use client"

import { Relationship } from "@/components/molecules/Relationship"
import { ColumnDef } from "@tanstack/react-table"
import { Product } from "@/lib/vendor/prisma/client"
import { formatDate, linkify } from "@/lib/ui/formatters"

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
          href: `/admin/products/${row.original.id}`,
        }),
    },
    {
      accessorKey: "user.email",
      header: "Created By",
      cell: ({ row }) =>
        linkify({
          label: row.original.user.email,
          href: `/admin/users/${row.original.user.id}`,
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

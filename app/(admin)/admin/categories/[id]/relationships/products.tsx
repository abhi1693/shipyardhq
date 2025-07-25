"use client"

import { Relationship } from "@/components/molecules/Relationship"
import { ColumnDef } from "@tanstack/react-table"
import Link from "next/link"
import { Product } from "@prisma/client"

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
      cell: ({ row }) => (
        <Link
          href={`/admin/products/${row.original.id}`}
          className="text-blue-600 hover:underline"
        >
          {row.original.name}
        </Link>
      ),
    },
    {
      accessorKey: "user.email",
      header: "Created By",
      cell: ({ row }) => (
        <Link
          href={`/admin/users/${row.original.user.id}`}
          className="text-blue-600 hover:underline"
        >
          {row.original.user.email}
        </Link>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Created At",
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
    },
  ]

  return <Relationship title="Products" rows={rows} columns={columns} />
}

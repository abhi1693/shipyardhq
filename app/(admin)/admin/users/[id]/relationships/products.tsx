"use client"

import { Relationship } from "@/components/molecules/Relationship"
import { ColumnDef } from "@tanstack/react-table"
import Link from "next/link"
import { Product, Category } from "@prisma/client"

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
      accessorKey: "category.name",
      header: "Category",
      cell: ({ row }) => (
        <Link
          href={`/admin/categories/${row.original.category.id}`}
          className="text-blue-600 hover:underline"
        >
          {row.original.category.name}
        </Link>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Created At",
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
    },
  ]

  return <Relationship title="Related Products" rows={rows} columns={columns} />
}

"use client"

import Link from "next/link"
import { ColumnDef } from "@tanstack/react-table"
import { Product } from "@prisma/client"
import { format } from "date-fns"

export const productColumns: ColumnDef<
  Product & {
    category: { name: string }
    user: { email: string }
  }
>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => {
      const product = row.original
      return (
        <Link
          href={`/admin/products/${product.id}`}
          className="text-blue-600 hover:underline font-medium"
        >
          {product.name}
        </Link>
      )
    },
  },
  {
    accessorKey: "category.name",
    header: "Category",
    cell: ({ row }) => row.original.category.name,
  },
  {
    accessorKey: "user.email",
    header: "Created By",
    cell: ({ row }) => row.original.user.email,
  },
  {
    accessorKey: "createdAt",
    header: "Created At",
    cell: ({ row }) =>
      format(new Date(row.original.createdAt), "yyyy-MM-dd HH:mm"),
  },
  {
    accessorKey: "updatedAt",
    header: "Updated At",
    cell: ({ row }) =>
      format(new Date(row.original.updatedAt), "yyyy-MM-dd HH:mm"),
  },
]

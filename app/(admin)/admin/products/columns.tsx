"use client"

import Link from "next/link"
import { ColumnDef } from "@tanstack/react-table"
import { Product } from "@prisma/client"
import { format } from "date-fns"

export const columns: ColumnDef<
  Product & {
    category: { id: string; name: string }
    user: { id: string; email: string }
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
    cell: ({ row }) => {
      const { category } = row.original
      return (
        <Link
          href={`/admin/categories/${category.id}`}
          className="text-blue-600 hover:underline"
        >
          {category.name}
        </Link>
      )
    },
  },
  {
    accessorKey: "user.email",
    header: "Created By",
    cell: ({ row }) => {
      const { user } = row.original
      return (
        <Link
          href={`/admin/users/${user.id}`}
          className="text-blue-600 hover:underline"
        >
          {user.email}
        </Link>
      )
    },
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

"use client"

import Link from "next/link"
import Image from "next/image"
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
    id: "logo",
    header: "Logo",
    cell: ({ row }) => (
      <Image
        src={row.original.logo}
        alt={row.original.name}
        width={32}
        height={32}
        className="rounded"
      />
    ),
  },
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => {
      const product = row.original
      return (
        <div className="flex flex-col">
          <Link
            href={`/admin/products/${product.id}`}
            className="text-blue-600 hover:underline font-medium"
          >
            {product.name}
          </Link>
          <span className="text-muted-foreground text-sm">
            {product.tagline}
          </span>
        </div>
      )
    },
  },
  {
    accessorKey: "websiteUrl",
    header: "Website",
    cell: ({ row }) => (
      <a
        href={row.original.websiteUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-blue-600 hover:underline"
      >
        {new URL(row.original.websiteUrl).hostname}
      </a>
    ),
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

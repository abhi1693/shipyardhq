"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Category } from "@prisma/client"
import Link from "next/link"
import { format } from "date-fns"

export const columns: ColumnDef<Category>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => {
      const category = row.original
      return (
        <Link
          href={`/admin/categories/${category.id}`}
          className="text-blue-600 hover:underline font-medium"
        >
          {category.name}
        </Link>
      )
    },
  },
  {
    accessorKey: "slug",
    header: "Slug",
    cell: ({ row }) => (
      <span className="font-mono text-muted-foreground">
        {row.getValue("slug")}
      </span>
    ),
  },
  {
    accessorKey: "createdAt",
    header: "Created At",
    cell: ({ row }) => {
      const value = row.getValue("createdAt") as string
      return (
        <span className="text-muted-foreground text-sm">
          {format(new Date(value), "yyyy-MM-dd HH:mm")}
        </span>
      )
    },
  },
  {
    accessorKey: "updatedAt",
    header: "Updated At",
    cell: ({ row }) => {
      const value = row.getValue("updatedAt") as string
      return (
        <span className="text-muted-foreground text-sm">
          {format(new Date(value), "yyyy-MM-dd HH:mm")}
        </span>
      )
    },
  },
]

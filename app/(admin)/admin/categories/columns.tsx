"use client"

import Link from "next/link"
import { ColumnDef } from "@tanstack/react-table"
import { Category } from "@prisma/client"

export const categoryColumns: ColumnDef<Category>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => {
      const category = row.original
      return (
        <Link href={`/admin/categories/${category.id}`} className="text-blue-600 hover:underline">
          {category.name}
        </Link>
      )
    },
  },
  { accessorKey: "slug", header: "Slug" },
  { accessorKey: "createdAt", header: "Created At" },
  { accessorKey: "updatedAt", header: "Updated At" },
]

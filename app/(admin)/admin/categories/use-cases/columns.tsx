"use client"

import { ColumnDef } from "@tanstack/react-table"
import { UseCase } from "@/lib/vendor/prisma/client"
import { formatDate, slug, linkify } from "@/lib/ui/formatters"
import Link from "next/link"
import { Button } from "@/components/atoms/button"
import { Eye, Pencil } from "lucide-react"

export const columns: ColumnDef<UseCase>[] = [
  {
    accessorKey: "label",
    header: "Label",
    cell: ({ row }) =>
      linkify({
        label: row.original.label,
        href: `/admin/categories/use-cases/${row.original.id}`,
      }),
  },
  {
    accessorKey: "slug",
    header: "Slug",
    cell: ({ row }) => slug(row.original.slug),
  },
  {
    accessorKey: "createdAt",
    header: "Created At",
    cell: ({ row }) => formatDate(row.original.createdAt),
  },
  {
    accessorKey: "updatedAt",
    header: "Updated At",
    cell: ({ row }) => formatDate(row.original.updatedAt),
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Link href={`/admin/categories/use-cases/${row.original.id}`}>
          <Button size="sm" variant="outline">
            <Eye className="h-4 w-4" /> View
          </Button>
        </Link>
        <Link href={`/admin/categories/use-cases/${row.original.id}/edit`}>
          <Button size="sm" variant="outline">
            <Pencil className="h-4 w-4" /> Edit
          </Button>
        </Link>
      </div>
    ),
  },
]

"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Product } from "@/lib/vendor/prisma/client"
import { formatDate, image, linkify } from "@/lib/ui/formatters"
import Link from "next/link"
import { Button } from "@/components/atoms/button"
import { Eye, Pencil } from "lucide-react"

export type AdminProductRow = Product & {
  category: { id: string; name: string }
  user: { id: string; email: string }
}

export const columns: ColumnDef<AdminProductRow>[] = [
  {
    id: "logo",
    header: "Logo",
    cell: ({ row }) => image(row.original.logo, row.original.name),
  },
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) =>
      linkify({
        label: row.original.name,
        href: `/admin/products/${row.original.id}`,
        subtext: row.original.tagline,
      }),
  },
  {
    accessorKey: "websiteUrl",
    header: "Website",
    cell: ({ row }) =>
      linkify({
        label: row.original.websiteUrl,
        href: row.original.websiteUrl,
        isExternal: true,
      }),
  },
  {
    accessorKey: "status",
    header: "Status",
  },
  {
    id: "price",
    header: "Price",
    cell: ({ row }) => {
      const p = row.original
      return p.startingPriceCents != null
        ? `$${(p.startingPriceCents / 100).toFixed(2)} ${p.currencyCode || "USD"}`
        : "—"
    },
  },
  {
    accessorKey: "category.name",
    header: "Category",
    cell: ({ row }) =>
      linkify({
        label: row.original.category.name,
        href: `/admin/categories/${row.original.category.id}`,
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
        <Link href={`/admin/products/${row.original.id}`}>
          <Button size="sm" variant="outline">
            <Eye className="h-4 w-4" /> View
          </Button>
        </Link>
        <Link href={`/admin/products/${row.original.id}/edit`}>
          <Button size="sm" variant="outline">
            <Pencil className="h-4 w-4" /> Edit
          </Button>
        </Link>
      </div>
    ),
  },
]

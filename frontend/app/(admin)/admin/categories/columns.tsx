"use client"

import { ColumnDef } from "@tanstack/react-table"
import type { Category } from "@/lib/vendor/prisma/client"
import { formatDate, slug, linkify } from "@/lib/ui/formatters"
import Link from "next/link"
import { Button } from "@/components/atoms/button"
import { Eye, Pencil } from "lucide-react"
import { CategoryIcon } from "@/components/molecules/CategoryIcons"
import { adminPath } from "@/lib/routes"

export const columns: ColumnDef<Category>[] = [
  {
    id: "icon",
    header: "Icon",
    cell: ({ row }) => (
      <span className="inline-flex items-center gap-2">
        <CategoryIcon icon={(row.original as any).icon} />
        <span className="text-xs text-muted-foreground">
          {(row.original as any).icon || "—"}
        </span>
      </span>
    ),
  },
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) =>
      linkify({
        label: row.original.name,
        href: adminPath("categories", row.original.id),
      }),
  },
  {
    accessorKey: "slug",
    header: "Slug",
    cell: ({ row }) => slug(row.original.slug),
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => row.original.description,
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
        <Link href={adminPath("categories", row.original.id)}>
          <Button size="sm" variant="outline">
            <Eye className="h-4 w-4" /> View
          </Button>
        </Link>
        <Link href={adminPath("categories", row.original.id, "edit")}>
          <Button size="sm" variant="outline">
            <Pencil className="h-4 w-4" /> Edit
          </Button>
        </Link>
      </div>
    ),
  },
]

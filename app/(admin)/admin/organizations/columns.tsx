"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Organization } from "@/lib/vendor/prisma/client"
import { formatDate, linkify } from "@/lib/ui/formatters"
import Link from "next/link"
import { Button } from "@/components/atoms/button"
import { Eye, Pencil } from "lucide-react"
import { adminPath } from "@/lib/routes"

export const columns: ColumnDef<Organization>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) =>
      linkify({
        label: row.original.name,
        href: adminPath("organizations", row.original.id),
      }),
  },
  {
    accessorKey: "url",
    header: "URL",
    cell: ({ row }) =>
      linkify({
        href: row.original.url,
        label: row.original.url,
        isExternal: true,
      }),
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }) => formatDate(row.original.createdAt),
  },
  {
    accessorKey: "updatedAt",
    header: "Updated",
    cell: ({ row }) => formatDate(row.original.updatedAt),
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Link href={adminPath("organizations", row.original.id)}>
          <Button size="sm" variant="outline">
            <Eye className="h-4 w-4" /> View
          </Button>
        </Link>
        <Link href={adminPath("organizations", row.original.id, "edit")}>
          <Button size="sm" variant="outline">
            <Pencil className="h-4 w-4" /> Edit
          </Button>
        </Link>
      </div>
    ),
  },
]

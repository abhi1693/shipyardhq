"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Plan } from "@/lib/vendor/prisma/client"
import { Badge } from "@/components/atoms/badge"
import {
  linkify,
  formatBoolean,
  formatCurrency,
  placeholder,
} from "@/lib/ui/formatters"
import Link from "next/link"
import { Button } from "@/components/atoms/button"
import { Eye, Pencil } from "lucide-react"

export const columns: ColumnDef<Plan>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) =>
      linkify({
        label: row.original.name,
        href: `/admin/plans/${row.original.id}`,
      }),
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => <Badge variant="secondary">{row.original.type}</Badge>,
  },
  {
    accessorKey: "price",
    header: "Price",
    cell: ({ row }) => formatCurrency(row.original.price),
  },
  {
    accessorKey: "boostForDays",
    header: "Boost For",
    cell: ({ row }) => `${(row.original as any).boostForDays ?? 1} day(s)`,
  },
  {
    accessorKey: "discount",
    header: "Discount",
    cell: ({ row }) =>
      row.original.discount != null
        ? `${row.original.discount}%`
        : placeholder(),
  },
  {
    accessorKey: "isDefault",
    header: "Default",
    cell: ({ row }) => formatBoolean(row.original.isDefault),
  },
  {
    accessorKey: "External ID",
    header: "External ID",
    cell: ({ row }) =>
      row.original.externalId
        ? linkify({
            label: row.original.externalId,
            href: `https://app.dodopayments.com/products/edit?id=${row.original.externalId}`,
            isExternal: true,
          })
        : placeholder(),
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Link href={`/admin/plans/${row.original.id}`}>
          <Button size="sm" variant="outline">
            <Eye className="h-4 w-4" /> View
          </Button>
        </Link>
        <Link href={`/admin/plans/${row.original.id}/edit`}>
          <Button size="sm" variant="outline">
            <Pencil className="h-4 w-4" /> Edit
          </Button>
        </Link>
      </div>
    ),
  },
]

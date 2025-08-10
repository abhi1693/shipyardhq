"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Plan } from "@prisma/client"
import { Badge } from "@/components/atoms/badge"
import {
  linkify,
  formatBoolean,
  formatCurrency,
  placeholder,
} from "@/lib/ui/formatters"

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
]

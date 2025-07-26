"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Plan } from "@prisma/client"
import { Badge } from "@/components/atoms/badge"
import { linkify, formatBoolean, formatCurrency } from "@/lib/ui/formatters"

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
    accessorKey: "interval",
    header: "Interval",
    cell: ({ row }) =>
      `${row.original.frequency} ${row.original.interval}${row.original.frequency > 1 ? "s" : ""}`,
  },
  {
    accessorKey: "isDefault",
    header: "Default",
    cell: ({ row }) => formatBoolean(row.original.isDefault),
  },
]

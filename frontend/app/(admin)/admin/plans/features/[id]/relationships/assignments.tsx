"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Relationship } from "@/components/molecules/Relationship"
import { formatBoolean, formatDate, linkify } from "@/lib/ui/formatters"
import { adminPath } from "@/lib/routes"

type AssignmentRow = {
  id: string
  plan: {
    id: string
    name: string
  }
  enabled: boolean
  isExperimental: boolean
  createdAt: Date
}

export function PlanAssignmentRelationship({
  rows,
}: {
  rows: AssignmentRow[]
}) {
  const columns: ColumnDef<AssignmentRow>[] = [
    {
      accessorKey: "plan.name",
      header: "Plan",
      cell: ({ row }) =>
        linkify({
          label: row.original.plan.name,
          href: adminPath("plans", row.original.plan.id),
        }),
    },
    {
      accessorKey: "enabled",
      header: "Enabled",
      cell: ({ row }) => formatBoolean(row.original.enabled),
    },
    {
      accessorKey: "isExperimental",
      header: "Experimental",
      cell: ({ row }) => formatBoolean(row.original.isExperimental),
    },
    {
      accessorKey: "createdAt",
      header: "Assigned At",
      cell: ({ row }) => formatDate(row.original.createdAt),
    },
  ]

  return <Relationship title="Assigned Plans" rows={rows} columns={columns} />
}

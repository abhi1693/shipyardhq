"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Relationship } from "@/components/molecules/Relationship"
import Link from "next/link"

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
      cell: ({ row }) => (
        <Link
          href={`/admin/plans/${row.original.plan.id}`}
          className="text-blue-600 hover:underline"
        >
          {row.original.plan.name}
        </Link>
      ),
    },
    {
      accessorKey: "enabled",
      header: "Enabled",
      cell: ({ row }) => (row.original.enabled ? "Yes" : "No"),
    },
    {
      accessorKey: "isExperimental",
      header: "Experimental",
      cell: ({ row }) => (row.original.isExperimental ? "Yes" : "No"),
    },
    {
      accessorKey: "createdAt",
      header: "Assigned At",
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
    },
  ]

  return <Relationship title="Assigned Plans" rows={rows} columns={columns} />
}

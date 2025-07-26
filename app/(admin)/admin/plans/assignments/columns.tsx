"use client"

import { ColumnDef } from "@tanstack/react-table"
import Link from "next/link"
import { PlanFeatureAssignment } from "@prisma/client"
import { formatBoolean, formatDate, linkify } from "@/lib/ui/formatters"

type AssignmentWithRelations = PlanFeatureAssignment & {
  plan: { id: string; name: string }
  feature: { id: string; name: string; key: string }
}

export const columns: ColumnDef<AssignmentWithRelations>[] = [
  {
    accessorKey: "feature.name",
    header: "Feature",
    cell: ({ row }) =>
      linkify({
        label: row.original.feature.name,
        href: `/admin/features/${row.original.feature.id}`,
        subtext: row.original.feature.key,
      }),
  },
  {
    accessorKey: "plan.name",
    header: "Plan",
    cell: ({ row }) => {
      const plan = row.original.plan
      return (
        <Link
          href={`/admin/plans/${plan.id}`}
          className="text-blue-600 hover:underline"
        >
          {plan.name}
        </Link>
      )
    },
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
    header: "Created At",
    cell: ({ row }) => formatDate(row.original.createdAt),
  },
  {
    accessorKey: "updatedAt",
    header: "Updated At",
    cell: ({ row }) => formatDate(row.original.updatedAt),
  },
]

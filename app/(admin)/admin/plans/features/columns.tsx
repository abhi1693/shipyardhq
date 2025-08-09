"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Plan, PlanFeature, PlanFeatureAssignment } from "@prisma/client"
import { commaSeparated, formatDate, linkify } from "@/lib/ui/formatters"

type PlanFeatureWithAssignments = PlanFeature & {
  assignments: (PlanFeatureAssignment & {
    plan: Pick<Plan, "id" | "name">
  })[]
}

export const columns: ColumnDef<PlanFeatureWithAssignments>[] = [
  {
    accessorKey: "key",
    header: "Key",
    cell: ({ row }) =>
      linkify({
        label: row.original.key,
        href: `/admin/plans/features/${row.original.id}`,
      }),
  },
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "description",
    header: "Description",
  },
  {
    accessorKey: "assignments",
    header: "Assigned Plans",
    cell: ({ row }) =>
      commaSeparated(
        row.original.assignments.map((a) =>
          linkify({
            label: a.plan.name,
            href: `/admin/plans/${a.plan.id}`,
            subtext: a.isExperimental ? (
              <span className="text-yellow-600 text-xs italic">
                (experimental)
              </span>
            ) : undefined,
          }),
        ),
      ),
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

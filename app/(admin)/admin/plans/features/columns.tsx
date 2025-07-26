"use client"

import { ColumnDef } from "@tanstack/react-table"
import { PlanFeature, PlanFeatureAssignment, Plan } from "@prisma/client"
import { linkify, commaSeparated } from "@/lib/ui/formatters"

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
        href: `/admin/features/${row.original.id}`,
      }),
  },
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => (
      <div className="text-sm text-muted-foreground">
        {row.original.description}
      </div>
    ),
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
            suffix: a.isExperimental ? (
              <span className="text-yellow-600 text-xs italic">
                (experimental)
              </span>
            ) : undefined,
          }),
        ),
      ),
  },
]

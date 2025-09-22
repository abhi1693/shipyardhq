"use client"

import { ColumnDef } from "@tanstack/react-table"
import {
  Plan,
  PlanFeature,
  PlanFeatureAssignment,
} from "@/lib/vendor/prisma/client"
import { commaSeparated, formatDate, linkify } from "@/lib/ui/formatters"
import Link from "next/link"
import { Button } from "@/components/atoms/button"
import { Eye, Pencil } from "lucide-react"
import { adminPath } from "@/lib/routes"

export type PlanFeatureWithAssignments = PlanFeature & {
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
        href: adminPath("plans", "features", row.original.id),
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
            href: adminPath("plans", a.plan.id),
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
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Link href={adminPath("plans", "features", row.original.id)}>
          <Button size="sm" variant="outline">
            <Eye className="h-4 w-4" /> View
          </Button>
        </Link>
        <Link href={adminPath("plans", "features", row.original.id, "edit")}>
          <Button size="sm" variant="outline">
            <Pencil className="h-4 w-4" /> Edit
          </Button>
        </Link>
      </div>
    ),
  },
]

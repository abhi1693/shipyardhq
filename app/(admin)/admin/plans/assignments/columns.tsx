"use client"

import { ColumnDef } from "@tanstack/react-table"
import Link from "next/link"
import { PlanFeatureAssignment } from "@/lib/vendor/prisma/client"
import { formatBoolean, formatDate, linkify } from "@/lib/ui/formatters"
import { Button } from "@/components/atoms/button"
import { Eye, Pencil } from "lucide-react"

type AssignmentWithRelations = PlanFeatureAssignment & {
  plan: { id: string; name: string }
  feature: { id: string; name: string; key: string }
}

export const columns: ColumnDef<AssignmentWithRelations>[] = [
  {
    accessorKey: "id",
    header: "ID",
    cell: ({ row }) =>
      linkify({
        label: row.original.id,
        href: `/admin/plans/assignments/${row.original.id}`,
      }),
  },
  {
    accessorKey: "feature.name",
    header: "Feature",
    cell: ({ row }) =>
      linkify({
        label: row.original.feature.name,
        href: `/admin/plans/features/${row.original.feature.id}`,
        subtext: row.original.feature.key,
      }),
  },
  {
    accessorKey: "plan.name",
    header: "Plan",
    cell: ({ row }) =>
      linkify({
        label: row.original.plan.name,
        href: `/admin/plans/${row.original.plan.id}`,
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
        <Link href={`/admin/plans/assignments/${row.original.id}`}>
          <Button size="sm" variant="outline">
            <Eye className="h-4 w-4" /> View
          </Button>
        </Link>
        <Link href={`/admin/plans/assignments/${row.original.id}/edit`}>
          <Button size="sm" variant="outline">
            <Pencil className="h-4 w-4" /> Edit
          </Button>
        </Link>
      </div>
    ),
  },
]

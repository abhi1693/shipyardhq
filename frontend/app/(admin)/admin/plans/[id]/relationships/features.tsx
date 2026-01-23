"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Relationship } from "@/components/molecules/Relationship"
import type {
  PlanFeatureAssignment,
  PlanFeature,
} from "@/lib/vendor/prisma/client"
import { formatBoolean, linkify } from "@/lib/ui/formatters"
import { adminPath } from "@/lib/routes"

type AssignmentWithFeature = PlanFeatureAssignment & {
  feature: PlanFeature
}

export function PlanFeatureRelationship({
  rows,
}: {
  rows: AssignmentWithFeature[]
}) {
  const columns: ColumnDef<AssignmentWithFeature>[] = [
    {
      accessorKey: "feature.name",
      header: "Feature",
      cell: ({ row }) =>
        linkify({
          label: row.original.feature.name,
          href: adminPath("plans", "features", row.original.feature.id),
        }),
    },
    {
      accessorKey: "feature.key",
      header: "Key",
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
  ]

  return (
    <Relationship title="Assigned Features" columns={columns} rows={rows} />
  )
}

"use client"

import { Relationship } from "@/components/molecules/Relationship"
import type { Plan, UserPlanPurchase } from "@/lib/vendor/prisma/client"
import { ColumnDef } from "@tanstack/react-table"
import { adminPath } from "@/lib/routes"
import {
  formatCurrency,
  formatDate,
  linkify,
  placeholder,
} from "@/lib/ui/formatters"

type PurchaseWithPlan = UserPlanPurchase & {
  plan: Plan
}

export function UserPlanPurchasesRelationship({
  rows,
}: {
  rows: PurchaseWithPlan[]
}) {
  const columns: ColumnDef<PurchaseWithPlan>[] = [
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
      accessorKey: "plan.type",
      header: "Plan Type",
      cell: ({ row }) =>
        row.original.plan.type.replaceAll("_", " "),
    },
    {
      accessorKey: "plan.price",
      header: "Price",
      cell: ({ row }) => formatCurrency(row.original.plan.price),
    },
    {
      accessorKey: "externalId",
      header: "External ID",
      cell: ({ row }) => row.original.externalId ?? placeholder(),
    },
    {
      accessorKey: "createdAt",
      header: "Purchased",
      cell: ({ row }) => formatDate(row.original.createdAt),
    },
  ]

  return (
    <Relationship
      title="Plan Purchases"
      rows={rows}
      columns={columns}
      emptyMessage="No plan purchases recorded."
    />
  )
}

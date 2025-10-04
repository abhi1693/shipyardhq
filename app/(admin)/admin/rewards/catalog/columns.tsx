"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { ColumnDef } from "@tanstack/react-table"
import { formatDistanceToNow } from "date-fns"
import { toast } from "sonner"

import { toggleRewardCatalogItemAction } from "@/actions/admin/rewards/actions"
import { Badge } from "@/components/atoms/badge"
import { Button } from "@/components/atoms/button"
import { Switch } from "@/components/atoms/switch"
import { adminPath } from "@/lib/routes"
import { RewardCatalogItem } from "@/lib/vendor/prisma/client"

function CatalogActiveToggle({ item }: { item: RewardCatalogItem }) {
  const [isPending, startTransition] = useTransition()
  const [checked, setChecked] = useState(item.isActive)

  return (
    <div className="flex items-center gap-2">
      <Switch
        aria-label={`Toggle ${item.name}`}
        checked={checked}
        disabled={isPending}
        onCheckedChange={(next) => {
          setChecked(next)
          startTransition(async () => {
            const result = await toggleRewardCatalogItemAction(item.id, next)
            if (result?.error) {
              toast.error(result.error)
              setChecked((prev) => !prev)
            } else {
              toast.success(
                next ? "Catalog item enabled" : "Catalog item disabled",
              )
            }
          })
        }}
      />
      <span className="text-xs text-muted-foreground">
        {checked ? "Active" : "Paused"}
      </span>
    </div>
  )
}

const numberFormatter = new Intl.NumberFormat("en-US")

function formatRewards(value: number) {
  return `${numberFormatter.format(value)} rewards`
}

function formatDuration(seconds: number | null) {
  if (!seconds || seconds <= 0) return "-"
  if (seconds % 86400 === 0) {
    const days = Math.round(seconds / 86400)
    return `${days}d`
  }
  if (seconds % 3600 === 0) {
    const hours = Math.round(seconds / 3600)
    return `${hours}h`
  }
  return `${seconds}s`
}

const placeholder = "-"

export const columns: ColumnDef<RewardCatalogItem>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-medium text-foreground">{row.original.name}</span>
        <span className="text-xs text-muted-foreground">
          {row.original.featureKey}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) => (
      <Badge variant="secondary" className="uppercase">
        {row.original.category}
      </Badge>
    ),
  },
  {
    accessorKey: "baseCost",
    header: "Base cost",
    cell: ({ row }) => formatRewards(row.original.baseCost),
  },
  {
    accessorKey: "durationSeconds",
    header: "Duration",
    cell: ({ row }) => formatDuration(row.original.durationSeconds),
  },
  {
    accessorKey: "requiresProduct",
    header: "Requires product",
    cell: ({ row }) => (row.original.requiresProduct ? "Yes" : "No"),
  },
  {
    accessorKey: "maxActivePerUser",
    header: "Active limit",
    cell: ({ row }) => row.original.maxActivePerUser ?? placeholder,
  },
  {
    accessorKey: "maxPendingPerUser",
    header: "Pending limit",
    cell: ({ row }) => row.original.maxPendingPerUser ?? placeholder,
  },
  {
    id: "status",
    header: "Status",
    cell: ({ row }) => <CatalogActiveToggle item={row.original} />,
  },
  {
    accessorKey: "updatedAt",
    header: "Updated",
    cell: ({ row }) =>
      formatDistanceToNow(new Date(row.original.updatedAt), {
        addSuffix: true,
      }),
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Link href={adminPath("rewards", "catalog", row.original.id, "edit")}>
          <Button size="sm" variant="outline">
            Edit
          </Button>
        </Link>
      </div>
    ),
  },
]

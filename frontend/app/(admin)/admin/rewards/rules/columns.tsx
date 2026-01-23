"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { ColumnDef } from "@tanstack/react-table"
import { formatDistanceToNow } from "date-fns"
import { toast } from "sonner"

import { toggleRewardRuleAction } from "@/actions/admin/rewards/actions"
import { Badge } from "@/components/atoms/badge"
import { Button } from "@/components/atoms/button"
import { Switch } from "@/components/atoms/switch"
import DeleteButton from "@/components/molecules/DeleteButton"
import { adminPath } from "@/lib/routes"
import type { RewardRule } from "@/lib/vendor/prisma/client"

function RuleActiveToggle({ rule }: { rule: RewardRule }) {
  const [isPending, startTransition] = useTransition()
  const [checked, setChecked] = useState(rule.isActive)

  return (
    <div className="flex items-center gap-2">
      <Switch
        aria-label={`Toggle ${rule.name}`}
        checked={checked}
        disabled={isPending}
        onCheckedChange={(next) => {
          setChecked(next)
          startTransition(async () => {
            const result = await toggleRewardRuleAction(rule.id, next)
            if (result?.error) {
              toast.error(result.error)
              setChecked((prev) => !prev)
            } else {
              toast.success(next ? "Rule enabled" : "Rule disabled")
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

const placeholder = "-"

export const columns: ColumnDef<RewardRule>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-medium text-foreground">{row.original.name}</span>
        <span className="text-xs text-muted-foreground">
          {row.original.key}
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
    accessorKey: "baseRewardAmount",
    header: "Base Rewards",
  },
  {
    accessorKey: "dailyCap",
    header: "Daily Cap",
    cell: ({ row }) => row.original.dailyCap ?? placeholder,
  },
  {
    accessorKey: "lifetimeCap",
    header: "Lifetime Cap",
    cell: ({ row }) => row.original.lifetimeCap ?? placeholder,
  },
  {
    accessorKey: "globalCooldownSeconds",
    header: "Cooldown (s)",
    cell: ({ row }) => row.original.globalCooldownSeconds ?? placeholder,
  },
  {
    accessorKey: "perTargetCooldownSeconds",
    header: "Target Cooldown (s)",
    cell: ({ row }) => row.original.perTargetCooldownSeconds ?? placeholder,
  },
  {
    id: "status",
    header: "Status",
    cell: ({ row }) => <RuleActiveToggle rule={row.original} />,
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
        <Link href={adminPath("rewards", "rules", row.original.id, "edit")}>
          <Button size="sm" variant="outline">
            Edit
          </Button>
        </Link>
        <Link href={adminPath("rewards", "rules", row.original.id, "delete")}>
          <DeleteButton size="sm" />
        </Link>
      </div>
    ),
  },
]

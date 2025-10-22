"use client"

import { Relationship } from "@/components/molecules/Relationship"
import { Badge } from "@/components/atoms/badge"
import { ColumnDef } from "@tanstack/react-table"
import { formatDistanceToNow } from "date-fns"

import {
  RedemptionStatus,
  RewardTransactionType,
} from "@/lib/vendor/prisma/client"

export type UserRewardTransactionRow = {
  id: string
  type: RewardTransactionType
  rewardAmount: number
  balanceAfter: number
  notes: string | null
  eventId: string | null
  createdAt: Date
  rule: {
    id: string
    key: string
    name: string
  } | null
  catalogItem: {
    featureKey: string
    name: string | null
  } | null
  redemption: {
    id: string
    status: RedemptionStatus
    featureKey: string | null
  } | null
}

const typeLabels: Record<RewardTransactionType, string> = {
  earn: "Earn",
  spend: "Spend",
  adjustment: "Adjustment",
  refund: "Refund",
}

const placeholder = "-"

export function UserRewardsRelationship({
  rows,
  pageCount,
}: {
  rows: UserRewardTransactionRow[]
  pageCount: number
}) {
  const columns: ColumnDef<UserRewardTransactionRow>[] = [
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => (
        <Badge variant="secondary" className="uppercase">
          {typeLabels[row.original.type]}
        </Badge>
      ),
    },
    {
      accessorKey: "rewardAmount",
      header: "Rewards",
      cell: ({ row }) => {
        const sign = row.original.type === "spend" ? "-" : "+"
        return (
          <span className="font-mono text-sm text-foreground">
            {sign}
            {row.original.rewardAmount}
          </span>
        )
      },
    },
    {
      accessorKey: "balanceAfter",
      header: "Balance",
      cell: ({ row }) => (
        <span className="font-mono text-sm text-muted-foreground">
          {row.original.balanceAfter}
        </span>
      ),
    },
    {
      accessorKey: "rule",
      header: "Rule / Reward",
      cell: ({ row }) => {
        const rule = row.original.rule
        const catalogItem = row.original.catalogItem
        if (rule) {
          return (
            <div className="flex flex-col">
              <span className="font-medium text-foreground">{rule.name}</span>
              <span className="text-xs text-muted-foreground">{rule.key}</span>
            </div>
          )
        }
        if (catalogItem) {
          return (
            <div className="flex flex-col">
              <span className="font-medium text-foreground">
                {catalogItem.name ?? catalogItem.featureKey}
              </span>
              <span className="text-xs text-muted-foreground">
                {catalogItem.featureKey}
              </span>
            </div>
          )
        }
        return placeholder
      },
    },
    {
      accessorKey: "redemption",
      header: "Redemption",
      cell: ({ row }) => {
        const redemption = row.original.redemption
        if (!redemption) return placeholder
        return (
          <div className="flex items-center gap-2">
            <Badge variant="outline">{redemption.status}</Badge>
            <span className="text-xs text-muted-foreground">
              {redemption.featureKey ?? redemption.id}
            </span>
          </div>
        )
      },
    },
    {
      accessorKey: "notes",
      header: "Notes",
      cell: ({ row }) => row.original.notes ?? placeholder,
    },
    {
      accessorKey: "eventId",
      header: "Event",
      cell: ({ row }) => row.original.eventId ?? placeholder,
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }) =>
        formatDistanceToNow(new Date(row.original.createdAt), {
          addSuffix: true,
        }),
    },
  ]

  return (
    <Relationship
      title="Reward Transactions"
      rows={rows}
      columns={columns}
      pageCount={pageCount}
      emptyMessage="No reward transactions for this user."
    />
  )
}

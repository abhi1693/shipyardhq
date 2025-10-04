import Link from "next/link"

import { buildPageMetadata } from "@/lib/metadata"
import {
  resolvePagination,
  type PaginationSearchParams,
} from "@/lib/pagination"
import { adminPath } from "@/lib/routes"
import {
  getRewardTransactions,
  getRewardTransactionsCount,
} from "@/actions/admin/rewards/actions"
import { RewardTransactionType } from "@/lib/vendor/prisma/client"
import ListPageWrapper from "@/components/pages/admin/shared/ListPageWrapper"
import { EntityList } from "@/components/pages/admin/shared/EntityList"
import { Button } from "@/components/atoms/button"

import { columns, type TransactionRow } from "./columns"

const filterOptions: { label: string; value: RewardTransactionType | "all" }[] =
  [
    { label: "All", value: "all" },
    { label: "Earn", value: RewardTransactionType.earn },
    { label: "Spend", value: RewardTransactionType.spend },
    { label: "Adjustments", value: RewardTransactionType.adjustment },
    { label: "Refunds", value: RewardTransactionType.refund },
  ]

export const metadata = buildPageMetadata({
  title: "Reward transactions",
  section: "Admin",
  description: "Audit user reward balance changes.",
})

function isValidType(value: unknown): value is RewardTransactionType | "all" {
  if (value === "all") return true
  return (
    typeof value === "string" &&
    Object.values(RewardTransactionType).includes(
      value as RewardTransactionType,
    )
  )
}

export default async function RewardTransactionsPage({
  searchParams,
}: {
  searchParams?: Promise<PaginationSearchParams>
}) {
  const resolved = searchParams ? await searchParams : undefined
  const { skip, take, pageSize } = resolvePagination(resolved)
  const requestedType = resolved?.type
  const type = isValidType(requestedType) ? requestedType : "all"

  const [transactions, total] = await Promise.all([
    getRewardTransactions({ skip, take, type }),
    getRewardTransactionsCount(type === "all" ? "all" : type),
  ])

  const pageCount = Math.max(Math.ceil(total / pageSize), 1)

  const basePath = adminPath("rewards", "transactions")

  return (
    <ListPageWrapper
      title="Reward transactions"
      description="Review every reward mutation across the system."
    >
      <div className="flex flex-wrap gap-2 pb-4">
        {filterOptions.map((option) => {
          const isActive = option.value === type
          const href =
            option.value === "all"
              ? basePath
              : `${basePath}?type=${encodeURIComponent(option.value)}`
          return (
            <Link key={option.value} href={href}>
              <Button
                size="sm"
                variant={isActive ? "default" : "outline"}
                className={isActive ? "" : "bg-white"}
              >
                {option.label}
              </Button>
            </Link>
          )
        })}
      </div>
      <EntityList<TransactionRow>
        columns={columns}
        data={transactions as TransactionRow[]}
        pageCount={pageCount}
      />
    </ListPageWrapper>
  )
}

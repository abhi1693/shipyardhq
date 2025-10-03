import Link from "next/link"

import { buildPageMetadata } from "@/lib/metadata"
import {
  resolvePagination,
  type PaginationSearchParams,
} from "@/lib/pagination"
import { adminPath } from "@/lib/routes"
import {
  getPointTransactions,
  getPointTransactionsCount,
} from "@/actions/admin/points/actions"
import { PointTransactionType } from "@/lib/vendor/prisma/client"
import ListPageWrapper from "@/components/pages/admin/shared/ListPageWrapper"
import { EntityList } from "@/components/pages/admin/shared/EntityList"
import { Button } from "@/components/atoms/button"

import { columns, type TransactionRow } from "./columns"

const filterOptions: { label: string; value: PointTransactionType | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Earn", value: PointTransactionType.earn },
  { label: "Spend", value: PointTransactionType.spend },
  { label: "Adjustments", value: PointTransactionType.adjustment },
  { label: "Refunds", value: PointTransactionType.refund },
]

export const metadata = buildPageMetadata({
  title: "Point transactions",
  section: "Admin",
  description: "Audit user point balance changes.",
})

function isValidType(value: unknown): value is PointTransactionType | "all" {
  if (value === "all") return true
  return typeof value === "string" && Object.values(PointTransactionType).includes(value as PointTransactionType)
}

export default async function PointTransactionsPage({
  searchParams,
}: {
  searchParams?: Promise<PaginationSearchParams>
}) {
  const resolved = searchParams ? await searchParams : undefined
  const { skip, take, pageSize } = resolvePagination(resolved)
  const requestedType = resolved?.type
  const type = isValidType(requestedType) ? requestedType : "all"

  const [transactions, total] = await Promise.all([
    getPointTransactions({ skip, take, type }),
    getPointTransactionsCount(type === "all" ? "all" : type),
  ])

  const pageCount = Math.max(Math.ceil(total / pageSize), 1)

  const basePath = adminPath("points", "transactions")

  return (
    <ListPageWrapper
      title="Point transactions"
      description="Review every point mutation across the system."
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

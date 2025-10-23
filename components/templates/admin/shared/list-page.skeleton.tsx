import * as React from "react"

import { ButtonSkeleton } from "@/components/atoms/button.skeleton"
import { HeadingSkeleton } from "@/components/atoms/heading.skeleton"
import { Skeleton } from "@/components/atoms/skeleton"
import { DataTableSkeleton } from "@/components/atoms/table/data-table-skeleton"
import { CardSkeleton } from "@/components/atoms/card.skeleton"
import { cn } from "@/lib/utils"

interface AdminListPageSkeletonProps extends React.ComponentProps<"div"> {
  titleLines?: number
  showAddButton?: boolean
  filterCount?: number
  columnCount?: number
  rowCount?: number
  summaryCardCount?: number
  withViewOptions?: boolean
  withPagination?: boolean
  denseTable?: boolean
}

export function AdminListPageSkeleton({
  className,
  titleLines = 1,
  showAddButton = true,
  filterCount = 0,
  columnCount = 5,
  rowCount = 10,
  summaryCardCount = 0,
  withViewOptions = true,
  withPagination = true,
  denseTable = false,
  ...props
}: AdminListPageSkeletonProps) {
  const cards = Math.max(0, summaryCardCount)

  return (
    <div
      className={cn("flex flex-1 flex-col space-y-5", className)}
      data-slot="admin-list-page-skeleton"
      aria-hidden="true"
      {...props}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <HeadingSkeleton lines={titleLines} />
        {showAddButton ? (
          <ButtonSkeleton
            size="sm"
            labelWidth="6.5rem"
            className="self-start sm:self-auto"
          />
        ) : null}
      </div>

      <Skeleton className="h-px w-full rounded-full" tone="muted" />

      {cards > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: cards }).map((_, index) => (
            <CardSkeleton
               
              key={index}
              lines={4}
              showFooter={false}
              actionWidth="5.5rem"
            />
          ))}
        </div>
      ) : null}

      <DataTableSkeleton
        columnCount={columnCount}
        rowCount={rowCount}
        filterCount={filterCount}
        withViewOptions={withViewOptions}
        withPagination={withPagination}
        className="flex-1"
        shrinkZero={denseTable}
      />
    </div>
  )
}

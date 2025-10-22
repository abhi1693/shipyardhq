import * as React from "react"

import { cn } from "@/lib/utils"

import { Skeleton } from "./skeleton"

interface TableSkeletonProps extends React.ComponentProps<"div"> {
  columns?: number
  rows?: number
  showHeader?: boolean
  dense?: boolean
}

export function TableSkeleton({
  className,
  columns = 4,
  rows = 6,
  showHeader = true,
  dense = false,
  ...props
}: TableSkeletonProps) {
  const columnCount = Math.max(1, columns)
  const rowCount = Math.max(1, rows)

  return (
    <div
      className={cn("w-full overflow-hidden rounded-xl border", className)}
      data-slot="table-skeleton"
      {...props}
    >
      <table className="w-full border-collapse">
        {showHeader && (
          <thead>
            <tr className="bg-muted/40">
              {Array.from({ length: columnCount }).map((_, index) => (
                <th key={index} className="px-4 py-3 text-left">
                  <Skeleton className="h-2.5 w-24 rounded-full" tone="muted" />
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {Array.from({ length: rowCount }).map((_, rowIndex) => (
            <TableRowSkeleton
              key={rowIndex}
              columns={columnCount}
              dense={dense}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

interface TableRowSkeletonProps {
  columns?: number
  dense?: boolean
}

export function TableRowSkeleton({
  columns = 4,
  dense = false,
}: TableRowSkeletonProps) {
  return (
    <tr className="border-t">
      {Array.from({ length: columns }).map((_, index) => (
        <td key={index} className={cn("px-4", dense ? "py-2" : "py-3.5")}>
          <Skeleton
            className={cn(
              "h-2.5 w-3/4 rounded-full",
              index === 0 && "w-1/2",
              index === columns - 1 && "ml-auto w-1/3",
            )}
            tone="muted"
          />
        </td>
      ))}
    </tr>
  )
}

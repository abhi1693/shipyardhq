import * as React from "react"

import { cn } from "@/lib/utils"

import { Skeleton } from "./skeleton"

interface BreadcrumbSkeletonProps extends React.ComponentProps<"div"> {
  items?: number
  withEllipsis?: boolean
}

export function BreadcrumbSkeleton({
  className,
  items = 3,
  withEllipsis = false,
  ...props
}: BreadcrumbSkeletonProps) {
  const count = Math.max(2, items)

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 text-sm text-muted-foreground",
        className,
      )}
      data-slot="breadcrumb-skeleton"
      {...props}
    >
      {Array.from({ length: count }).map((_, index) => (
        <React.Fragment key={index}>
          <Skeleton
            className={cn(
              "h-2.5 rounded-full",
              index === 0 ? "w-20" : index === count - 1 ? "w-24" : "w-16",
            )}
            tone="muted"
          />
          {index < count - 1 && (
            <Skeleton className="size-3 rounded-full" tone="soft" />
          )}
        </React.Fragment>
      ))}
      {withEllipsis && <Skeleton className="size-6 rounded-full" tone="soft" />}
    </div>
  )
}

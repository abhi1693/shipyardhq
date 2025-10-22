import * as React from "react"

import { cn } from "@/lib/utils"

import { Skeleton } from "./skeleton"

interface AccordionSkeletonProps extends React.ComponentProps<"div"> {
  items?: number
  expanded?: number[]
  indicator?: boolean
}

export function AccordionSkeleton({
  className,
  items = 3,
  expanded = [],
  indicator = true,
  ...props
}: AccordionSkeletonProps) {
  const expandedSet = React.useMemo(() => new Set(expanded), [expanded])

  return (
    <div
      className={cn(
        "divide-border flex flex-col divide-y rounded-lg border",
        className,
      )}
      data-slot="accordion-skeleton"
      {...props}
    >
      {Array.from({ length: items }).map((_, index) => {
        const isExpanded = expandedSet.has(index)

        return (
          <div key={index} className="space-y-3 p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-2.5 flex-1 rounded-full" tone="muted" />
              {indicator && (
                <Skeleton
                  className="size-4 shrink-0 rounded-full"
                  tone="soft"
                  shimmer={false}
                />
              )}
            </div>
            {isExpanded ? (
              <div className="space-y-2 pl-0.5">
                <Skeleton className="h-2 w-11/12 rounded-full" tone="muted" />
                <Skeleton className="h-2 w-10/12 rounded-full" tone="muted" />
                <Skeleton className="h-2 w-9/12 rounded-full" tone="muted" />
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

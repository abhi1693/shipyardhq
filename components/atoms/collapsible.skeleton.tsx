import * as React from "react"

import { cn } from "@/lib/utils"

import { Skeleton } from "./skeleton"

interface CollapsibleSkeletonProps extends React.ComponentProps<"div"> {
  expanded?: boolean
  lines?: number
}

export function CollapsibleSkeleton({
  className,
  expanded = true,
  lines = 3,
  ...props
}: CollapsibleSkeletonProps) {
  const contentLines = Math.max(1, lines)

  return (
    <div
      className={cn(
        "rounded-lg border border-border/80 bg-white/80 shadow-sm",
        className,
      )}
      data-slot="collapsible-skeleton"
      {...props}
    >
      <div className="flex items-center justify-between gap-3 p-4">
        <Skeleton className="h-2.5 w-32 rounded-full" tone="muted" />
        <Skeleton className="size-5 rounded-full" tone="soft" shimmer={false} />
      </div>
      {expanded && (
        <div className="space-y-2 border-t border-border/70 px-4 py-3">
          {Array.from({ length: contentLines }).map((_, index) => (
            <Skeleton
              key={index}
              className={cn(
                "h-2.5 rounded-full",
                index === contentLines - 1 ? "w-2/3" : "w-full",
              )}
              tone="muted"
            />
          ))}
        </div>
      )}
    </div>
  )
}

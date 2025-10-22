import * as React from "react"

import { cn } from "@/lib/utils"

import { Skeleton } from "./skeleton"

interface ScrollAreaSkeletonProps extends React.ComponentProps<"div"> {
  height?: number
  items?: number
}

export function ScrollAreaSkeleton({
  className,
  height = 240,
  items = 6,
  ...props
}: ScrollAreaSkeletonProps) {
  const itemCount = Math.max(3, items)

  return (
    <div
      className={cn(
        "relative rounded-lg border border-border/70 bg-white/60",
        className,
      )}
      style={{ height }}
      data-slot="scroll-area-skeleton"
      {...props}
    >
      <div className="h-full overflow-hidden rounded-[inherit] p-3">
        <div className="flex flex-col gap-2">
          {Array.from({ length: itemCount }).map((_, index) => (
            <Skeleton
              key={index}
              className={cn(
                "h-9 w-full rounded-md",
                index === itemCount - 1 && "w-4/5",
              )}
              tone="soft"
            />
          ))}
        </div>
      </div>
      <Skeleton
        className="absolute right-1 top-2 bottom-2 w-2 rounded-full"
        tone="muted"
        shimmer={false}
      />
    </div>
  )
}

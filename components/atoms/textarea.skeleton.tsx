import * as React from "react"

import { cn } from "@/lib/utils"

import { Skeleton } from "./skeleton"

interface TextareaSkeletonProps extends React.ComponentProps<"div"> {
  withLabel?: boolean
  withHelperText?: boolean
  rows?: number
}

export function TextareaSkeleton({
  className,
  withLabel = false,
  withHelperText = false,
  rows = 4,
  ...props
}: TextareaSkeletonProps) {
  const visibleRows = Math.max(2, rows)

  return (
    <div className={cn("flex w-full flex-col gap-2", className)} {...props}>
      {withLabel && (
        <Skeleton
          data-slot="textarea-skeleton-label"
          className="h-2.5 w-28 rounded-full"
          tone="muted"
        />
      )}
      <Skeleton
        data-slot="textarea-skeleton"
        className="min-h-[3.5rem]"
        radius="sm"
        tone="soft"
        shimmer={false}
      >
        <div className="flex flex-col gap-2 px-3 py-3">
          {Array.from({ length: visibleRows }).map((_, index) => (
            <Skeleton
              key={index}
              className={cn(
                "h-2.5 rounded-full",
                index === visibleRows - 1 ? "w-3/4" : "w-full",
              )}
              tone="muted"
              shimmer
            />
          ))}
        </div>
      </Skeleton>
      {withHelperText && (
        <Skeleton
          data-slot="textarea-skeleton-helper"
          className="h-2 w-36 rounded-full"
          tone="muted"
        />
      )}
    </div>
  )
}

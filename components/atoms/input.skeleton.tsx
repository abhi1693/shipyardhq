import * as React from "react"

import { cn } from "@/lib/utils"

import { Skeleton } from "./skeleton"

interface InputSkeletonProps extends React.ComponentProps<"div"> {
  withLabel?: boolean
  withHelperText?: boolean
  showPrefix?: boolean
  showSuffix?: boolean
}

export function InputSkeleton({
  className,
  withLabel = false,
  withHelperText = false,
  showPrefix = false,
  showSuffix = false,
  ...props
}: InputSkeletonProps) {
  return (
    <div className={cn("flex w-full flex-col gap-2", className)} {...props}>
      {withLabel && (
        <Skeleton
          data-slot="input-skeleton-label"
          className="h-2.5 w-24 rounded-full"
          tone="muted"
        />
      )}
      <Skeleton
        data-slot="input-skeleton"
        className="h-9"
        radius="sm"
        tone="soft"
        shimmer={false}
      >
        <div className="relative flex h-full items-center gap-3 px-3">
          {showPrefix && (
            <Skeleton
              className="h-2.5 w-12 rounded-full"
              tone="muted"
              shimmer
            />
          )}
          <Skeleton className="h-2.5 flex-1 rounded-full" tone="muted" shimmer />
          {showSuffix && (
            <Skeleton className="size-5 rounded-full" tone="muted" shimmer />
          )}
        </div>
      </Skeleton>
      {withHelperText && (
        <Skeleton
          data-slot="input-skeleton-helper"
          className="h-2 w-32 rounded-full"
          tone="muted"
        />
      )}
    </div>
  )
}

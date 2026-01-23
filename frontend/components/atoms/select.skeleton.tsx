import * as React from "react"

import { cn } from "@/lib/utils"

import { Skeleton } from "./skeleton"

interface SelectSkeletonProps extends React.ComponentProps<"div"> {
  withLabel?: boolean
  withHelperText?: boolean
  triggerSize?: "sm" | "default"
  isOpen?: boolean
  items?: number
}

export function SelectSkeleton({
  className,
  withLabel = false,
  withHelperText = false,
  triggerSize = "default",
  isOpen = false,
  items = 4,
  ...props
}: SelectSkeletonProps) {
  const triggerHeight = triggerSize === "sm" ? "h-8" : "h-9"

  return (
    <div className={cn("flex w-full flex-col gap-2", className)} {...props}>
      {withLabel && (
        <Skeleton
          data-slot="select-skeleton-label"
          className="h-2.5 w-28 rounded-full"
          tone="muted"
        />
      )}
      <div className="relative w-fit min-w-[10rem]">
        <Skeleton
          data-slot="select-skeleton-trigger"
          className={cn(
            triggerHeight,
            "w-full px-3",
            "flex items-center justify-between gap-3 rounded-md",
          )}
          tone="soft"
          radius="sm"
          shimmer={false}
        >
          <div className="flex w-full items-center gap-2">
            <Skeleton
              className="h-2.5 flex-1 rounded-full"
              tone="muted"
              shimmer
            />
            <Skeleton className="size-4 rounded-full" tone="muted" shimmer />
          </div>
        </Skeleton>
        {isOpen && (
          <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-10">
            <Skeleton
              data-slot="select-skeleton-content"
              tone="soft"
              radius="sm"
              shimmer={false}
              className="flex flex-col gap-1 border border-white/10 p-1 shadow-lg"
            >
              {Array.from({ length: items }).map((_, index) => (
                <Skeleton
                  key={index}
                  className="h-8 rounded-sm px-2"
                  tone="muted"
                  shimmer
                />
              ))}
            </Skeleton>
          </div>
        )}
      </div>
      {withHelperText && (
        <Skeleton
          data-slot="select-skeleton-helper"
          className="h-2 w-36 rounded-full"
          tone="muted"
        />
      )}
    </div>
  )
}

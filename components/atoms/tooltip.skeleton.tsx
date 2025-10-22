import * as React from "react"

import { cn } from "@/lib/utils"

import { Skeleton } from "./skeleton"

interface TooltipSkeletonProps extends React.ComponentProps<"div"> {
  open?: boolean
  triggerWidth?: number | string
  contentWidth?: number | string
}

export function TooltipSkeleton({
  className,
  open = true,
  triggerWidth = "6rem",
  contentWidth = "8rem",
  ...props
}: TooltipSkeletonProps) {
  return (
    <div
      className={cn("inline-flex flex-col items-center gap-2", className)}
      data-slot="tooltip-skeleton"
      {...props}
    >
      <Skeleton
        className="h-9 rounded-md"
        tone="soft"
        shimmer={false}
        style={{ width: resolveSize(triggerWidth) }}
      />
      {open && (
        <Skeleton
          className="relative rounded-md px-3 py-2 text-center"
          tone="brand"
          style={{ width: resolveSize(contentWidth) }}
        >
          <Skeleton className="mx-auto h-2.5 w-3/4 rounded-full" tone="muted" />
          <span className="absolute left-1/2 top-full size-3 -translate-x-1/2 -translate-y-[2px] rotate-45 rounded-[2px] bg-[inherit]" />
        </Skeleton>
      )}
    </div>
  )
}

function resolveSize(value: number | string) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return `${value}px`
  }
  return value
}

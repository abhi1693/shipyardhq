import * as React from "react"

import { cn } from "@/lib/utils"

import { Skeleton } from "./skeleton"

interface SeparatorSkeletonProps extends React.ComponentProps<"div"> {
  orientation?: "horizontal" | "vertical"
  length?: number | string
}

export function SeparatorSkeleton({
  className,
  orientation = "horizontal",
  length,
  ...props
}: SeparatorSkeletonProps) {
  const style: React.CSSProperties = {}
  if (length !== undefined) {
    style[orientation === "horizontal" ? "width" : "height"] =
      typeof length === "number" ? `${length}px` : length
  }

  return (
    <Skeleton
      data-slot="separator-skeleton"
      className={cn(
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        className,
      )}
      tone="muted"
      radius="none"
      style={style}
      shimmer={false}
      {...props}
    />
  )
}

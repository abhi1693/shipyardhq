import * as React from "react"

import { cn } from "@/lib/utils"

import { Skeleton } from "./skeleton"

interface MedalSkeletonProps extends React.ComponentProps<"span"> {
  size?: number
}

export function MedalSkeleton({
  className,
  size = 28,
  ...props
}: MedalSkeletonProps) {
  const dimension = `${size}px`

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center",
        className,
      )}
      data-slot="medal-skeleton"
      style={{ width: dimension, height: dimension }}
      {...props}
    >
      <Skeleton
        className="size-full rounded-full"
        tone="brand"
        shimmer={false}
      />
    </span>
  )
}

export default MedalSkeleton

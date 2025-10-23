import * as React from "react"

import { ButtonSkeleton } from "@/components/atoms/button.skeleton"
import { Skeleton } from "@/components/atoms/skeleton"
import { cn } from "@/lib/utils"

interface RangeSelectorSkeletonProps
  extends React.ComponentProps<typeof Skeleton> {
  options?: number
}

export function RangeSelectorSkeleton({
  className,
  options = 4,
  tone = "soft",
  radius = "full",
  shimmer = false,
  ...props
}: RangeSelectorSkeletonProps) {
  const optionCount = Math.max(2, options)

  return (
    <Skeleton
      data-slot="range-selector-skeleton"
      tone={tone}
      radius={radius}
      shimmer={shimmer}
      className={cn(
        "inline-flex items-center gap-1 border border-white/30 px-1 py-1",
        className,
      )}
      {...props}
    >
      {Array.from({ length: optionCount }).map((_, index) => (
        <ButtonSkeleton
           
          key={index}
          size="sm"
          variant={index === 0 ? "default" : "ghost"}
          labelWidth="2.75rem"
          className="px-0"
        />
      ))}
    </Skeleton>
  )
}

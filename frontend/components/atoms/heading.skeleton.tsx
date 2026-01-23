import * as React from "react"

import { cn } from "@/lib/utils"

import { Skeleton } from "./skeleton"

interface HeadingSkeletonProps extends React.ComponentProps<"div"> {
  lines?: number
  centered?: boolean
}

export function HeadingSkeleton({
  className,
  lines = 2,
  centered = false,
  ...props
}: HeadingSkeletonProps) {
  const lineCount = Math.max(1, Math.min(lines, 3))

  return (
    <div
      className={cn(
        "flex flex-col space-y-2",
        centered && "items-center text-center",
        className,
      )}
      data-slot="heading-skeleton"
      {...props}
    >
      {Array.from({ length: lineCount }).map((_, index) => {
        const widths = ["w-2/3", "w-3/4", "w-1/2"]
        const width = widths[index] ?? widths[widths.length - 1]
        const height = index === 0 ? "h-6" : "h-2.5"

        return (
          <Skeleton
            key={index}
            className={cn(
              "mx-auto rounded-full",
              height,
              width,
              !centered && "mx-0",
            )}
            tone="muted"
          />
        )
      })}
    </div>
  )
}

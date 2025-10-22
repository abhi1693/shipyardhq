import * as React from "react"

import { cn } from "@/lib/utils"

import { Skeleton } from "./skeleton"

interface SwitchSkeletonProps extends React.ComponentProps<"div"> {
  label?: boolean
  description?: boolean
  align?: "start" | "end"
}

export function SwitchSkeleton({
  className,
  label = true,
  description = false,
  align = "start",
  ...props
}: SwitchSkeletonProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3",
        align === "start" ? "items-start" : "items-center",
        className,
      )}
      data-slot="switch-skeleton"
      {...props}
    >
      <Skeleton className="h-5 w-9 rounded-full px-1" tone="soft" shimmer={false}>
        <Skeleton className="size-4 rounded-full" tone="brand" />
      </Skeleton>
      {(label || description) && (
        <div className="space-y-1.5 pt-0.5">
          {label && (
            <Skeleton className="h-2.5 w-32 rounded-full" tone="muted" />
          )}
          {description && (
            <Skeleton className="h-2 w-40 rounded-full" tone="muted" />
          )}
        </div>
      )}
    </div>
  )
}

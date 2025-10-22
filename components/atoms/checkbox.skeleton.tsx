import * as React from "react"

import { cn } from "@/lib/utils"

import { Skeleton } from "./skeleton"

interface CheckboxSkeletonProps extends React.ComponentProps<"div"> {
  label?: boolean
  description?: boolean
}

export function CheckboxSkeleton({
  className,
  label = true,
  description = false,
  ...props
}: CheckboxSkeletonProps) {
  return (
    <div
      className={cn("flex items-start gap-3", className)}
      data-slot="checkbox-skeleton"
      {...props}
    >
      <Skeleton className="mt-0.5 size-4 rounded-md" tone="soft" />
      {(label || description) && (
        <div className="space-y-1.5">
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

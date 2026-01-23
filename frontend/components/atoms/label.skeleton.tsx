import * as React from "react"

import { cn } from "@/lib/utils"

import { Skeleton } from "./skeleton"

interface LabelSkeletonProps extends React.ComponentProps<"span"> {
  helper?: boolean
}

export function LabelSkeleton({
  className,
  helper = false,
  ...props
}: LabelSkeletonProps) {
  return (
    <span
      className={cn("flex flex-col gap-1", className)}
      data-slot="label-skeleton"
      {...props}
    >
      <Skeleton className="h-2.5 w-24 rounded-full" tone="muted" />
      {helper && <Skeleton className="h-2 w-32 rounded-full" tone="muted" />}
    </span>
  )
}

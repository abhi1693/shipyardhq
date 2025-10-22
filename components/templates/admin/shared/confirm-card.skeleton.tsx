import * as React from "react"

import { ButtonSkeleton } from "@/components/atoms/button.skeleton"
import { Skeleton } from "@/components/atoms/skeleton"
import { cn } from "@/lib/utils"

interface AdminConfirmCardSkeletonProps extends React.ComponentProps<"div"> {
  maxWidth?: "sm" | "md" | "lg"
}

const widthClass: Record<
  NonNullable<AdminConfirmCardSkeletonProps["maxWidth"]>,
  string
> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
}

export function AdminConfirmCardSkeleton({
  className,
  maxWidth = "md",
  ...props
}: AdminConfirmCardSkeletonProps) {
  return (
    <div
      className={cn("mx-auto w-full", widthClass[maxWidth], className)}
      data-slot="admin-confirm-card-skeleton"
      aria-hidden="true"
      {...props}
    >
      <Skeleton
        tone="soft"
        radius="lg"
        shimmer={false}
        inset
        className="space-y-6 p-6"
      >
        <div className="space-y-2">
          <Skeleton className="h-3.5 w-1/3 rounded-full" tone="muted" />
          <Skeleton
            className="h-2.5 w-2/3 rounded-full"
            tone="muted"
            shimmer={false}
          />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-2.5 w-full rounded-full" tone="muted" />
          <Skeleton className="h-2.5 w-5/6 rounded-full" tone="muted" />
        </div>
        <div className="flex justify-end gap-3">
          <ButtonSkeleton variant="outline" size="sm" labelWidth="4.5rem" />
          <ButtonSkeleton size="sm" labelWidth="6rem" />
        </div>
      </Skeleton>
    </div>
  )
}

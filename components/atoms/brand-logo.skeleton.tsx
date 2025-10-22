import * as React from "react"

import { cn } from "@/lib/utils"

import { Skeleton } from "./skeleton"

interface BrandLogoSkeletonProps extends React.ComponentProps<"div"> {
  size?: number
  variant?: "square" | "circle"
  accent?: boolean
}

export function BrandLogoSkeleton({
  className,
  size = 32,
  variant = "square",
  accent = false,
  ...props
}: BrandLogoSkeletonProps) {
  const dimension = `${size}px`

  return (
    <Skeleton
      data-slot="brand-logo-skeleton"
      className={cn(
        "flex items-center justify-center",
        variant === "circle" ? "rounded-full" : "rounded-lg",
        className,
      )}
      tone={accent ? "brand" : "soft"}
      style={{ width: dimension, height: dimension }}
      shimmer={false}
      {...props}
    >
      <Skeleton
        className={cn(
          "h-1/2 w-1/2",
          variant === "circle" ? "rounded-full" : "rounded-md",
        )}
        tone="muted"
      />
    </Skeleton>
  )
}

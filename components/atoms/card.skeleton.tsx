import * as React from "react"

import { cn } from "@/lib/utils"

import { Skeleton } from "./skeleton"

interface CardSkeletonProps extends React.ComponentProps<typeof Skeleton> {
  lines?: number
  showHeader?: boolean
  showFooter?: boolean
  actionWidth?: number | string
}

function resolveWidth(value?: number | string) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return `${value}px`
  }
  if (typeof value === "string") {
    return value
  }
  return undefined
}

export function CardSkeleton({
  className,
  lines = 3,
  showHeader = true,
  showFooter = false,
  actionWidth,
  tone = "soft",
  radius = "lg",
  shimmer = false,
  ...props
}: CardSkeletonProps) {
  const resolvedActionWidth = resolveWidth(actionWidth)

  return (
    <Skeleton
      data-slot="card-skeleton"
      className={cn("flex flex-col gap-6 p-6", className)}
      tone={tone}
      radius={radius}
      shimmer={shimmer}
      inset
      {...props}
    >
      {showHeader && (
        <div className="grid auto-rows-min gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
          <div className="space-y-2">
            <Skeleton className="h-3 w-40 rounded-full" tone="muted" />
            <Skeleton
              className="h-2.5 w-64 rounded-full"
              tone="muted"
              shimmer={false}
            />
          </div>
          <div className="flex justify-end md:justify-start">
            <Skeleton
              className="h-9 rounded-full"
              tone="soft"
              style={{
                width: resolvedActionWidth ?? "7.5rem",
              }}
            />
          </div>
        </div>
      )}

      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, index) => (
          <Skeleton
            key={index}
            className={cn(
              "h-2.5 rounded-full",
              index === 0 && "w-full",
              index === lines - 1
                ? "w-2/3"
                : index % 2 === 0
                  ? "w-11/12"
                  : "w-4/5",
            )}
            tone="muted"
          />
        ))}
      </div>

      {showFooter && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
          <div className="flex items-center gap-2">
            <Skeleton className="size-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-2.5 w-32 rounded-full" tone="muted" />
              <Skeleton className="h-2 w-20 rounded-full" tone="muted" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-28 rounded-full" tone="soft" />
            <Skeleton className="h-9 w-28 rounded-full" tone="soft" />
          </div>
        </div>
      )}
    </Skeleton>
  )
}

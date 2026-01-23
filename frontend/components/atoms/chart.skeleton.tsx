import * as React from "react"

import { cn } from "@/lib/utils"

import { Skeleton } from "./skeleton"

type ChartSkeletonVariant = "bar" | "line" | "pie" | "radar"

interface ChartSkeletonProps extends React.ComponentProps<"div"> {
  variant?: ChartSkeletonVariant
  series?: number
  showLegend?: boolean
  bars?: number
  showTitle?: boolean
}

export function ChartSkeleton({
  className,
  variant = "bar",
  series = 3,
  showLegend = false,
  bars = 6,
  showTitle = true,
  ...props
}: ChartSkeletonProps) {
  const seriesCount = Math.max(1, series)
  const barCount = Math.max(3, bars)

  return (
    <Skeleton
      data-slot="chart-skeleton"
      tone="soft"
      radius="lg"
      shimmer={false}
      className={cn(
        "flex w-full flex-col gap-4 rounded-xl border bg-white p-4 shadow-sm",
        className,
      )}
      {...props}
    >
      {showTitle && (
        <div className="space-y-2">
          <Skeleton className="h-3 w-1/3 rounded-full" tone="muted" />
          <Skeleton className="h-2.5 w-1/2 rounded-full" tone="muted" />
        </div>
      )}

      <div className="relative h-56 w-full overflow-hidden rounded-lg border border-dashed border-white/20 bg-transparent">
        {variant === "bar" && (
          <div className="absolute inset-x-6 inset-y-6 flex items-end gap-3">
            {Array.from({ length: barCount }).map((_, index) => (
              <Skeleton
                key={index}
                className="flex-1 rounded-full"
                tone="brand"
                style={{
                  height: `${40 + (((index + 1) * 45) % 120)}px`,
                }}
              />
            ))}
          </div>
        )}

        {variant === "line" && (
          <div className="absolute inset-8">
            {Array.from({ length: seriesCount }).map((_, seriesIndex) => (
              <svg
                key={seriesIndex}
                className="size-full"
                viewBox="0 0 100 40"
                preserveAspectRatio="none"
              >
                <polyline
                  points="0,30 20,15 40,25 60,10 80,18 100,8"
                  fill="none"
                  strokeWidth="3"
                  stroke="currentColor"
                  className={cn(
                    "text-white/40",
                    seriesIndex === 0 && "text-white/60",
                    seriesIndex === 1 && "text-white/45",
                  )}
                  style={{
                    transform: `translateY(${seriesIndex * 3}px)`,
                  }}
                />
              </svg>
            ))}
          </div>
        )}

        {variant === "pie" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative size-40 rounded-full border-8 border-white/25">
              <div className="absolute inset-2 rounded-full border-8 border-white/40" />
              <div className="absolute inset-8 rounded-full bg-white/25" />
            </div>
          </div>
        )}

        {variant === "radar" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative size-44">
              <div className="absolute inset-2 rotate-45 border border-white/20" />
              <div className="absolute inset-6 border border-white/25" />
              <div className="absolute inset-10 rotate-12 border border-white/30" />
              <div className="absolute inset-16 border border-white/35" />
              <div className="absolute inset-1 grid size-full place-items-center">
                <Skeleton className="h-16 w-16 rounded-full" tone="brand" />
              </div>
            </div>
          </div>
        )}
      </div>

      {showLegend && (
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {Array.from({ length: seriesCount }).map((_, index) => (
            <div key={index} className="flex items-center gap-2">
              <Skeleton className="size-2.5 rounded-full" tone="brand" />
              <Skeleton className="h-2 w-16 rounded-full" tone="muted" />
            </div>
          ))}
        </div>
      )}
    </Skeleton>
  )
}

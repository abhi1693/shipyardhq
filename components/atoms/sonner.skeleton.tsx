import * as React from "react"

import { cn } from "@/lib/utils"

import { Skeleton } from "./skeleton"

interface ToasterSkeletonProps extends React.ComponentProps<"div"> {
  toasts?: number
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right"
}

export function ToasterSkeleton({
  className,
  toasts = 2,
  position = "top-right",
  ...props
}: ToasterSkeletonProps) {
  const toastCount = Math.max(1, toasts)

  return (
    <div
      className={cn(
        "pointer-events-none fixed z-[100]",
        position.includes("top") ? "top-4" : "bottom-4",
        position.includes("right") ? "right-4" : "left-4",
        className,
      )}
      data-slot="toaster-skeleton"
      {...props}
    >
      <div className="flex flex-col gap-3">
        {Array.from({ length: toastCount }).map((_, index) => (
          <Skeleton
            key={index}
            className="w-72 rounded-xl border border-white/10 bg-white/90 p-4 shadow-lg"
            tone="soft"
            shimmer={false}
          >
            <Skeleton className="h-3 w-1/2 rounded-full" tone="muted" />
            <Skeleton className="mt-2 h-2 w-2/3 rounded-full" tone="muted" />
          </Skeleton>
        ))}
      </div>
    </div>
  )
}

import * as React from "react"

import { cn } from "@/lib/utils"

import { ButtonSkeleton } from "./button.skeleton"
import { HeadingSkeleton } from "./heading.skeleton"
import { Skeleton } from "./skeleton"

interface AlertModalSkeletonProps extends React.ComponentProps<"div"> {
  actions?: number
}

export function AlertModalSkeleton({
  className,
  actions = 2,
  ...props
}: AlertModalSkeletonProps) {
  const actionCount = Math.max(1, actions)

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-black/40",
        className,
      )}
      data-slot="alert-modal-skeleton"
      {...props}
    >
      <Skeleton
        tone="soft"
        radius="lg"
        shimmer={false}
        className="relative w-[min(32rem,calc(100%-2rem))] rounded-3xl border border-white/10 bg-white p-6 shadow-xl"
      >
        <HeadingSkeleton lines={2} className="items-start" centered={false} />
        <Skeleton className="mt-4 h-2.5 w-3/4 rounded-full" tone="muted" />
        <div className="mt-8 flex flex-wrap justify-end gap-3">
          {Array.from({ length: actionCount }).map((_, index) => (
            <ButtonSkeleton
              key={index}
              size="sm"
              variant={index === actionCount - 1 ? "destructive" : "outline"}
              labelWidth={index === actionCount - 1 ? "5.5rem" : "4.5rem"}
              className="min-w-[6.5rem]"
            />
          ))}
        </div>
      </Skeleton>
    </div>
  )
}

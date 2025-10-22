import * as React from "react"

import { cn } from "@/lib/utils"

import { ButtonSkeleton } from "./button.skeleton"
import { HeadingSkeleton } from "./heading.skeleton"
import { Skeleton } from "./skeleton"

type SheetSide = "top" | "right" | "bottom" | "left"

interface SheetSkeletonProps extends React.ComponentProps<"div"> {
  side?: SheetSide
  lines?: number
  actions?: number
}

export function SheetSkeleton({
  className,
  side = "right",
  lines = 6,
  actions = 1,
  ...props
}: SheetSkeletonProps) {
  const lineCount = Math.max(2, lines)

  const panelClass = cn(
    "fixed z-50 flex flex-col gap-4 border border-white/10 bg-white shadow-xl",
    side === "right" && "inset-y-0 right-0 w-[min(24rem,calc(100%-3rem))]",
    side === "left" && "inset-y-0 left-0 w-[min(24rem,calc(100%-3rem))]",
    side === "top" && "inset-x-0 top-0 h-[min(22rem,calc(100%-3rem))]",
    side === "bottom" && "inset-x-0 bottom-0 h-[min(22rem,calc(100%-3rem))]",
  )

  return (
    <div
      className={cn("fixed inset-0 z-40 flex", className)}
      data-slot="sheet-skeleton"
      {...props}
    >
      <div className="absolute inset-0 bg-black/40" />
      <Skeleton
        tone="soft"
        radius="none"
        shimmer={false}
        className={panelClass}
      >
        <div className="relative flex flex-1 flex-col gap-4 p-5">
          <Skeleton
            className="absolute right-4 top-4 size-8 rounded-full"
            tone="muted"
            shimmer={false}
          />
          <HeadingSkeleton centered={false} className="pt-4" />
          <div className="space-y-2">
            {Array.from({ length: lineCount }).map((_, index) => (
              <Skeleton
                key={index}
                className={cn(
                  "h-2.5 rounded-full",
                  index % 3 === 2 ? "w-3/4" : "w-full",
                )}
                tone="muted"
              />
            ))}
          </div>
        </div>
        {actions > 0 && (
          <div className="flex flex-wrap justify-end gap-3 border-t border-white/20 px-5 py-4">
            {Array.from({ length: actions }).map((_, index) => (
              <ButtonSkeleton
                key={index}
                size="sm"
                variant={index === actions - 1 ? "default" : "outline"}
                labelWidth={index === actions - 1 ? "5rem" : "4rem"}
              />
            ))}
          </div>
        )}
      </Skeleton>
    </div>
  )
}

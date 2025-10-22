import * as React from "react"

import { AvatarSkeleton } from "@/components/atoms/avatar.skeleton"
import { BadgeSkeleton } from "@/components/atoms/badge.skeleton"
import { Skeleton } from "@/components/atoms/skeleton"
import { cn } from "@/lib/utils"

interface ProductCompactCardSkeletonProps extends React.ComponentProps<"div"> {
  showCategory?: boolean
  showBadges?: boolean
  badgeCount?: number
  withMeta?: boolean
}

export function ProductCompactCardSkeleton({
  className,
  showCategory = true,
  showBadges = false,
  badgeCount = 2,
  withMeta = false,
  ...props
}: ProductCompactCardSkeletonProps) {
  const badgesToRender = showBadges ? Math.max(1, badgeCount) : 0

  return (
    <div
      className={cn(
        "relative flex h-full flex-col gap-3 rounded-2xl border border-border/35 bg-white/85 p-4 text-left shadow-[0_26px_70px_-62px_rgba(7,58,104,0.28)] backdrop-blur-[2px] transition-none dark:bg-slate-900/70",
        "pointer-events-none select-none",
        className,
      )}
      data-slot="product-compact-card-skeleton"
      {...props}
    >
      <div className="flex items-start gap-3">
        <AvatarSkeleton size={40} className="shrink-0" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-3 w-3/4 rounded-full" tone="muted" />
          <Skeleton className="h-2.5 w-full rounded-full" tone="muted" />
        </div>
        {withMeta ? (
          <Skeleton className="h-5 w-12 rounded-full" tone="muted" />
        ) : null}
      </div>

      {badgesToRender > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {Array.from({ length: badgesToRender }).map((_, index) => (
            <BadgeSkeleton
              key={index}
              variant="outline"
              labelWidth={index % 2 === 0 ? "3.5rem" : "4.25rem"}
              leadingIcon
              className="h-8"
            />
          ))}
        </div>
      ) : null}

      <div className="mt-auto pt-2">
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border/45 bg-muted/30 px-3 py-2">
          {showCategory ? (
            <Skeleton className="h-2.5 w-2/3 rounded-full" tone="muted" />
          ) : (
            <Skeleton className="h-2.5 w-1/2 rounded-full" tone="muted" />
          )}
          <Skeleton
            className="size-8 shrink-0 rounded-lg"
            tone="brand"
            shimmer={false}
          />
        </div>
      </div>
    </div>
  )
}

export default ProductCompactCardSkeleton

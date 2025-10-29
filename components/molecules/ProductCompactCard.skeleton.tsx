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
        "pointer-events-none select-none",
        "flex h-full flex-col rounded-xl border border-border/35 bg-white/85 p-5 text-left dark:bg-slate-900/70",
        className,
      )}
      data-slot="product-compact-card-skeleton"
      {...props}
    >
      <div className="flex flex-1 items-start gap-4">
        <AvatarSkeleton size={48} className="shrink-0" />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-2">
              <Skeleton className="h-3.5 w-3/4 rounded-full" tone="muted" />
              <Skeleton className="h-3 w-full rounded-full" tone="muted" />
            </div>
            {withMeta ? (
              <Skeleton className="h-5 w-12 rounded-full" tone="muted" />
            ) : null}
          </div>
          <Skeleton className="h-3 w-2/3 rounded-full" tone="muted" />
        </div>
      </div>
      <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-4">
        {showCategory ? (
          <BadgeSkeleton variant="outline" labelWidth="4rem" className="h-7" />
        ) : null}
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-end justify-end gap-2">
            <Skeleton
              className="h-14 w-12 rounded-lg border border-border/45"
              tone="muted"
            />
            <Skeleton
              className="h-14 w-12 rounded-lg border border-border/45"
              tone="muted"
            />
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {Array.from({ length: badgesToRender }).map((_, index) => (
              <BadgeSkeleton
                key={`badge-${index}`}
                variant="outline"
                labelWidth={index % 2 === 0 ? "3.75rem" : "4.25rem"}
                leadingIcon
                className="h-7"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProductCompactCardSkeleton

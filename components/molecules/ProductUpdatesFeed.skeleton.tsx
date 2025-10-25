import * as React from "react"

import { AvatarSkeleton } from "@/components/atoms/avatar.skeleton"
import { BadgeSkeleton } from "@/components/atoms/badge.skeleton"
import { ButtonSkeleton } from "@/components/atoms/button.skeleton"
import { HeadingSkeleton } from "@/components/atoms/heading.skeleton"
import { Skeleton } from "@/components/atoms/skeleton"
import { cn } from "@/lib/utils"

interface ProductUpdatesFeedSkeletonProps
  extends React.ComponentProps<"section"> {
  count?: number
}

export function ProductUpdatesFeedSkeleton({
  className,
  count = 4,
  ...props
}: ProductUpdatesFeedSkeletonProps) {
  const items = Array.from({ length: Math.max(1, count) })

  return (
    <section
      className={cn(
        "rounded-2xl border border-border bg-white p-5 shadow-sm",
        className,
      )}
      data-slot="product-updates-feed-skeleton"
      {...props}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <BadgeSkeleton
            variant="outline"
            labelWidth="7rem"
            leadingIcon
            className="h-7"
          />
          <HeadingSkeleton lines={2} centered={false} />
        </div>
        <Skeleton className="h-2.5 w-12 rounded-full" tone="muted" />
      </div>

      <div className="mt-4 space-y-4">
        {items.map((_, index) => (
          <article
            key={index}
            className="flex gap-3 rounded-xl border border-border/70 bg-white/95 p-3 shadow-xs"
          >
            <AvatarSkeleton size={48} />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Skeleton className="h-3 w-4/5 rounded-full" tone="muted" />
              <Skeleton className="h-2.5 w-1/2 rounded-full" tone="muted" />
              <Skeleton className="h-2.5 w-full rounded-full" tone="muted" />
            </div>
          </article>
        ))}
      </div>

      <div className="mt-5">
        <ButtonSkeleton variant="link" size="sm" labelWidth="9rem" />
      </div>
    </section>
  )
}

export default ProductUpdatesFeedSkeleton

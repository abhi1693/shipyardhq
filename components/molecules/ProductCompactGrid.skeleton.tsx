import * as React from "react"

import { cn } from "@/lib/utils"

import ProductFeedCardSkeleton from "./ProductFeedCard.skeleton"

interface ProductCompactGridSkeletonProps extends React.ComponentProps<"div"> {
  count?: number
  columns?: string
  showCategory?: boolean
  showBadges?: boolean
  withMeta?: boolean
}

export function ProductCompactGridSkeleton({
  className,
  count = 8,
  columns = "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4",
  showCategory = true,
  showBadges = false,
  withMeta = false,
  ...props
}: ProductCompactGridSkeletonProps) {
  const items = React.useMemo(
    () => Array.from({ length: Math.max(1, count) }),
    [count],
  )

  return (
    <div
      className={cn(
        columns
          ? cn("grid auto-rows-[minmax(0,1fr)] gap-5", columns)
          : "space-y-4",
        className,
      )}
      data-slot="product-compact-grid-skeleton"
      {...props}
    >
      {items.map((_, index) => (
        <ProductFeedCardSkeleton
          key={index}
          showCategory={showCategory}
          showBadges={showBadges}
          showMetaBadge={withMeta}
        />
      ))}
    </div>
  )
}

export default ProductCompactGridSkeleton

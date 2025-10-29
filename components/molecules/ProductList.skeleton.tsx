import * as React from "react"

import { cn } from "@/lib/utils"

import ProductFeedCardSkeleton from "./ProductFeedCard.skeleton"

interface ProductListSkeletonProps extends React.ComponentProps<"div"> {
  count?: number
  columns?: string // deprecated; retained for backwards compatibility
  showCategory?: boolean
  showBadges?: boolean
  showMetaBadge?: boolean
}

export function ProductListSkeleton({
  className,
  count = 6,
  columns: _columns = "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4",
  showCategory = true,
  showBadges = false,
  showMetaBadge = false,
  ...props
}: ProductListSkeletonProps) {
  void _columns
  const items = React.useMemo(
    () => Array.from({ length: Math.max(1, count) }),
    [count],
  )

  return (
    <div
      className={cn("space-y-4", className)}
      data-slot="product-list-skeleton"
      {...props}
    >
      {items.map((_, index) => (
        <ProductFeedCardSkeleton
          key={index}
          showCategory={showCategory}
          showBadges={showBadges}
          showMetaBadge={showMetaBadge}
        />
      ))}
    </div>
  )
}

export default ProductListSkeleton

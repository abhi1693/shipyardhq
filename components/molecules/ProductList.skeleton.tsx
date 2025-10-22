import * as React from "react"

import { cn } from "@/lib/utils"

import { ProductCompactCardSkeleton } from "./ProductCompactCard.skeleton"

interface ProductListSkeletonProps extends React.ComponentProps<"div"> {
  count?: number
  columns?: string
  showCategory?: boolean
  showBadges?: boolean
  showMetaBadge?: boolean
}

export function ProductListSkeleton({
  className,
  count = 6,
  columns = "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4",
  showCategory = true,
  showBadges = false,
  showMetaBadge = false,
  ...props
}: ProductListSkeletonProps) {
  const items = React.useMemo(
    () => Array.from({ length: Math.max(1, count) }),
    [count],
  )

  return (
    <div
      className={cn("grid auto-rows-[minmax(0,1fr)] gap-5", columns, className)}
      data-slot="product-list-skeleton"
      {...props}
    >
      {items.map((_, index) => (
        <ProductCompactCardSkeleton
          // eslint-disable-next-line react/no-array-index-key -- order not semantically meaningful
          key={index}
          showCategory={showCategory}
          showBadges={showBadges}
          withMeta={showMetaBadge}
        />
      ))}
    </div>
  )
}

export default ProductListSkeleton

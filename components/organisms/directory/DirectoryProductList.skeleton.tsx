import * as React from "react"

import { cn } from "@/lib/utils"

import ProductFeedCardSkeleton from "@/components/molecules/ProductFeedCard.skeleton"

interface DirectoryProductListSkeletonProps
  extends React.ComponentProps<"div"> {
  count?: number
  columns?: string
  showCategory?: boolean
  showBadges?: boolean
  showMetaBadge?: boolean
}

export function DirectoryProductListSkeleton({
  className,
  count = 6,
  columns:
    _columns = "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4",
  showCategory = true,
  showBadges = false,
  showMetaBadge = false,
  ...props
}: DirectoryProductListSkeletonProps) {
  void _columns
  const listClassName = cn("space-y-4", className)

  return (
    <div
      className={listClassName}
      data-slot="directory-product-list-skeleton"
      {...props}
    >
      {Array.from({ length: count }).map((_, index) => (
        <ProductFeedCardSkeleton
          key={`directory-product-list-skeleton-${index}`}
          showCategory={showCategory}
          showBadges={showBadges}
          showMetaBadge={showMetaBadge}
        />
      ))}
    </div>
  )
}

export default DirectoryProductListSkeleton

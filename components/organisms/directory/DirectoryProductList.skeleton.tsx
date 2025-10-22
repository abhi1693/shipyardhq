import * as React from "react"

import { cn } from "@/lib/utils"

import { ProductListSkeleton } from "@/components/molecules/ProductList.skeleton"

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
  columns = "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4",
  showCategory = true,
  showBadges = false,
  showMetaBadge = false,
  ...props
}: DirectoryProductListSkeletonProps) {
  return (
    <div
      className={cn("contents", className)}
      data-slot="directory-product-list-skeleton"
      {...props}
    >
      <ProductListSkeleton
        count={count}
        columns={columns}
        showCategory={showCategory}
        showBadges={showBadges}
        showMetaBadge={showMetaBadge}
      />
    </div>
  )
}

export default DirectoryProductListSkeleton

import { cn } from "@/lib/utils"

import ProductFeedCardSkeleton from "@/components/molecules/ProductFeedCard.skeleton"

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
  withMeta = false,
  ...props
}: ProductCompactCardSkeletonProps) {
  return (
    <div
      className={cn(className)}
      data-slot="product-compact-card-skeleton"
      {...props}
    >
      <ProductFeedCardSkeleton
        showCategory={showCategory}
        showBadges={showBadges}
        showMetaBadge={withMeta}
      />
    </div>
  )
}

export default ProductCompactCardSkeleton

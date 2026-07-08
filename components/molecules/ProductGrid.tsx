"use client"

import { Fragment, type ReactNode } from "react"

import ProductFeedCardSkeleton from "@/components/molecules/ProductFeedCard.skeleton"
import InfiniteProductGrid from "@/components/molecules/InfiniteProductGrid"
import {
  ProductCard,
  type ProductCardItem,
} from "@/components/molecules/ProductCard"
import { cn } from "@/lib/utils"

const DEFAULT_FEED_SKELETON_COUNT = 3

interface InfiniteConfig {
  hasMore: boolean
  loadPage: (page: number) => Promise<{
    items: ProductCardItem[]
    hasMore: boolean
  }>
  initialPage?: number
  resetKey?: string | number | boolean
  loadingSkeletonCount?: number
  sentinelMargin?: string
}

interface ProductGridProps {
  items: ProductCardItem[]
  className?: string
  infinite?: InfiniteConfig
  emptyState?: ReactNode
  endMessage?: ReactNode
  renderAfterSponsoredCard?: (context: {
    product: ProductCardItem
    index: number
  }) => ReactNode
}

const renderSkeleton = (count: number, className?: string) => (
  <div className={cn("space-y-6", className)} aria-hidden="true">
    {Array.from({ length: count }).map((_, index) => (
      <ProductFeedCardSkeleton key={`product-grid-feed-skeleton-${index}`} />
    ))}
  </div>
)

export default function ProductGrid({
  items,
  className,
  infinite,
  emptyState,
  endMessage,
  renderAfterSponsoredCard,
}: ProductGridProps) {
  const listClassName = cn("space-y-4", className)

  const renderItems = (list: ProductCardItem[]) => {
    const renderAd = renderAfterSponsoredCard
    const lastSponsoredIndex = list.reduce(
      (lastIndex, product, index) =>
        Boolean(product.sponsored ?? product.isSponsored) ? index : lastIndex,
      -1,
    )
    const adBoundaryIndex = lastSponsoredIndex >= 0 ? lastSponsoredIndex : 0

    return (
      <div className={listClassName} data-slot="product-grid-feed">
        {list.map((product, index) => {
          const shouldRenderAd = Boolean(renderAd) && index === adBoundaryIndex

          return (
            <Fragment key={product.id}>
              <ProductCard product={product} />
              {shouldRenderAd && renderAd ? renderAd({ product, index }) : null}
            </Fragment>
          )
        })}
      </div>
    )
  }

  if (infinite) {
    return (
      <InfiniteProductGrid
        initialItems={items}
        initialHasMore={infinite.hasMore}
        initialPage={infinite.initialPage}
        loadPage={infinite.loadPage}
        resetKey={infinite.resetKey}
        loadingSkeletonCount={
          infinite.loadingSkeletonCount ?? DEFAULT_FEED_SKELETON_COUNT
        }
        emptyState={emptyState}
        endMessage={endMessage}
        renderItems={renderItems}
        renderLoadingSkeleton={(count) => renderSkeleton(count, className)}
        sentinelMargin={infinite.sentinelMargin}
      />
    )
  }

  if (!items.length && emptyState) {
    return <div className={className}>{emptyState}</div>
  }

  return renderItems(items)
}

"use client"

import type { ReactNode } from "react"

import ProductFeedCardSkeleton from "@/components/molecules/ProductFeedCard.skeleton"
import InfiniteProductGrid from "@/components/molecules/InfiniteProductGrid"
import { ProductCard, type ProductCardItem } from "@/components/molecules/ProductCard"

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
}

interface ProductGridProps {
  items: ProductCardItem[]
  className?: string
  infinite?: InfiniteConfig
  emptyState?: ReactNode
  endMessage?: ReactNode
}

const renderSkeleton = (count: number, className?: string) => (
  <div className={className}>
    <div className="space-y-6" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <ProductFeedCardSkeleton
          key={`product-grid-feed-skeleton-${index}`}
        />
      ))}
    </div>
  </div>
)

export default function ProductGrid({
  items,
  className,
  infinite,
  emptyState,
  endMessage,
}: ProductGridProps) {
  const renderItems = (list: ProductCardItem[]) => (
    <div className={className}>
      <div className="space-y-4" data-slot="product-grid-feed">
        {list.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  )

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
      />
    )
  }

  if (!items.length && emptyState) {
    return <div className={className}>{emptyState}</div>
  }

  return renderItems(items)
}

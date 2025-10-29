"use client"

import type { ReactNode } from "react"

import ProductFeedCardSkeleton from "@/components/molecules/ProductFeedCard.skeleton"
import InfiniteProductGrid from "@/components/molecules/InfiniteProductGrid"
import { ProductCard, type ProductCardItem } from "@/components/molecules/ProductCard"
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
}

const renderSkeleton = (count: number, className?: string) => (
  <div className={cn("space-y-6", className)} aria-hidden="true">
    {Array.from({ length: count }).map((_, index) => (
      <ProductFeedCardSkeleton
        key={`product-grid-feed-skeleton-${index}`}
      />
    ))}
  </div>
)

export default function ProductGrid({
  items,
  className,
  infinite,
  emptyState,
  endMessage,
}: ProductGridProps) {
  const listClassName = cn("space-y-4", className)

  const renderItems = (list: ProductCardItem[]) => (
    <div className={listClassName} data-slot="product-grid-feed">
      {list.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
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
        sentinelMargin={infinite.sentinelMargin}
      />
    )
  }

  if (!items.length && emptyState) {
    return <div className={className}>{emptyState}</div>
  }

  return renderItems(items)
}

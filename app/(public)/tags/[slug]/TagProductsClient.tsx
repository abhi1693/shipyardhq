"use client"

import { useCallback, useMemo } from "react"

import { loadMoreTagProducts } from "@/actions/public/tags/loadMore"
import ProductGrid from "@/components/molecules/ProductGrid"
import type { ProductCardItem } from "@/components/molecules/ProductCard"
import type { CompactProductItem } from "@/components/molecules/ProductCompactGrid"
import { EmptyState } from "@/components/molecules/empty-state"

interface TagProductsClientProps {
  slug: string
  initialItems: CompactProductItem[]
  initialHasMore: boolean
  initialPage: number
  total: number
}

const TAG_GRID_PAGE_SIZE = 24

export function TagProductsClient({
  slug,
  initialItems,
  initialHasMore,
  initialPage,
  total,
}: TagProductsClientProps) {
  const mapToProductCardItem = useCallback(
    (item: CompactProductItem): ProductCardItem => ({
      ...item,
      voteCount: item.analytics?.upvotes ?? 0,
      categoryName: item.category?.name ?? null,
    }),
    [],
  )

  const initialCardItems = useMemo(
    () => initialItems.map(mapToProductCardItem),
    [initialItems, mapToProductCardItem],
  )

  const loadPage = useCallback(
    async (page: number) => {
      const result = await loadMoreTagProducts({ slug, page })
      return {
        items: (result.items as CompactProductItem[]).map(
          mapToProductCardItem,
        ),
        hasMore: result.hasMore,
      }
    },
    [mapToProductCardItem, slug],
  )

  const endMessage = useMemo(() => {
    if (!total) return null
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        Showing all {total} tagged products.
      </p>
    )
  }, [total])

  return (
    <ProductGrid
      items={initialCardItems}
      infinite={{
        hasMore: initialHasMore,
        initialPage,
        loadPage,
        resetKey: `${slug}:${total}`,
        loadingSkeletonCount: TAG_GRID_PAGE_SIZE,
      }}
      emptyState={
        <EmptyState
          title="No products yet"
          description="Products will appear here once they use this keyword."
        />
      }
      endMessage={endMessage}
    />
  )
}

export default TagProductsClient

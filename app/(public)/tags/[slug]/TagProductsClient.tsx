"use client"

import { useCallback, useMemo } from "react"

import { loadMoreTagProducts } from "@/actions/public/tags/loadMore"
import ProductGrid from "@/components/molecules/ProductGrid"
import type {
  ProductCardBase,
  ProductCardItem,
} from "@/components/molecules/ProductCard"
import { toProductCardItem } from "@/lib/products/card-item"
import { EmptyState } from "@/components/molecules/empty-state"

interface TagProductsClientProps {
  slug: string
  initialItems: ProductCardBase[]
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
    (item: ProductCardBase): ProductCardItem => toProductCardItem(item),
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
        items: (result.items as ProductCardBase[]).map(
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

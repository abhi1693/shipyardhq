"use client"

import { useCallback, useMemo } from "react"

import ProductGrid from "@/components/molecules/ProductGrid"
import type { ProductCardBase } from "@/components/molecules/ProductCard"
import { toProductCardItem } from "@/lib/products/card-item"
import { EmptyState } from "@/components/molecules/empty-state"
import { getProductFeedPage } from "@/actions/public/products/feedPage"

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
  const initialCardItems = useMemo(
    () => initialItems.map((item) => toProductCardItem(item)),
    [initialItems],
  )

  const loadPage = useCallback(
    async (page: number) => {
      const result = await getProductFeedPage({
        kind: "tag",
        slug,
        page,
      })
      return {
        items: (result.items as ProductCardBase[]).map((item) =>
          toProductCardItem(item),
        ),
        hasMore: result.hasMore,
      }
    },
    [slug],
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

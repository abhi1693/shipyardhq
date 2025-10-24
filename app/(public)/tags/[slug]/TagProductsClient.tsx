"use client"

import { useCallback, useMemo } from "react"

import { loadMoreTagProducts } from "@/actions/public/tags/loadMore"
import InfiniteProductGrid from "@/components/molecules/InfiniteProductGrid"
import { EmptyState } from "@/components/molecules/empty-state"
import type { CompactProductItem } from "@/components/molecules/ProductCompactGrid"

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
  const loadPage = useCallback(
    async (page: number) => {
      const result = await loadMoreTagProducts({ slug, page })
      return {
        items: result.items as CompactProductItem[],
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
    <InfiniteProductGrid
      initialItems={initialItems}
      initialHasMore={initialHasMore}
      initialPage={initialPage}
      loadPage={loadPage}
      resetKey={`${slug}:${total}`}
      loadingSkeletonCount={TAG_GRID_PAGE_SIZE}
      gridOverrides={{
        columns: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
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

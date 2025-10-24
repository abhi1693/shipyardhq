"use client"

import { useCallback, useMemo } from "react"

import type { CompactProductItem } from "@/components/molecules/ProductCompactGrid"
import { loadMoreProducts } from "@/actions/public/browse/loadMore"
import InfiniteProductGrid from "@/components/molecules/InfiniteProductGrid"

type ProductGridItem = CompactProductItem

interface ProductGridClientProps {
  initialProducts: ProductGridItem[]
  initialHasMore: boolean
  initialPage: number
  searchParams: {
    useCase?: string
    category?: string
    verified?: boolean
    sort?: string
    q?: string
  }
}

export default function ProductGridClient({
  initialProducts,
  initialHasMore,
  initialPage,
  searchParams,
}: ProductGridClientProps) {
  const normalizedSearch = useMemo(
    () => ({
      useCase: searchParams.useCase,
      category: searchParams.category,
      verified: searchParams.verified,
      sort: searchParams.sort,
      q: searchParams.q,
    }),
    [
      searchParams.category,
      searchParams.q,
      searchParams.sort,
      searchParams.useCase,
      searchParams.verified,
    ],
  )

  const resetKey = useMemo(
    () => JSON.stringify(normalizedSearch),
    [normalizedSearch],
  )

  const loadPage = useCallback(
    async (page: number) => {
      const result = await loadMoreProducts({
        ...normalizedSearch,
        page,
      })

      return {
        items: result.products as ProductGridItem[],
        hasMore: result.hasMore,
      }
    },
    [normalizedSearch],
  )

  return (
    <InfiniteProductGrid
      initialItems={initialProducts}
      initialHasMore={initialHasMore}
      initialPage={initialPage}
      loadPage={loadPage}
      resetKey={resetKey}
    />
  )
}

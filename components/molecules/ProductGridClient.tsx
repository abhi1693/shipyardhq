"use client"

import { useCallback, useMemo } from "react"

import type { CompactProductItem } from "@/components/molecules/ProductCompactGrid"
import { loadMoreProducts } from "@/actions/public/browse/loadMore"
import ProductGrid from "@/components/molecules/ProductGrid"
import type { ProductCardItem } from "@/components/molecules/ProductCard"

type BrowseProduct = CompactProductItem

const toProductCardItem = (item: BrowseProduct): ProductCardItem => ({
  ...item,
  voteCount: item.analytics?.upvotes ?? 0,
  categoryName: item.category?.name ?? null,
})

interface ProductGridClientProps {
  initialProducts: BrowseProduct[]
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
  const initialItems = useMemo(
    () => initialProducts.map(toProductCardItem),
    [initialProducts],
  )

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
        items: result.products.map(toProductCardItem),
        hasMore: result.hasMore,
      }
    },
    [normalizedSearch],
  )

  return (
    <ProductGrid
      items={initialItems}
      infinite={{
        hasMore: initialHasMore,
        initialPage,
        loadPage,
        resetKey,
        loadingSkeletonCount: 3,
      }}
    />
  )
}

"use client"

import { useCallback, useMemo } from "react"

import type { AlternativeDetailProduct } from "@/actions/public/alternatives/actions"
import ProductGrid from "@/components/molecules/ProductGrid"
import type { ProductCardItem } from "@/components/molecules/ProductCard"
import { toProductCardItem } from "@/lib/products/card-item"
import { getProductFeedPage } from "@/actions/public/products/feedPage"

interface AlternativeProductsClientProps {
  alternativeId: string
  initialItems: AlternativeDetailProduct[]
  initialHasMore: boolean
  initialPage: number
  pageSize?: number
}

export function AlternativeProductsClient({
  alternativeId,
  initialItems,
  initialHasMore,
  initialPage,
  pageSize,
}: AlternativeProductsClientProps) {
  const mapToProductCardItem = useCallback(
    (item: AlternativeDetailProduct): ProductCardItem =>
      toProductCardItem(item),
    [],
  )

  const initialCardItems = useMemo(
    () => initialItems.map(mapToProductCardItem),
    [initialItems, mapToProductCardItem],
  )

  const loadPage = useCallback(
    async (page: number) => {
      const result = await getProductFeedPage({
        kind: "alternative",
        alternativeId,
        page,
        pageSize,
      })

      return {
        items: result.items.map(mapToProductCardItem),
        hasMore: result.hasMore,
      }
    },
    [alternativeId, mapToProductCardItem, pageSize],
  )

  return (
    <ProductGrid
      items={initialCardItems}
      infinite={{
        hasMore: initialHasMore,
        initialPage,
        loadPage,
        resetKey: alternativeId,
        loadingSkeletonCount: 3,
      }}
      endMessage={
        <p className="py-4 text-center text-sm text-muted-foreground">
          You&apos;ve reached the end of this alternatives list.
        </p>
      }
    />
  )
}

export default AlternativeProductsClient

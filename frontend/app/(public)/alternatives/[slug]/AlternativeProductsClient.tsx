"use client"

import { useCallback, useMemo } from "react"

import type { AlternativeDetailProduct } from "@/actions/public/alternatives/actions"
import ProductGrid from "@/components/molecules/ProductGrid"
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
  const initialCardItems = useMemo(
    () => initialItems.map((item) => toProductCardItem(item)),
    [initialItems],
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
        items: result.items.map((item) => toProductCardItem(item)),
        hasMore: result.hasMore,
      }
    },
    [alternativeId, pageSize],
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

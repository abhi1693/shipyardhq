"use client"

import { useCallback } from "react"

import type { AlternativeDetailProduct } from "@/actions/public/alternatives/actions"
import { loadMoreAlternativeProducts } from "@/actions/public/alternatives/loadMore"
import InfiniteProductGrid from "@/components/molecules/InfiniteProductGrid"

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
  const loadPage = useCallback(
    async (page: number) => {
      const result = await loadMoreAlternativeProducts({
        alternativeId,
        page,
        pageSize,
      })

      return {
        items: result.items,
        hasMore: result.hasMore,
      }
    },
    [alternativeId, pageSize],
  )

  return (
    <InfiniteProductGrid
      initialItems={initialItems}
      initialHasMore={initialHasMore}
      initialPage={initialPage}
      loadPage={loadPage}
      resetKey={alternativeId}
      endMessage={
        <p className="py-4 text-center text-sm text-muted-foreground">
          You&apos;ve reached the end of this alternatives list.
        </p>
      }
    />
  )
}

export default AlternativeProductsClient

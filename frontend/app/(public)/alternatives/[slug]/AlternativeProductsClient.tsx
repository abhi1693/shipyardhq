"use client"

import { useCallback, useMemo } from "react"

import type { PublicProductCard } from "@/lib/generated/fastapi/schemas"
import ProductGrid from "@/components/molecules/ProductGrid"
import type { ProductCardBase } from "@/components/molecules/ProductCard"
import { toProductCardItem } from "@/lib/products/card-item"
import { getAlternativeProductsApiV1PublicAlternativesSlugProductsGet } from "@/lib/generated/fastapi/public-homepage"

interface AlternativeProductsClientProps {
  slug: string
  initialItems: PublicProductCard[]
  initialHasMore: boolean
  initialPage: number
  pageSize?: number
}

export function AlternativeProductsClient({
  slug,
  initialItems,
  initialHasMore,
  initialPage,
  pageSize,
}: AlternativeProductsClientProps) {
  const toBaseCard = (item: PublicProductCard): ProductCardBase => ({
    ...item,
    scoreCount: item.scoreCount ?? undefined,
  })
  const initialCardItems = useMemo(
    () => initialItems.map((item) => toProductCardItem(toBaseCard(item))),
    [initialItems],
  )

  const loadPage = useCallback(
    async (page: number) => {
      const response =
        await getAlternativeProductsApiV1PublicAlternativesSlugProductsGet(
          slug,
          { page, pageSize },
        )
      if (response.status !== 200) {
        return {
          items: [],
          hasMore: false,
        }
      }
      const result = response.data

      return {
        items: result.items.map((item) => toProductCardItem(toBaseCard(item))),
        hasMore: result.hasMore,
      }
    },
    [pageSize, slug],
  )

  return (
    <ProductGrid
      items={initialCardItems}
      infinite={{
        hasMore: initialHasMore,
        initialPage,
        loadPage,
        resetKey: slug,
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

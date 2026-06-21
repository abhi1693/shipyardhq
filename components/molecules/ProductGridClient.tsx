"use client"

import { useCallback, useMemo } from "react"

import ProductGrid from "@/components/molecules/ProductGrid"
import type { ProductCardBase } from "@/components/molecules/ProductCard"
import { toProductCardItem as buildProductCardItem } from "@/lib/products/card-item"
import { getProductFeedPage } from "@/actions/public/products/feedPage"

type BrowseProduct = ProductCardBase

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
    platform?: string
    pricingModel?: string
    productType?: string
    badge?: string
    alternative?: string
  }
}

export default function ProductGridClient({
  initialProducts,
  initialHasMore,
  initialPage,
  searchParams,
}: ProductGridClientProps) {
  const initialItems = useMemo(
    () => initialProducts.map((item) => buildProductCardItem(item)),
    [initialProducts],
  )

  const normalizedSearch = useMemo(
    () => ({
      useCase: searchParams.useCase,
      category: searchParams.category,
      verified: searchParams.verified,
      sort: searchParams.sort,
      q: searchParams.q,
      platform: searchParams.platform,
      pricingModel: searchParams.pricingModel,
      productType: searchParams.productType,
      badge: searchParams.badge,
      alternative: searchParams.alternative,
    }),
    [
      searchParams.alternative,
      searchParams.badge,
      searchParams.category,
      searchParams.platform,
      searchParams.productType,
      searchParams.pricingModel,
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
      const result = await getProductFeedPage({
        kind: "browse",
        page,
        ...normalizedSearch,
      })

      return {
        items: result.items.map((item) => buildProductCardItem(item)),
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

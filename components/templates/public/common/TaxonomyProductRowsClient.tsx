"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { getProductFeedPage } from "@/actions/public/products/feedPage"
import type { ProductCardBase } from "@/components/molecules/ProductCard"
import ProductFeedCardSkeleton from "@/components/molecules/ProductFeedCard.skeleton"
import {
  buildTaxonomyProductSections,
  mapProductCardBaseToTaxonomyFeedItem,
  TaxonomyProductSections,
} from "@/components/templates/public/common/TaxonomyProductRows"

type TaxonomyRowsSearchParams = {
  useCase?: string
  category?: string
  verified?: boolean
  sort?: string
  q?: string
  platform?: string
  pricingModel?: string
  productType?: string
}

interface TaxonomyProductRowsClientProps {
  initialProducts: ProductCardBase[]
  initialHasMore: boolean
  initialPage: number
  referenceDateIso: string
  searchParams: TaxonomyRowsSearchParams
  initialContentRendered?: boolean
}

function LoadingRows({ count }: { count: number }) {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <ProductFeedCardSkeleton key={`taxonomy-row-skeleton-${index}`} />
      ))}
    </div>
  )
}

export function TaxonomyProductRowsClient({
  initialProducts,
  initialHasMore,
  initialPage,
  referenceDateIso,
  searchParams,
  initialContentRendered = false,
}: TaxonomyProductRowsClientProps) {
  const [items, setItems] = useState<ProductCardBase[]>(initialProducts)
  const [page, setPage] = useState(initialPage)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [isLoading, setIsLoading] = useState(false)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

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
    }),
    [
      searchParams.category,
      searchParams.platform,
      searchParams.pricingModel,
      searchParams.productType,
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

  useEffect(() => {
    setItems(initialProducts)
    setPage(initialPage)
    setHasMore(initialHasMore)
  }, [initialHasMore, initialPage, initialProducts, resetKey])

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return

    setIsLoading(true)
    try {
      const result = await getProductFeedPage({
        kind: "browse",
        page,
        ...normalizedSearch,
      })

      setItems((previous) => {
        const existingIds = new Set(previous.map((item) => item.id))
        const nextItems = result.items.filter(
          (item) => !existingIds.has(item.id),
        )
        return nextItems.length ? [...previous, ...nextItems] : previous
      })
      setHasMore(result.hasMore)
      setPage((current) => current + 1)
    } catch {
      setHasMore(false)
    } finally {
      setIsLoading(false)
    }
  }, [hasMore, isLoading, normalizedSearch, page])

  useEffect(() => {
    if (!hasMore) return
    const node = sentinelRef.current
    if (!node) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          loadMore()
        }
      },
      { rootMargin: "0px 0px 240px 0px" },
    )

    observer.observe(node)

    return () => {
      observer.disconnect()
    }
  }, [hasMore, loadMore, resetKey])

  const sections = buildTaxonomyProductSections(
    items.map((item) => mapProductCardBaseToTaxonomyFeedItem(item)),
    referenceDateIso,
  )
  const shouldRenderEmptyState = !initialContentRendered && !items.length

  return (
    <section className="space-y-6" data-testid="taxonomy-load-more">
      {sections.length ? <TaxonomyProductSections sections={sections} /> : null}

      {shouldRenderEmptyState ? (
        <p className="py-4 text-center text-sm text-[#43474c]">
          No products found.
        </p>
      ) : null}

      {isLoading ? <LoadingRows count={3} /> : null}

      {hasMore ? (
        <div
          ref={sentinelRef}
          aria-hidden="true"
          className="h-1 w-full"
          data-testid="browse-infinite-scroll-trigger"
        />
      ) : sections.length || initialContentRendered ? (
        <p className="py-4 text-center text-sm text-[#43474c]">
          You&apos;ve reached the end of this directory.
        </p>
      ) : null}
    </section>
  )
}

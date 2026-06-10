"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { getProductFeedPage } from "@/actions/public/products/feedPage"
import ProductFeedCardSkeleton from "@/components/molecules/ProductFeedCard.skeleton"
import type { ProductCardItem } from "@/components/molecules/ProductCard"
import { BrowseProductRow } from "@/components/templates/public/browse/BrowseProductRows"
import { toProductCardItem } from "@/lib/products/card-item"

type BrowseRowsSearchParams = {
  useCase?: string
  category?: string
  sort?: string
  q?: string
  platform?: string
  pricingModel?: string
  productType?: string
  minPrice?: number
  maxPrice?: number
  badge?: string
  backlinkVerified?: boolean
}

interface BrowseProductRowsClientProps {
  initialHasMore: boolean
  initialPage: number
  searchParams: BrowseRowsSearchParams
}

function renderLoadingSkeleton(count: number) {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <ProductFeedCardSkeleton key={`browse-row-skeleton-${index}`} />
      ))}
    </div>
  )
}

export function BrowseProductRowsClient({
  initialHasMore,
  initialPage,
  searchParams,
}: BrowseProductRowsClientProps) {
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const [items, setItems] = useState<ProductCardItem[]>([])
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [page, setPage] = useState(initialPage)
  const [isLoading, setIsLoading] = useState(false)

  const normalizedSearch = useMemo(
    () => ({
      useCase: searchParams.useCase,
      category: searchParams.category,
      sort: searchParams.sort,
      q: searchParams.q,
      platform: searchParams.platform,
      pricingModel: searchParams.pricingModel,
      productType: searchParams.productType,
      minPrice: searchParams.minPrice,
      maxPrice: searchParams.maxPrice,
      badge: searchParams.badge,
      backlinkVerified: searchParams.backlinkVerified,
    }),
    [
      searchParams.category,
      searchParams.badge,
      searchParams.backlinkVerified,
      searchParams.maxPrice,
      searchParams.minPrice,
      searchParams.platform,
      searchParams.pricingModel,
      searchParams.productType,
      searchParams.q,
      searchParams.sort,
      searchParams.useCase,
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
        items: result.items.map((item) => toProductCardItem(item)),
        hasMore: result.hasMore,
      }
    },
    [normalizedSearch],
  )

  useEffect(() => {
    setItems([])
    setHasMore(initialHasMore)
    setPage(initialPage)
  }, [initialHasMore, initialPage, resetKey])

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return

    setIsLoading(true)
    try {
      const result = await loadPage(page)
      setItems((previous) => {
        const previousIds = new Set(previous.map((item) => item.id))
        const nextItems = result.items.filter(
          (item) => !previousIds.has(item.id),
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
  }, [hasMore, isLoading, loadPage, page])

  useEffect(() => {
    if (!hasMore) return
    const node = sentinelRef.current
    if (!node) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void loadMore()
        }
      },
      { rootMargin: "0px 0px 200px 0px" },
    )

    observer.observe(node)

    return () => observer.disconnect()
  }, [hasMore, loadMore, resetKey])

  return (
    <section className="space-y-6" data-testid="browse-product-rows-client">
      {items.length ? (
        <div className="space-y-3">
          {items.map((item) => (
            <BrowseProductRow key={item.id} product={item} />
          ))}
        </div>
      ) : null}

      {isLoading ? renderLoadingSkeleton(3) : null}

      {hasMore ? (
        <div
          ref={sentinelRef}
          aria-hidden="true"
          className="h-1 w-full"
          data-testid="browse-infinite-scroll-trigger"
        />
      ) : items.length ? (
        <p className="py-4 text-center text-sm text-[#43474c]">
          You&apos;ve reached the end of the directory.
        </p>
      ) : null}
    </section>
  )
}

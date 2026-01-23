"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import ProductFeedList from "@/components/organisms/feed/ProductFeedList"
import type { HomepageFeedItem } from "@/lib/generated/fastapi/schemas"
import { DEFAULT_HOMEPAGE_FEED_VIEW } from "@/lib/homepage/feed-views"
import { getCategoryProductsPage } from "@/actions/public/categories/actions"

interface CategoryFeedClientProps {
  slug: string
  initialProducts: HomepageFeedItem[]
  initialPage: number
  pageSize: number
  initialHasMore: boolean
}

export function CategoryFeedClient({
  slug,
  initialProducts,
  initialPage,
  pageSize,
  initialHasMore,
}: CategoryFeedClientProps) {
  const normalizedInitialPage =
    Number.isFinite(initialPage) && initialPage > 0 ? initialPage : 2
  const normalizedPageSize =
    Number.isFinite(pageSize) && pageSize > 0 ? Math.floor(pageSize) : 20

  const [products, setProducts] = useState<HomepageFeedItem[]>(initialProducts)
  const [page, setPage] = useState<number>(normalizedInitialPage)
  const [hasMore, setHasMore] = useState<boolean>(initialHasMore)
  const [isLoading, setIsLoading] = useState(false)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  const resetKey = useMemo(
    () =>
      [
        slug,
        normalizedPageSize,
        normalizedInitialPage,
        initialProducts.map((item) => item.id).join("|"),
      ].join(":"),
    [initialProducts, normalizedInitialPage, normalizedPageSize, slug],
  )

  useEffect(() => {
    setProducts(initialProducts)
    setPage(normalizedInitialPage)
    setHasMore(initialHasMore)
  }, [initialHasMore, initialProducts, normalizedInitialPage, resetKey])

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return

    setIsLoading(true)
    try {
      const result = await getCategoryProductsPage({
        slug,
        page,
        pageSize: normalizedPageSize,
      })

      setProducts((previous) => {
        const existingIds = new Set(previous.map((item) => item.id))
        const nextItems = result.products.filter(
          (product) => !existingIds.has(product.id),
        )

        if (!nextItems.length) return previous
        return [...previous, ...nextItems]
      })

      setHasMore(result.hasMore)
      setPage((current) => {
        if (result.nextPage) return result.nextPage
        if (result.hasMore) return current + 1
        return current
      })
    } catch {
      setHasMore(false)
    } finally {
      setIsLoading(false)
    }
  }, [hasMore, isLoading, normalizedPageSize, page, slug])

  useEffect(() => {
    const node = sentinelRef.current
    if (!node || !hasMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        const isVisible = entries.some((entry) => entry.isIntersecting)
        if (isVisible) {
          loadMore()
        }
      },
      { rootMargin: "0px 0px 320px 0px" },
    )

    observer.observe(node)

    return () => {
      observer.disconnect()
    }
  }, [hasMore, loadMore, resetKey])

  return (
    <div className="space-y-4">
      <ProductFeedList
        activeFilter={DEFAULT_HOMEPAGE_FEED_VIEW}
        items={products}
        showRemaining
      />

      {hasMore ? (
        <div
          ref={sentinelRef}
          className="flex justify-center py-4 text-sm text-muted-foreground"
        >
          {isLoading ? "Loading more launches…" : "Keep scrolling for more"}
        </div>
      ) : null}
    </div>
  )
}

export default CategoryFeedClient

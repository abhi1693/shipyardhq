"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import type { HomepageFeedItem } from "@/actions/public/homepage/feed"
import { getCategoryProductsPage } from "@/actions/public/categories/server-actions"
import {
  buildTaxonomyProductSections,
  resolveTaxonomyReferenceDateIso,
  TaxonomyProductSections,
} from "@/components/templates/public/common/TaxonomyProductRows"

interface CategoryFeedClientProps {
  slug: string
  initialProducts: HomepageFeedItem[]
  initialPage: number
  pageSize: number
  referenceDateIso?: string | null
  initialHasMore: boolean
}

export function CategoryFeedClient({
  slug,
  initialProducts,
  initialPage,
  pageSize,
  referenceDateIso,
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

  const sections = useMemo(() => {
    const resolvedReferenceDateIso =
      referenceDateIso ?? resolveTaxonomyReferenceDateIso(products)
    return resolvedReferenceDateIso
      ? buildTaxonomyProductSections(products, resolvedReferenceDateIso)
      : []
  }, [products, referenceDateIso])

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

  if (!products.length && !hasMore) {
    return (
      <div className="rounded-lg border border-[#e2e8f0] bg-white p-8 text-center text-sm text-[#43474c]">
        No products have launched in this category yet.
      </div>
    )
  }

  return (
    <div className="space-y-12">
      <TaxonomyProductSections sections={sections} />

      {hasMore ? (
        <div
          ref={sentinelRef}
          className="flex justify-center py-4 text-sm text-[#43474c]"
        >
          {isLoading ? "Loading more launches..." : "Keep scrolling for more"}
        </div>
      ) : null}
    </div>
  )
}

export default CategoryFeedClient

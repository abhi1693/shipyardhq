"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import type { HomepageFeedItem } from "@/actions/public/homepage/feed"
import type { AlternativeDetailProduct } from "@/actions/public/alternatives/actions"
import { getProductFeedPage } from "@/actions/public/products/feedPage"
import {
  buildTaxonomyProductSections,
  resolveTaxonomyReferenceDateIso,
  TaxonomyProductSections,
} from "@/components/templates/public/common/TaxonomyProductRows"

interface AlternativeProductsClientProps {
  alternativeId: string
  initialItems: AlternativeDetailProduct[]
  initialHasMore: boolean
  initialPage: number
  pageSize?: number
  referenceDateIso?: string | null
}

const FALLBACK_TAGLINE =
  "Discover launch-ready tools from indie makers worldwide."

const coerceDateString = (value?: string | Date | null) => {
  if (!value) return ""
  return value instanceof Date ? value.toISOString() : String(value)
}

function toFeedItem(product: AlternativeDetailProduct): HomepageFeedItem {
  const isSponsored = Boolean(product.sponsored)

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    logo: product.logo,
    tagline: product.tagline || FALLBACK_TAGLINE,
    createdAt: coerceDateString(product.createdAt),
    updatedAt: coerceDateString(product.updatedAt),
    badges: product.badges ?? [],
    category: product.category?.name ?? null,
    categorySlug: product.category?.slug ?? null,
    upvoteCount: product.analytics?.upvotes ?? 0,
    scoreCount: product.scoreCount,
    isSponsored,
    isVoted: false,
    isVerified: Boolean(product.isVerified),
    variant: isSponsored ? "sponsored" : "default",
    interest: product.interest ?? null,
    shuffleRank: Math.random(),
  }
}

export function AlternativeProductsClient({
  alternativeId,
  initialItems,
  initialHasMore,
  initialPage,
  pageSize,
  referenceDateIso,
}: AlternativeProductsClientProps) {
  const normalizedInitialPage =
    Number.isFinite(initialPage) && initialPage > 0 ? initialPage : 2
  const normalizedPageSize =
    Number.isFinite(pageSize) && pageSize && pageSize > 0
      ? Math.floor(pageSize)
      : undefined

  const [products, setProducts] = useState<HomepageFeedItem[]>(
    initialItems.map((item) => toFeedItem(item)),
  )
  const [page, setPage] = useState<number>(normalizedInitialPage)
  const [hasMore, setHasMore] = useState<boolean>(initialHasMore)
  const [isLoading, setIsLoading] = useState(false)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  const resetKey = useMemo(
    () =>
      [
        alternativeId,
        normalizedPageSize ?? "default",
        normalizedInitialPage,
        initialItems.map((item) => item.id).join("|"),
      ].join(":"),
    [alternativeId, initialItems, normalizedInitialPage, normalizedPageSize],
  )

  const sections = useMemo(() => {
    const resolvedReferenceDateIso =
      referenceDateIso ?? resolveTaxonomyReferenceDateIso(products)
    return resolvedReferenceDateIso
      ? buildTaxonomyProductSections(products, resolvedReferenceDateIso)
      : []
  }, [products, referenceDateIso])

  useEffect(() => {
    setProducts(initialItems.map((item) => toFeedItem(item)))
    setPage(normalizedInitialPage)
    setHasMore(initialHasMore)
  }, [initialHasMore, initialItems, normalizedInitialPage, resetKey])

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return

    setIsLoading(true)
    try {
      const result = await getProductFeedPage({
        kind: "alternative",
        alternativeId,
        page,
        pageSize: normalizedPageSize,
      })

      setProducts((previous) => {
        const existingIds = new Set(previous.map((item) => item.id))
        const nextItems = result.items
          .map((item) => toFeedItem(item))
          .filter((product) => !existingIds.has(product.id))

        if (!nextItems.length) return previous
        return [...previous, ...nextItems]
      })

      setHasMore(result.hasMore)
      setPage((current) => (result.hasMore ? current + 1 : current))
    } catch {
      setHasMore(false)
    } finally {
      setIsLoading(false)
    }
  }, [alternativeId, hasMore, isLoading, normalizedPageSize, page])

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
        No products have been mapped as alternatives yet.
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
          {isLoading
            ? "Loading more alternatives..."
            : "Keep scrolling for more"}
        </div>
      ) : null}
    </div>
  )
}

export default AlternativeProductsClient

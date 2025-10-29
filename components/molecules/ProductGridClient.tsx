"use client"

import { useCallback, useMemo } from "react"

import type { CompactProductItem } from "@/components/molecules/ProductCompactGrid"
import { loadMoreProducts } from "@/actions/public/browse/loadMore"
import InfiniteProductGrid from "@/components/molecules/InfiniteProductGrid"
import ProductFeedCard from "@/components/molecules/ProductFeedCard"
import ProductFeedCardSkeleton from "@/components/molecules/ProductFeedCard.skeleton"
import type { HomepageFeedItem } from "@/actions/public/homepage/feed"

type ProductGridItem = CompactProductItem

const normalizeToFeedItem = (item: ProductGridItem): HomepageFeedItem => ({
  id: item.id,
  slug: item.slug,
  name: item.name,
  logo: item.logo ?? "",
  tagline: item.tagline ?? "",
  createdAt: "",
  updatedAt: "",
  badges: item.badges ?? [],
  category: item.category?.name ?? null,
  categorySlug: null,
  voteCount: item.analytics?.upvotes ?? 0,
  isSponsored: Boolean(item.sponsored),
  isVoted: false,
})

interface ProductGridClientProps {
  initialProducts: ProductGridItem[]
  initialHasMore: boolean
  initialPage: number
  searchParams: {
    useCase?: string
    category?: string
    verified?: boolean
    sort?: string
    q?: string
  }
}

export default function ProductGridClient({
  initialProducts,
  initialHasMore,
  initialPage,
  searchParams,
}: ProductGridClientProps) {
  const normalizedSearch = useMemo(
    () => ({
      useCase: searchParams.useCase,
      category: searchParams.category,
      verified: searchParams.verified,
      sort: searchParams.sort,
      q: searchParams.q,
    }),
    [
      searchParams.category,
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
      const result = await loadMoreProducts({
        ...normalizedSearch,
        page,
      })

      return {
        items: result.products as ProductGridItem[],
        hasMore: result.hasMore,
      }
    },
    [normalizedSearch],
  )

  const renderItems = useCallback(
    (items: ProductGridItem[]) => (
      <div className="space-y-4" data-testid="browse-feed-list">
        {items.map((item) => (
          <ProductFeedCard
            key={item.id}
            item={normalizeToFeedItem(item)}
          />
        ))}
      </div>
    ),
    [],
  )

  const renderLoadingSkeleton = useCallback((count: number) => {
    return (
      <div
        className="space-y-6"
        aria-hidden="true"
        data-testid="browse-feed-skeleton"
      >
        {Array.from({ length: count }).map((_, index) => (
          <ProductFeedCardSkeleton
            key={`browse-feed-skeleton-${count}-${index}`}
          />
        ))}
      </div>
    )
  }, [])

  return (
    <InfiniteProductGrid
      initialItems={initialProducts}
      initialHasMore={initialHasMore}
      initialPage={initialPage}
      loadPage={loadPage}
      resetKey={resetKey}
      loadingSkeletonCount={3}
      renderItems={renderItems}
      renderLoadingSkeleton={renderLoadingSkeleton}
    />
  )
}

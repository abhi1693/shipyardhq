"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import {
  getHomepageFeedPage,
  type HomepageFeedItem,
} from "@/actions/public/homepage/feed"
import ProductFeedCardSkeleton from "@/components/molecules/ProductFeedCard.skeleton"
import ProductFeedList from "@/components/organisms/feed/ProductFeedList"
import type { HomepageFeedView } from "@/lib/homepage/feed-views"

interface HomepageFeedClientProps {
  activeFilter: HomepageFeedView
  initialItems: HomepageFeedItem[]
  initialHasMore: boolean
  initialPage: number
  pageSize: number
  referenceDateIso: string
}

export function HomepageFeedClient({
  activeFilter,
  initialItems,
  initialHasMore,
  initialPage,
  pageSize,
  referenceDateIso,
}: HomepageFeedClientProps) {
  const normalizedInitialPage =
    Number.isFinite(initialPage) && initialPage > 0 ? initialPage : 2
  const normalizedPageSize =
    Number.isFinite(pageSize) && pageSize > 0 ? Math.floor(pageSize) : 10

  const [items, setItems] = useState<HomepageFeedItem[]>(initialItems)
  const [page, setPage] = useState(normalizedInitialPage)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [isLoading, setIsLoading] = useState(false)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  const resetKey = useMemo(
    () =>
      [
        activeFilter,
        normalizedPageSize,
        normalizedInitialPage,
        initialItems.map((item) => item.id).join("|"),
      ].join(":"),
    [activeFilter, initialItems, normalizedInitialPage, normalizedPageSize],
  )

  useEffect(() => {
    setItems(initialItems)
    setPage(normalizedInitialPage)
    setHasMore(initialHasMore)
  }, [initialHasMore, initialItems, normalizedInitialPage, resetKey])

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return

    setIsLoading(true)
    try {
      const result = await getHomepageFeedPage({
        page,
        pageSize: normalizedPageSize,
        view: activeFilter,
      })

      setItems((previous) => {
        const existingIds = new Set(previous.map((item) => item.id))
        const nextItems = result.items.filter(
          (item) => !existingIds.has(item.id),
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
  }, [activeFilter, hasMore, isLoading, normalizedPageSize, page])

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
      { rootMargin: "0px 0px 360px 0px" },
    )

    observer.observe(node)

    return () => {
      observer.disconnect()
    }
  }, [hasMore, loadMore, resetKey])

  return (
    <div className="space-y-4">
      <ProductFeedList
        activeFilter={activeFilter}
        items={items}
        referenceDateIso={referenceDateIso}
        newViewOrder="shuffle"
        showRemaining
      />

      {isLoading ? (
        <div className="space-y-4" data-testid="homepage-feed-loading">
          {Array.from({ length: 3 }).map((_, index) => (
            <ProductFeedCardSkeleton key={`homepage-feed-loading-${index}`} />
          ))}
        </div>
      ) : null}

      {hasMore ? (
        <div
          ref={sentinelRef}
          className="flex justify-center py-4 text-sm text-muted-foreground"
          data-testid="homepage-feed-scroll-trigger"
        >
          Keep scrolling for more launches
        </div>
      ) : items.length ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          You&apos;ve reached the end of the directory.
        </p>
      ) : null}
    </div>
  )
}

export default HomepageFeedClient

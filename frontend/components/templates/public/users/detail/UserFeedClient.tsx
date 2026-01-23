"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import ProductFeedList from "@/components/organisms/feed/ProductFeedList"
import type { HomepageFeedItem } from "@/lib/generated/fastapi/schemas"
import { DEFAULT_HOMEPAGE_FEED_VIEW } from "@/lib/homepage/feed-views"
import { getUserProductsPage } from "@/actions/public/users/actions"

interface UserFeedClientProps {
  userId: string
  initialItems: HomepageFeedItem[]
  initialPage: number
  pageSize: number
  initialHasMore: boolean
}

export function UserFeedClient({
  userId,
  initialItems,
  initialPage,
  pageSize,
  initialHasMore,
}: UserFeedClientProps) {
  const normalizedInitialPage =
    Number.isFinite(initialPage) && initialPage > 0 ? initialPage : 2
  const normalizedPageSize =
    Number.isFinite(pageSize) && pageSize > 0 ? Math.floor(pageSize) : 20

  const [items, setItems] = useState<HomepageFeedItem[]>(initialItems)
  const [page, setPage] = useState<number>(normalizedInitialPage)
  const [hasMore, setHasMore] = useState<boolean>(initialHasMore)
  const [isLoading, setIsLoading] = useState(false)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  const resetKey = useMemo(
    () =>
      [
        userId,
        normalizedPageSize,
        normalizedInitialPage,
        initialItems.map((item) => item.id).join("|"),
      ].join(":"),
    [initialItems, normalizedInitialPage, normalizedPageSize, userId],
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
      const result = await getUserProductsPage({
        userId,
        page,
        pageSize: normalizedPageSize,
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
  }, [hasMore, isLoading, normalizedPageSize, page, userId])

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

  if (!items.length && !hasMore) {
    return (
      <div className="rounded-3xl border border-border/70 bg-background/90 p-6 text-center text-sm text-muted-foreground shadow-sm shadow-black/5">
        No published products yet. Check back soon.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <ProductFeedList
        activeFilter={DEFAULT_HOMEPAGE_FEED_VIEW}
        items={items}
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

export default UserFeedClient

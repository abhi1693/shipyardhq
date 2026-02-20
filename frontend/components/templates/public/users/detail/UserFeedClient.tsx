"use client"

import { useCallback, useEffect, useMemo, useRef } from "react"
import { useInfiniteQuery } from "@tanstack/react-query"

import ProductFeedList from "@/components/organisms/feed/ProductFeedList"
import type { UserProductsPageResult } from "@/lib/generated/fastapi/schemas"
import { DEFAULT_HOMEPAGE_FEED_VIEW } from "@/lib/homepage/feed-views"
import { getPublicUserProductsApiV1PublicUsersUserIdProductsGet } from "@/lib/generated/fastapi/public-homepage"

type UserFeedPage = Omit<UserProductsPageResult, "nextPage"> & {
  nextPage: number | null
}

interface UserFeedClientProps {
  userId: string
  initialPageData: UserFeedPage
}

export function UserFeedClient({ userId, initialPageData }: UserFeedClientProps) {
  const normalizedPageSize =
    Number.isFinite(initialPageData.pageSize) && initialPageData.pageSize > 0
      ? Math.floor(initialPageData.pageSize)
      : 20
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  const query = useInfiniteQuery({
    queryKey: ["public-user-products", userId, normalizedPageSize],
    initialPageParam: initialPageData.page,
    queryFn: async ({ pageParam }) => {
      const page =
        typeof pageParam === "number" && Number.isFinite(pageParam) && pageParam > 0
          ? Math.floor(pageParam)
          : 1

      const response = await getPublicUserProductsApiV1PublicUsersUserIdProductsGet(
        userId,
        {
          page,
          pageSize: normalizedPageSize,
        },
      )
      if (response.status !== 200) {
        throw new Error("Failed to fetch user products")
      }
      return {
        ...response.data,
        nextPage: response.data.nextPage ?? null,
      } as UserFeedPage
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage.hasMore) return undefined
      return lastPage.nextPage ?? lastPage.page + 1
    },
    initialData: {
      pages: [initialPageData],
      pageParams: [initialPageData.page],
    },
    enabled: Boolean(userId),
  })

  const items = useMemo(() => {
    const deduped = new Map<string, UserFeedPage["items"][number]>()
    for (const page of query.data?.pages ?? []) {
      for (const item of page.items ?? []) {
        deduped.set(item.id, item)
      }
    }
    return Array.from(deduped.values())
  }, [query.data])

  const hasMore = Boolean(query.hasNextPage)
  const isLoadingMore = query.isFetchingNextPage

  const loadMore = useCallback(() => {
    if (!hasMore || isLoadingMore) return
    query.fetchNextPage().catch(() => {})
  }, [hasMore, isLoadingMore, query])

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
  }, [hasMore, loadMore])

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
          {isLoadingMore ? "Loading more launches…" : "Keep scrolling for more"}
        </div>
      ) : null}
    </div>
  )
}

export default UserFeedClient

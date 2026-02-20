"use client"

import { useCallback, useMemo, useRef, useEffect } from "react"
import { useInfiniteQuery } from "@tanstack/react-query"

import MakerFeedCard from "@/components/molecules/MakerFeedCard"
import { getPublicUsersApiV1PublicUsersGet } from "@/lib/generated/fastapi/public-homepage"
import type { PublicUsersPageResult } from "@/lib/generated/fastapi/schemas"

type MakersPage = Omit<PublicUsersPageResult, "nextPage"> & {
  nextPage: number | null
}
type MakerListItem = MakersPage["items"][number]

interface MakersFeedClientProps {
  initialPageData: MakersPage
}

const mapMakerMeta = (maker: MakerListItem) => {
  const first = maker.firstName?.trim() ?? ""
  const last = maker.lastName?.trim() ?? ""
  const name = `${first} ${last}`.trim() || "Shipyard maker"
  const initialsSource = name.split(/\s+/).slice(0, 2)
  const initials =
    initialsSource
      .map((segment) => segment.charAt(0).toUpperCase())
      .join("")
      .slice(0, 2) || "SY"
  const launches = maker.productCount ?? 0

  return { name, initials, launches }
}

export function MakersFeedClient({ initialPageData }: MakersFeedClientProps) {
  const normalizedPageSize =
    Number.isFinite(initialPageData.pageSize) && initialPageData.pageSize > 0
      ? Math.floor(initialPageData.pageSize)
      : 20
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  const query = useInfiniteQuery({
    queryKey: ["public-users", normalizedPageSize],
    initialPageParam: initialPageData.page,
    queryFn: async ({ pageParam }) => {
      const page =
        typeof pageParam === "number" && Number.isFinite(pageParam) && pageParam > 0
          ? Math.floor(pageParam)
          : 1
      const response = await getPublicUsersApiV1PublicUsersGet({
        page,
        pageSize: normalizedPageSize,
      })

      if (response.status !== 200) {
        throw new Error("Failed to fetch makers")
      }

      return {
        ...response.data,
        nextPage: response.data.nextPage ?? null,
      } as MakersPage
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage.hasMore) return undefined
      return lastPage.nextPage ?? lastPage.page + 1
    },
    initialData: {
      pages: [initialPageData],
      pageParams: [initialPageData.page],
    },
  })

  const items = useMemo(() => {
    const deduped = new Map<string, MakerListItem>()
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
      <section className="rounded-3xl border border-border/70 bg-background/90 p-6 text-center text-sm text-muted-foreground shadow-sm shadow-black/5">
        No makers to show yet. Check back soon.
      </section>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((maker) => {
          const { name, initials, launches } = mapMakerMeta(maker)
          return (
            <MakerFeedCard
              key={maker.id}
              item={{
                id: maker.id,
                name,
                initials,
                launches,
                avatarUrl: maker.avatarUrl,
                latestRevenueCents: maker.latestRevenueCents ?? undefined,
                revenueCurrencyCode: maker.revenueCurrencyCode ?? undefined,
              }}
            />
          )
        })}
      </div>

      {hasMore ? (
        <div
          ref={sentinelRef}
          className="flex justify-center py-4 text-sm text-muted-foreground"
        >
          {isLoadingMore ? "Loading more makers…" : "Keep scrolling for more"}
        </div>
      ) : null}
    </div>
  )
}

export default MakersFeedClient

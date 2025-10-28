"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react"

import type { HomepageFeedItem } from "@/actions/public/homepage/feed"
import { loadHomepageFeed } from "@/actions/public/homepage/feed"
import ProductFeedCard from "@/components/molecules/ProductFeedCard"
import ProductFeedCardSkeleton from "@/components/molecules/ProductFeedCard.skeleton"
import { cn } from "@/lib/utils"

interface HomepageFeedClientProps {
  initialItems: HomepageFeedItem[]
  initialPage: number
  initialNextPage: number | null
  initialHasMore: boolean
  className?: string
  skeletonCount?: number
}

const DEFAULT_SKELETON_COUNT = 2
const MIN_ORGANIC_BEFORE_SPONSORED = 5

type FeedRow =
  | {
      kind: "product"
      key: string
      item: HomepageFeedItem
    }
  | {
      kind: "sponsored"
      key: string
      items: HomepageFeedItem[]
    }

export function HomepageFeedClient({
  initialItems,
  initialPage,
  initialNextPage,
  initialHasMore,
  className,
  skeletonCount = DEFAULT_SKELETON_COUNT,
}: HomepageFeedClientProps) {
  const [items, setItems] = useState(initialItems)
  const [page, setPage] = useState(initialPage)
  const [nextPage, setNextPage] = useState(initialNextPage)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeFilter, setActiveFilter] = useState<"top" | "new" | "trending" | "sponsored">("top")
  const [isPending, startTransition] = useTransition()

  const resetKey = useMemo(
    () => `${initialPage}:${initialHasMore}:${initialItems.length}`,
    [initialHasMore, initialItems.length, initialPage],
  )

  useEffect(() => {
    setItems(initialItems)
    setPage(initialPage)
    setNextPage(initialNextPage)
    setHasMore(initialHasMore)
    setError(null)
  }, [initialHasMore, initialItems, initialNextPage, initialPage, resetKey])

  const loadMore = useCallback(() => {
    if (!hasMore || loading || isPending || !nextPage) {
      return
    }

    setError(null)
    setLoading(true)
    startTransition(async () => {
      try {
        const result = await loadHomepageFeed({ page: nextPage })
        setItems((prev) => [...prev, ...result.items])
        setPage(result.page)
        setNextPage(result.nextPage)
        setHasMore(result.hasMore)
      } catch (loadError) {
        console.error("[HomepageFeed] Failed to load more products", loadError)
        setError("Unable to load more launches right now. Please try again.")
      } finally {
        setLoading(false)
      }
    })
  }, [hasMore, isPending, loading, nextPage])

  const isLoading = loading || isPending
  const showSkeletons = isLoading && hasMore

  const filteredItems = useMemo(() => {
    switch (activeFilter) {
      case "new":
        return [...items].sort((a, b) => a.name.localeCompare(b.name))
      case "trending":
        return items.filter((item) =>
          item.badges.some((badge) =>
            badge.toLowerCase().includes("trend"),
          ),
        )
      case "sponsored":
        return items.filter((item) => item.isSponsored)
      default:
        return items
    }
  }, [activeFilter, items])

  const feedRows = useMemo<FeedRow[]>(() => {
    if (filteredItems.length === 0) {
      return []
    }

    if (
      activeFilter === "top" &&
      !filteredItems.some((item) => !item.isSponsored) &&
      hasMore
    ) {
      return []
    }

    if (activeFilter === "sponsored") {
      const rows: FeedRow[] = []
      for (let index = 0; index < filteredItems.length; index += 2) {
        const chunk = filteredItems.slice(index, index + 2)
        rows.push({
          kind: "sponsored",
          key: `sponsored-${index / 2}`,
          items: chunk,
        })
      }
      return rows
    }

    if (activeFilter !== "top") {
      return filteredItems.map((item) => ({
        kind: "product",
        key: `product-${item.id}`,
        item,
      }))
    }

    const organic = filteredItems.filter((item) => !item.isSponsored)
    const sponsored = filteredItems.filter((item) => item.isSponsored)

    const sponsorPairs: HomepageFeedItem[][] = []
    for (let index = 0; index < sponsored.length; index += 2) {
      sponsorPairs.push(sponsored.slice(index, index + 2))
    }

    const rows: FeedRow[] = []
    let organicSinceLastSponsored = 0
    let sponsorIndex = 0

    organic.forEach((item) => {
      rows.push({
        kind: "product",
        key: `product-${item.id}`,
        item,
      })
      organicSinceLastSponsored += 1

      if (organicSinceLastSponsored === 5 && sponsorIndex < sponsorPairs.length) {
        rows.push({
          kind: "sponsored",
          key: `sponsored-${sponsorIndex}`,
          items: sponsorPairs[sponsorIndex],
        })
        sponsorIndex += 1
        organicSinceLastSponsored = 0
      }
    })

    while (sponsorIndex < sponsorPairs.length) {
      rows.push({
        kind: "sponsored",
        key: `sponsored-${sponsorIndex}`,
        items: sponsorPairs[sponsorIndex],
      })
      sponsorIndex += 1
    }

    return rows
  }, [activeFilter, filteredItems, hasMore])

  useEffect(() => {
    if (activeFilter !== "top") return
    if (!hasMore) return
    if (loading || isPending) return

    const organicCount = items.reduce(
      (count, item) => (item.isSponsored ? count : count + 1),
      0,
    )
    const hasSponsored = items.length > organicCount

    if (!hasSponsored) return
    if (organicCount >= MIN_ORGANIC_BEFORE_SPONSORED) return

    loadMore()
  }, [activeFilter, hasMore, isPending, items, loadMore, loading])

  const emptyState =
    feedRows.length === 0 && !isLoading ? (
      <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-12 text-center text-sm font-medium text-slate-500">
        Nothing to show yet for this view. Try switching filters to explore more
        launches.
      </div>
    ) : null
  const handleLoadMore = useCallback(() => {
    loadMore()
  }, [loadMore])

  return (
    <div
      className={cn("space-y-6", className)}
      data-testid="homepage-feed-client"
    >
      <div className="flex flex-wrap items-center gap-2 rounded-full border border-slate-200/60 bg-white px-2 py-2 shadow-[0_18px_38px_-32px_rgba(28,35,51,0.25)]">
        {[
          { key: "top", label: "Top" },
          { key: "new", label: "New" },
          { key: "trending", label: "Trending" },
          { key: "sponsored", label: "Promoted" },
        ].map((filter) => {
          const isActive = activeFilter === filter.key
          return (
            <button
              key={filter.key}
              type="button"
              onClick={() =>
                setActiveFilter(filter.key as typeof activeFilter)
              }
              className={cn(
                "inline-flex items-center rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
                isActive
                  ? "bg-[#1C2333] text-white shadow-[0_18px_38px_-28px_rgba(28,35,51,0.55)]"
                  : "bg-transparent text-[#3B4256] hover:bg-slate-100",
              )}
            >
              {filter.label}
            </button>
          )
        })}
      </div>

      <div className="space-y-6">
        {feedRows.map((row) => {
          if (row.kind === "product") {
            return <ProductFeedCard key={row.key} item={row.item} />
          }

          return (
            <div
              key={row.key}
              className="space-y-4 rounded-3xl border border-[#E6E9F5] bg-[#F8F9FF] px-4 py-5"
            >
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#575C73]">
                  Sponsored
                </p>
                <p className="text-xs text-[#6E7490]">
                  Spotlighted makers investing in visibility.
                </p>
              </div>
              <div className="space-y-6">
                {row.items.map((item) => (
                  <ProductFeedCard key={`${row.key}-${item.id}`} item={item} />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {showSkeletons ? (
        <div className="space-y-6" aria-hidden="true">
          {Array.from({ length: skeletonCount }).map((_, index) => (
            <ProductFeedCardSkeleton key={`skeleton-${page}-${index}`} />
          ))}
        </div>
      ) : null}

      {error ? (
        <div
          className="rounded-2xl border border-[#FEE4E2] bg-[#FEF3F2] px-4 py-3 text-sm text-[#B42318]"
          role="status"
        >
          {error}
        </div>
      ) : null}

      {emptyState}

      {hasMore ? (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={isLoading}
            className="inline-flex items-center rounded-full bg-[#1C2333] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#101524] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLoading ? "Loading…" : "Load more launches"}
          </button>
        </div>
      ) : null}

      {!hasMore ? (
        <p className="py-6 text-center text-sm font-semibold uppercase tracking-[0.22em] text-[#98A0B5]">
          You&apos;ve reached the end of today&apos;s launches — check back
          tomorrow for fresh drops.
        </p>
      ) : null}
    </div>
  )
}

export default HomepageFeedClient

"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
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
const SENTINEL_MARGIN = "0px 0px 160px 0px"

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
  const [manualMode, setManualMode] = useState(false)
  const [activeFilter, setActiveFilter] = useState<"top" | "new" | "trending" | "sponsored">("top")
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)
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

  useEffect(() => {
    if (typeof window === "undefined") return
    const prefersReducedMotion =
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false
    const observerSupported =
      typeof window.IntersectionObserver !== "undefined"

    if (!observerSupported || prefersReducedMotion) {
      setManualMode(true)
    }
  }, [])

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
        setManualMode(true)
      } finally {
        setLoading(false)
      }
    })
  }, [hasMore, isPending, loading, nextPage])

  useEffect(() => {
    if (manualMode || !hasMore || !nextPage) {
      observerRef.current?.disconnect()
      return
    }

    if (
      typeof window === "undefined" ||
      typeof window.IntersectionObserver === "undefined"
    ) {
      return
    }

    const node = sentinelRef.current
    if (!node) return

    const observer = new IntersectionObserver(
      (entries) => {
        const isIntersecting = entries.some((entry) => entry.isIntersecting)
        if (isIntersecting) {
          loadMore()
        }
      },
      { rootMargin: SENTINEL_MARGIN },
    )

    observer.observe(node)
    observerRef.current = observer

    return () => {
      observer.disconnect()
    }
  }, [hasMore, loadMore, manualMode, nextPage])

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

  const sections = useMemo(() => {
    if (activeFilter !== "top") {
      return [
        {
          key: activeFilter,
          title:
            activeFilter === "trending"
              ? "Trending picks"
              : activeFilter === "sponsored"
                ? "Promoted lineup"
                : "Fresh launches",
          caption:
            activeFilter === "trending"
              ? "Communities can’t stop talking about these makers right now."
              : activeFilter === "sponsored"
                ? "Guaranteed placements from founders investing in visibility."
                : "Browse the latest additions to the Shipyard directory.",
          tone: activeFilter === "sponsored" ? "promoted" : "default",
          items: filteredItems,
        },
      ].filter((section) => section.items.length > 0)
    }

    const organic = filteredItems.filter((item) => !item.isSponsored)
    const promoted = filteredItems.filter((item) => item.isSponsored)

    const today = organic.slice(0, 4)
    const yesterday = organic.slice(4, 8)
    const remaining = organic.slice(8)

    const result: Array<{
      key: string
      title: string
      caption?: string
      tone: "primary" | "secondary" | "promoted" | "default"
      items: HomepageFeedItem[]
    }> = []

    if (today.length) {
      result.push({
        key: "today",
        title: "Today’s Top 4",
        caption: "Four standouts climbing the charts in real time.",
        tone: "primary",
        items: today,
      })
    }

    if (promoted.length) {
      result.push({
        key: "promoted",
        title: "Promoted",
        caption: "Spotlight placements from makers investing in boost slots.",
        tone: "promoted",
        items: promoted,
      })
    }

    if (yesterday.length) {
      result.push({
        key: "yesterday",
        title: "Yesterday’s Highlights",
        caption: "Still earning upvotes after yesterday’s drop.",
        tone: "secondary",
        items: yesterday,
      })
    }

    if (remaining.length) {
      result.push({
        key: "all",
        title: "All launches",
        caption: "Keep scrolling to discover every product shipping today.",
        tone: "default",
        items: remaining,
      })
    }

    return result
  }, [activeFilter, filteredItems])

  const renderedCount = useMemo(
    () =>
      sections.reduce(
        (total, section) => total + section.items.length,
        0,
      ),
    [sections],
  )

  const emptyState =
    filteredItems.length === 0 && !isLoading ? (
      <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-12 text-center text-sm font-medium text-slate-500">
        Nothing to show yet for this view. Try switching filters to explore more
        launches.
      </div>
    ) : null

  const handleManualLoad = useCallback(() => {
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

      {sections.map((section) => (
        <div key={section.key} className="space-y-6">
          {section.title ? (
            <div
              className={cn(
                "flex flex-col gap-1 rounded-2xl border border-transparent px-4 py-3",
                section.tone === "primary" &&
                  "bg-gradient-to-r from-[#F4F2FF] via-white to-[#F3FBFF] border-[#E1E8FF]",
                section.tone === "secondary" &&
                  "bg-gradient-to-r from-[#FDF5F1] via-white to-[#F7FAFF] border-[#F5E5D8]",
                section.tone === "promoted" &&
                  "bg-gradient-to-r from-[#F9F2FF] via-white to-[#F3F0FF] border-[#E7DAFF]",
              )}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#7B81A0]">
                {section.title}
              </p>
              {section.caption ? (
                <p className="text-sm text-[#5B6175]">{section.caption}</p>
              ) : null}
            </div>
          ) : null}
          <div className="space-y-6">
            {section.items.map((item) => (
              <ProductFeedCard key={`${section.key}-${item.id}`} item={item} />
            ))}
          </div>
        </div>
      ))}

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

      {hasMore && sections.length > 0 && renderedCount === filteredItems.length ? (
        manualMode ? (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleManualLoad}
              disabled={isLoading}
              className="inline-flex items-center rounded-full bg-[#1C2333] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#101524] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? "Loading…" : "Load more launches"}
            </button>
          </div>
        ) : (
          <div
            ref={sentinelRef}
            aria-hidden="true"
            className="h-1 w-full"
            data-testid="homepage-feed-sentinel"
          />
        )
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

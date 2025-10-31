"use client"

import { Flame } from "lucide-react"
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react"
import { addDays, startOfDay, startOfWeek } from "date-fns"

import type { HomepageFeedItem } from "@/actions/public/homepage/feed"
import { loadHomepageFeed } from "@/actions/public/homepage/feed"
import ProductFeedCard from "@/components/molecules/ProductFeedCard"
import ProductFeedCardSkeleton from "@/components/molecules/ProductFeedCard.skeleton"
import { StickyBannerRegion } from "@/components/layout/sticky-banner-context"
import type { HomepageFeedView } from "@/lib/homepage/feed-views"
import { cn } from "@/lib/utils"

interface HomepageFeedClientProps {
  activeFilter: HomepageFeedView
  initialItems: HomepageFeedItem[]
  initialPage: number
  initialNextPage: number | null
  initialHasMore: boolean
  className?: string
  skeletonCount?: number
}

type BucketRow =
  | {
      kind: "product"
      key: string
      item: HomepageFeedItem
    }
  | {
      kind: "promoted"
      key: string
      items: HomepageFeedItem[]
    }

type FeedSection =
  | {
      kind: "bucket"
      key: string
      title: string
      rows: BucketRow[]
    }
  | {
      kind: "promoted"
      key: string
      title: string
      items: HomepageFeedItem[]
    }

const DEFAULT_SKELETON_COUNT = 2

function buildNewViewSections(items: HomepageFeedItem[]): FeedSection[] {
  if (items.length === 0) {
    return []
  }

  const now = new Date()
  const startToday = startOfDay(now)
  const startYesterday = addDays(startToday, -1)
  const startOfCurrentWeek = startOfWeek(now, { weekStartsOn: 1 })

  type BucketKey = "today" | "yesterday" | "thisWeek"
  const bucketOrder: Array<{ key: BucketKey; label: string }> = [
    { key: "today", label: "Published Today" },
    { key: "yesterday", label: "Published Yesterday" },
    { key: "thisWeek", label: "Published This Week" },
  ]

  const buckets = new Map<BucketKey, HomepageFeedItem[]>(
    bucketOrder.map((bucket) => [bucket.key, []]),
  )

  const organicItems = items.filter((item) => !item.isSponsored)
  organicItems.forEach((item) => {
    const created = new Date(item.createdAt)
    const createdTime = created.getTime()
    const resolvedDate = Number.isNaN(createdTime) ? startToday : created

    let bucketKey: BucketKey = "thisWeek"
    if (resolvedDate >= startToday) {
      bucketKey = "today"
    } else if (resolvedDate >= startYesterday) {
      bucketKey = "yesterday"
    } else if (resolvedDate >= startOfCurrentWeek) {
      bucketKey = "thisWeek"
    }

    const bucket = buckets.get(bucketKey)
    if (bucket) {
      bucket.push(item)
    }
  })

  const promotedItems = items.filter((item) => item.isSponsored)

  const sections: FeedSection[] = []
  let promotedIndex = 0
  let promotedSectionCount = 0

  const takePromotedChunk = () => {
    const remaining = promotedItems.length - promotedIndex
    if (remaining <= 0) {
      return null
    }
    const chunkSize = Math.min(2, remaining)
    const chunk = promotedItems.slice(
      promotedIndex,
      promotedIndex + chunkSize,
    )
    promotedIndex += chunk.length
    return chunk
  }

  const bucketsWithItems = bucketOrder
    .map((bucket) => ({
      key: bucket.key,
      label: bucket.label,
      items: buckets.get(bucket.key) ?? [],
    }))
    .filter((bucket) => bucket.items.length > 0)

  bucketsWithItems.forEach((bucket) => {
    const rows: BucketRow[] = []
    bucket.items.forEach((item, index) => {
      rows.push({
        kind: "product",
        key: `${bucket.key}-product-${item.id}`,
        item,
      })

      const reachedMultipleOfFive = (index + 1) % 5 === 0
      if (reachedMultipleOfFive) {
        const chunk = takePromotedChunk()
        if (chunk && chunk.length > 0) {
          rows.push({
            kind: "promoted",
            key: `${bucket.key}-promoted-${promotedSectionCount}`,
            items: chunk,
          })
          promotedSectionCount += 1
        }
      }
    })

    const needsRemainderPromoted = bucket.items.length % 5 !== 0
    if (needsRemainderPromoted) {
      const chunk = takePromotedChunk()
      if (chunk && chunk.length > 0) {
        rows.push({
          kind: "promoted",
          key: `${bucket.key}-promoted-${promotedSectionCount}`,
          items: chunk,
        })
        promotedSectionCount += 1
      }
    }

    sections.push({
      kind: "bucket",
      key: `new-${bucket.key}`,
      title: bucket.label,
      rows,
    })
  })

  const remainingPromoted = promotedItems.slice(promotedIndex)
  if (sections.length === 0 && remainingPromoted.length > 0) {
    sections.push({
      kind: "promoted",
      key: "new-promoted-only",
      title: "Promoted",
      items: remainingPromoted,
    })
  } else if (remainingPromoted.length > 0) {
    sections.push({
      kind: "promoted",
      key: `new-promoted-${promotedSectionCount}`,
      title: "Promoted",
      items: remainingPromoted,
    })
  }

  return sections
}

export function HomepageFeedClient({
  activeFilter,
  initialItems,
  initialPage,
  initialNextPage,
  initialHasMore,
  className,
  skeletonCount = DEFAULT_SKELETON_COUNT,
}: HomepageFeedClientProps) {
  const view = activeFilter
  const infiniteScrollRef = useRef<HTMLDivElement | null>(null)
  const [items, setItems] = useState(initialItems)
  const [page, setPage] = useState(initialPage)
  const [nextPage, setNextPage] = useState(initialNextPage)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    setItems(initialItems)
    setPage(initialPage)
    setNextPage(initialNextPage)
    setHasMore(initialHasMore)
    setError(null)
  }, [initialHasMore, initialItems, initialNextPage, initialPage])

  const loadMore = useCallback(() => {
    if (!hasMore || loading || isPending || !nextPage) {
      return
    }

    setError(null)
    setLoading(true)
    startTransition(async () => {
      try {
        const result = await loadHomepageFeed({
          page: nextPage,
          view,
        })
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
  }, [hasMore, isPending, loading, nextPage, view])

  const infiniteScrollEnabled = view === "new"

  useEffect(() => {
    if (!infiniteScrollEnabled) {
      return
    }

    const sentinel = infiniteScrollRef.current
    if (!sentinel) {
      return
    }

    if (!hasMore) {
      return
    }

    let triggered = false
    const observer = new IntersectionObserver(
      (entries) => {
        const isIntersecting = entries.some((entry) => entry.isIntersecting)
        if (!isIntersecting) {
          return
        }

        if (triggered) {
          return
        }

        triggered = true
        loadMore()
      },
      {
        root: null,
        rootMargin: "0px 0px 320px 0px",
        threshold: 0,
      },
    )

    observer.observe(sentinel)

    return () => {
      observer.disconnect()
    }
  }, [hasMore, infiniteScrollEnabled, loadMore])

  const isLoading = loading || isPending

  const filteredItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const aTime = new Date(a.createdAt ?? "").getTime()
      const bTime = new Date(b.createdAt ?? "").getTime()

      const aHasTime = !Number.isNaN(aTime)
      const bHasTime = !Number.isNaN(bTime)

      if (aHasTime && bHasTime) {
        if (bTime !== aTime) {
          return bTime - aTime
        }
      } else if (aHasTime && !bHasTime) {
        return -1
      } else if (!aHasTime && bHasTime) {
        return 1
      }

      return a.name.localeCompare(b.name)
    })
  }, [items])

  const sections = useMemo(() => {
    if (view !== "new") {
      return [] as FeedSection[]
    }

    return buildNewViewSections(filteredItems)
  }, [filteredItems, view])

  const hasSectionedContent = sections.some((section) =>
    section.kind === "bucket"
      ? section.rows.some((row) => row.kind === "product")
      : section.items.length > 0,
  )
  const emptyState =
    !hasSectionedContent && !isLoading ? (
      <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-12 text-center text-sm font-medium text-slate-500">
        Nothing to show here yet. Check back soon for fresh launches.
      </div>
    ) : null

  const renderPromotedGroup = (
    key: string,
    items: HomepageFeedItem[],
    options: { showDivider?: boolean } = {},
  ) => (
    <div key={key} className="space-y-5">
      <div className="flex flex-col gap-3">
        <div className="inline-flex items-center gap-3 text-[#B45309]">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FEF3C7] text-[#D97706]">
            <Flame className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="text-lg font-semibold tracking-tight">Promoted</span>
        </div>
        <span
          aria-hidden="true"
          className="block h-px w-full rounded-full bg-[#FCD34D]/60"
        />
      </div>
      <div className="space-y-4">
        {items.map((item) => (
          <ProductFeedCard
            key={`${key}-${item.id}`}
            item={item}
            variant="promoted"
          />
        ))}
      </div>
      {options.showDivider ? (
        <span
          aria-hidden="true"
          className="block h-px w-full rounded-full bg-[#E9ECF8]"
        />
      ) : null}
    </div>
  )

  return (
    <div
      className={cn("space-y-6", className)}
      data-testid="homepage-feed-client"
    >
      <StickyBannerRegion priority={20} className="w-full" />

      {hasSectionedContent ? (
        <section className="space-y-10">
          {sections.map((section, index) => {
            const isLastSection = index === sections.length - 1

            if (section.kind === "promoted") {
              return renderPromotedGroup(section.key, section.items, {
                showDivider: !isLastSection,
              })
            }

            return (
              <div
                key={section.key}
                className={cn("space-y-5", !isLastSection && "pb-6")}
              >
                <div className="space-y-3">
                  <span className="text-lg font-semibold text-[#1C2333]">
                    {section.title}
                  </span>
                  <span
                    aria-hidden="true"
                    className="block h-px w-full rounded-full bg-[#E5E8F5]"
                  />
                </div>
                <div className="space-y-4">
                  {section.rows.map((row) => {
                    if (row.kind === "product") {
                      return (
                        <ProductFeedCard key={row.key} item={row.item} />
                      )
                    }
                    return renderPromotedGroup(row.key, row.items)
                  })}
                </div>
              </div>
            )
          })}
        </section>
      ) : null}

      {infiniteScrollEnabled ? (
        <>
          {isLoading && hasMore ? (
            <div className="space-y-6" aria-hidden="true">
              {Array.from({ length: skeletonCount }).map((_, index) => (
                <ProductFeedCardSkeleton
                  key={`infinite-skeleton-${page}-${index}`}
                />
              ))}
            </div>
          ) : null}
          {hasMore ? (
            <div
              ref={infiniteScrollRef}
              aria-hidden="true"
              className="h-1 w-full"
              data-testid="homepage-feed-infinite-sentinel"
            />
          ) : null}
        </>
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
    </div>
  )
}

export default HomepageFeedClient

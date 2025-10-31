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
import { useRouter, useSearchParams } from "next/navigation"
import {
  addDays,
  addMonths,
  addWeeks,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns"

import type { HomepageFeedItem } from "@/actions/public/homepage/feed"
import { loadHomepageFeed } from "@/actions/public/homepage/feed"
import ProductFeedCard from "@/components/molecules/ProductFeedCard"
import ProductFeedCardSkeleton from "@/components/molecules/ProductFeedCard.skeleton"
import { StickyBannerRegion } from "@/components/layout/sticky-banner-context"
import {
  DEFAULT_HOMEPAGE_FEED_VIEW,
  HOMEPAGE_FEED_VIEW_PARAM,
  type HomepageFeedView,
} from "@/lib/homepage/feed-views"
import { HOME_PATH } from "@/lib/routes"
import { buildQuery } from "@/lib/urlParams"
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

const DEFAULT_SKELETON_COUNT = 2
const MIN_ORGANIC_BEFORE_SPONSORED = 5
const FILTER_SKELETON_COUNT = 4

const FEED_FILTERS: Array<{ key: HomepageFeedView; label: string }> = [
  { key: "top", label: "Top" },
  { key: "new", label: "New" },
  { key: "recent", label: "Recently Updated" },
]

interface TopFeedSection {
  kind: "top" | "promoted"
  key: string
  title: string
  items: HomepageFeedItem[]
  description?: string
}

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
  activeFilter,
  initialItems,
  initialPage,
  initialNextPage,
  initialHasMore,
  className,
  skeletonCount = DEFAULT_SKELETON_COUNT,
}: HomepageFeedClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const searchParamsString = searchParams?.toString() ?? ""

  const [items, setItems] = useState(initialItems)
  const [page, setPage] = useState(initialPage)
  const [nextPage, setNextPage] = useState(initialNextPage)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [filterPending, setFilterPending] = useState(false)
  const [viewHydrating, setViewHydrating] = useState(false)
  const [maskNextAutoLoad, setMaskNextAutoLoad] = useState(false)
  const previousFilterRef = useRef<HomepageFeedView>(activeFilter)
  const infiniteScrollRef = useRef<HTMLDivElement | null>(null)
  const [isPending, startTransition] = useTransition()

  const resetKey = useMemo(
    () =>
      `${activeFilter}:${initialPage}:${initialHasMore}:${initialItems.length}`,
    [activeFilter, initialHasMore, initialItems.length, initialPage],
  )

  const infiniteScrollEnabled =
    activeFilter === "new" || activeFilter === "recent"

  useEffect(() => {
    setItems(initialItems)
    setPage(initialPage)
    setNextPage(initialNextPage)
    setHasMore(initialHasMore)
    setError(null)
    setFilterPending(false)
  }, [initialHasMore, initialItems, initialNextPage, initialPage, resetKey])

  useEffect(() => {
    if (previousFilterRef.current === activeFilter) {
      return
    }

    previousFilterRef.current = activeFilter
    setViewHydrating(true)
    if (activeFilter === "top") {
      setMaskNextAutoLoad(true)
    }
  }, [activeFilter])

  useEffect(() => {
    if (!isPending && filterPending) {
      setFilterPending(false)
    }
  }, [filterPending, isPending])

  const handleFilterSelect = useCallback(
    (nextFilter: HomepageFeedView) => {
      if (nextFilter === activeFilter) {
        return
      }

      if (filterPending) {
        return
      }

      const nextUrl = buildQuery(HOME_PATH, searchParamsString, {
        [HOMEPAGE_FEED_VIEW_PARAM]:
          nextFilter === DEFAULT_HOMEPAGE_FEED_VIEW ? undefined : nextFilter,
      })
      setFilterPending(true)
      setViewHydrating(true)
      if (nextFilter === "top") {
        setMaskNextAutoLoad(true)
      }
      startTransition(() => {
        router.push(nextUrl, { scroll: false })
      })
    },
    [activeFilter, filterPending, router, searchParamsString],
  )

  const loadMore = useCallback(
    (options?: { showTransitionSkeleton?: boolean }) => {
      if (!hasMore || loading || isPending || !nextPage) {
        return
      }

      if (filterPending) {
        return
      }

      if (options?.showTransitionSkeleton) {
        setViewHydrating(true)
      }

      if (
        activeFilter !== "top" &&
        activeFilter !== "new" &&
        activeFilter !== "recent"
      ) {
        return
      }

      setError(null)
      setLoading(true)
      startTransition(async () => {
        try {
          const result = await loadHomepageFeed({
            page: nextPage,
            view: activeFilter,
          })
          setItems((prev) => [...prev, ...result.items])
          setPage(result.page)
          setNextPage(result.nextPage)
          setHasMore(result.hasMore)
        } catch (loadError) {
          console.error(
            "[HomepageFeed] Failed to load more products",
            loadError,
          )
          setError("Unable to load more launches right now. Please try again.")
        } finally {
          setLoading(false)
        }
      })
    },
    [activeFilter, filterPending, hasMore, isPending, loading, nextPage],
  )

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

    if (filterPending || isPending || loading || viewHydrating) {
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
  }, [
    filterPending,
    hasMore,
    infiniteScrollEnabled,
    isPending,
    loadMore,
    loading,
    viewHydrating,
  ])

  useEffect(() => {
    if (filterPending || isPending || loading) {
      return
    }

    if (!maskNextAutoLoad) {
      setViewHydrating(false)
    }
  }, [filterPending, isPending, loading, maskNextAutoLoad])

  const isLoading = loading || isPending
  const showSkeletons = isLoading && hasMore

  const filteredItems = useMemo(() => {
    switch (activeFilter) {
      case "new":
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
      case "recent":
        return [...items].sort((a, b) => {
          const aUpdated = new Date(a.updatedAt ?? "").getTime()
          const bUpdated = new Date(b.updatedAt ?? "").getTime()

          const aHasUpdated = !Number.isNaN(aUpdated)
          const bHasUpdated = !Number.isNaN(bUpdated)

          if (aHasUpdated && bHasUpdated) {
            if (bUpdated !== aUpdated) {
              return bUpdated - aUpdated
            }
          } else if (aHasUpdated && !bHasUpdated) {
            return -1
          } else if (!aHasUpdated && bHasUpdated) {
            return 1
          }

          const aCreated = new Date(a.createdAt ?? "").getTime()
          const bCreated = new Date(b.createdAt ?? "").getTime()
          const aHasCreated = !Number.isNaN(aCreated)
          const bHasCreated = !Number.isNaN(bCreated)

          if (aHasCreated && bHasCreated && bCreated !== aCreated) {
            return bCreated - aCreated
          } else if (aHasCreated && !bHasCreated) {
            return -1
          } else if (!aHasCreated && bHasCreated) {
            return 1
          }

          return a.name.localeCompare(b.name)
        })
      default:
        return items
    }
  }, [activeFilter, items])

  const sectionedSections = useMemo<TopFeedSection[] | null>(() => {
    if (
      activeFilter !== "top" &&
      activeFilter !== "new" &&
      activeFilter !== "recent"
    ) {
      return null
    }

    if (filteredItems.length === 0) {
      return []
    }

    const now = new Date()
    const startToday = startOfDay(now)
    const startYesterday = addDays(startToday, -1)
    const startOfCurrentWeek = startOfWeek(now, { weekStartsOn: 1 })
    const startOfPreviousWeek = addWeeks(startOfCurrentWeek, -1)
    const startOfCurrentMonth = startOfMonth(now)
    const startOfPreviousMonth = addMonths(startOfCurrentMonth, -1)

    if (activeFilter === "top") {
      type BucketKey =
        | "today"
        | "yesterday"
        | "thisWeek"
        | "lastWeek"
        | "thisMonth"
        | "lastMonth"

      const bucketOrder: Array<{ key: BucketKey; label: string }> = [
        { key: "today", label: "Today" },
        { key: "yesterday", label: "Yesterday" },
        { key: "thisWeek", label: "This Week" },
        { key: "lastWeek", label: "Last Week" },
        { key: "thisMonth", label: "This Month" },
        { key: "lastMonth", label: "Last Month" },
      ]

      const buckets = new Map<BucketKey, HomepageFeedItem[]>(
        bucketOrder.map((bucket) => [bucket.key, []]),
      )

      const organicItems = filteredItems.filter((item) => !item.isSponsored)
      const sortedOrganic = [...organicItems].sort((a, b) => {
        const voteDiff = b.voteCount - a.voteCount
        if (voteDiff !== 0) return voteDiff

        const aTime = new Date(a.createdAt).getTime()
        const bTime = new Date(b.createdAt).getTime()
        if (!Number.isNaN(bTime) && !Number.isNaN(aTime)) {
          return bTime - aTime
        }

        return 0
      })

      sortedOrganic.forEach((item) => {
        const created = new Date(item.createdAt)
        const createdTime = created.getTime()
        const resolvedDate = Number.isNaN(createdTime) ? startToday : created

        let bucketKey: BucketKey = "lastMonth"
        if (resolvedDate >= startToday) {
          bucketKey = "today"
        } else if (resolvedDate >= startYesterday) {
          bucketKey = "yesterday"
        } else if (resolvedDate >= startOfCurrentWeek) {
          bucketKey = "thisWeek"
        } else if (resolvedDate >= startOfPreviousWeek) {
          bucketKey = "lastWeek"
        } else if (resolvedDate >= startOfCurrentMonth) {
          bucketKey = "thisMonth"
        } else if (resolvedDate >= startOfPreviousMonth) {
          bucketKey = "lastMonth"
        } else {
          bucketKey = "lastMonth"
        }

        const bucket = buckets.get(bucketKey)
        if (bucket) {
          bucket.push(item)
        }
      })

      const promotedItems = filteredItems.filter((item) => item.isSponsored)
      const sections: TopFeedSection[] = []
      let promotedIndex = 0

      const bucketsWithItems = bucketOrder
        .map((bucket) => ({
          key: bucket.key,
          label: bucket.label,
          items: (buckets.get(bucket.key) ?? []).slice(0, 5),
        }))
        .filter((bucket) => bucket.items.length > 0)

      bucketsWithItems.forEach((bucket, index) => {
        sections.push({
          kind: "top",
          key: `${bucket.key}-top`,
          title: `${bucket.label} Top ${bucket.items.length}`,
          items: bucket.items,
        })

        const remainingPromoted = promotedItems.length - promotedIndex
        if (remainingPromoted <= 0) {
          return
        }

        const isLastTopBucket = index === bucketsWithItems.length - 1
        const chunkSize = isLastTopBucket
          ? remainingPromoted
          : Math.min(2, remainingPromoted)

        const chunk = promotedItems.slice(
          promotedIndex,
          promotedIndex + chunkSize,
        )
        promotedIndex += chunk.length

        if (chunk.length > 0) {
          sections.push({
            kind: "promoted",
            key: `${bucket.key}-promoted-${index}`,
            title: "Promoted",
            items: chunk,
          })
        }
      })

      const remainingPromoted = promotedItems.slice(promotedIndex)
      if (sections.length === 0 && remainingPromoted.length > 0) {
        sections.push({
          kind: "promoted",
          key: "promoted-only",
          title: "Promoted",
          items: remainingPromoted,
        })
      } else if (remainingPromoted.length > 0) {
        const lastBucket = bucketsWithItems[bucketsWithItems.length - 1]
        const lastKey = lastBucket?.key ?? "promoted"
        sections.push({
          kind: "promoted",
          key: `${lastKey}-promoted-final`,
          title: "Promoted",
          items: remainingPromoted,
        })
      }

      return sections
    }

    if (activeFilter === "new") {
      type NewBucketKey = "today" | "yesterday" | "thisWeek"
      const newBucketOrder: Array<{ key: NewBucketKey; label: string }> = [
        { key: "today", label: "Published Today" },
        { key: "yesterday", label: "Published Yesterday" },
        { key: "thisWeek", label: "Published This Week" },
      ]

      const newBuckets = new Map<NewBucketKey, HomepageFeedItem[]>(
        newBucketOrder.map((bucket) => [bucket.key, []]),
      )

      const organicItems = filteredItems.filter((item) => !item.isSponsored)
      organicItems.forEach((item) => {
        const created = new Date(item.createdAt)
        const createdTime = created.getTime()
        const resolvedDate = Number.isNaN(createdTime) ? startToday : created

        let bucketKey: NewBucketKey = "thisWeek"
        if (resolvedDate >= startToday) {
          bucketKey = "today"
        } else if (resolvedDate >= startYesterday) {
          bucketKey = "yesterday"
        } else if (resolvedDate >= startOfCurrentWeek) {
          bucketKey = "thisWeek"
        } else {
          bucketKey = "thisWeek"
        }

        const bucket = newBuckets.get(bucketKey)
        if (bucket) {
          bucket.push(item)
        }
      })

      const promotedItems = filteredItems.filter((item) => item.isSponsored)
      const sections: TopFeedSection[] = []
      let promotedIndex = 0
      let promotedSectionCount = 0

      const pushPromotedSection = (takeRemaining: boolean) => {
        const remaining = promotedItems.length - promotedIndex
        if (remaining <= 0) {
          return
        }

        const chunkSize = takeRemaining ? remaining : Math.min(2, remaining)
        const chunk = promotedItems.slice(
          promotedIndex,
          promotedIndex + chunkSize,
        )
        promotedIndex += chunk.length

        if (chunk.length === 0) {
          return
        }

        sections.push({
          kind: "promoted",
          key: `new-promoted-${promotedSectionCount}`,
          title: "Promoted",
          items: chunk,
        })
        promotedSectionCount += 1
      }

      const bucketsWithItems = newBucketOrder
        .map((bucket) => ({
          key: bucket.key,
          label: bucket.label,
          items: newBuckets.get(bucket.key) ?? [],
        }))
        .filter((bucket) => bucket.items.length > 0)

      if (bucketsWithItems.length === 0) {
        if (promotedItems.length > 0) {
          sections.push({
            kind: "promoted",
            key: "new-promoted-only",
            title: "Promoted",
            items: promotedItems,
          })
        }
        return sections
      }

      pushPromotedSection(false)

      bucketsWithItems.forEach((bucket, index) => {
        sections.push({
          kind: "top",
          key: `new-${bucket.key}`,
          title: bucket.label,
          items: bucket.items,
        })

        const isLastBucket = index === bucketsWithItems.length - 1
        pushPromotedSection(isLastBucket)
      })

      return sections
    }

    type RecentBucketKey = "today" | "yesterday" | "thisWeek" | "thisMonth"
    const recentBucketOrder: Array<{ key: RecentBucketKey; label: string }> = [
      { key: "today", label: "Updated Today" },
      { key: "yesterday", label: "Updated Yesterday" },
      { key: "thisWeek", label: "Updated This Week" },
      { key: "thisMonth", label: "Updated This Month" },
    ]

    const recentBuckets = new Map<RecentBucketKey, HomepageFeedItem[]>(
      recentBucketOrder.map((bucket) => [bucket.key, []]),
    )

    const organicItems = filteredItems.filter((item) => !item.isSponsored)
    organicItems.forEach((item) => {
      const updatedSource = item.updatedAt ?? item.createdAt
      const updated = new Date(updatedSource)
      const updatedTime = updated.getTime()
      const resolvedDate = Number.isNaN(updatedTime) ? startToday : updated

      let bucketKey: RecentBucketKey = "thisMonth"
      if (resolvedDate >= startToday) {
        bucketKey = "today"
      } else if (resolvedDate >= startYesterday) {
        bucketKey = "yesterday"
      } else if (resolvedDate >= startOfCurrentWeek) {
        bucketKey = "thisWeek"
      } else if (resolvedDate >= startOfCurrentMonth) {
        bucketKey = "thisMonth"
      } else {
        bucketKey = "thisMonth"
      }

      const bucket = recentBuckets.get(bucketKey)
      if (bucket) {
        bucket.push(item)
      }
    })

    const promotedItems = filteredItems.filter((item) => item.isSponsored)
    const sections: TopFeedSection[] = []
    let promotedIndex = 0
    let promotedSectionCount = 0

    const pushPromotedSection = (takeRemaining: boolean) => {
      const remaining = promotedItems.length - promotedIndex
      if (remaining <= 0) {
        return
      }

      const chunkSize = takeRemaining ? remaining : Math.min(2, remaining)
      const chunk = promotedItems.slice(
        promotedIndex,
        promotedIndex + chunkSize,
      )
      promotedIndex += chunk.length

      if (chunk.length === 0) {
        return
      }

      sections.push({
        kind: "promoted",
        key: `recent-promoted-${promotedSectionCount}`,
        title: "Promoted",
        items: chunk,
      })
      promotedSectionCount += 1
    }

    const bucketsWithItems = recentBucketOrder
      .map((bucket) => ({
        key: bucket.key,
        label: bucket.label,
        items: recentBuckets.get(bucket.key) ?? [],
      }))
      .filter((bucket) => bucket.items.length > 0)

    if (bucketsWithItems.length === 0) {
      if (promotedItems.length > 0) {
        sections.push({
          kind: "promoted",
          key: "recent-promoted-only",
          title: "Promoted",
          items: promotedItems,
        })
      }
      return sections
    }

    pushPromotedSection(false)

    bucketsWithItems.forEach((bucket, index) => {
      sections.push({
        kind: "top",
        key: `recent-${bucket.key}`,
        title: bucket.label,
        items: bucket.items,
      })

      const isLastBucket = index === bucketsWithItems.length - 1
      pushPromotedSection(isLastBucket)
    })

    return sections
  }, [activeFilter, filteredItems])

  const feedRows = useMemo<FeedRow[]>(() => {
    if (activeFilter === "new" || activeFilter === "recent") {
      return []
    }

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

      if (
        organicSinceLastSponsored === 5 &&
        sponsorIndex < sponsorPairs.length
      ) {
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
    if (filterPending || loading || isPending) {
      return
    }

    if (activeFilter !== "top" || !hasMore) {
      if (maskNextAutoLoad) {
        setMaskNextAutoLoad(false)
      }
      setViewHydrating(false)
      return
    }

    const organicCount = items.reduce(
      (count, item) => (item.isSponsored ? count : count + 1),
      0,
    )
    const hasSponsored = items.length > organicCount

    if (!hasSponsored || organicCount >= MIN_ORGANIC_BEFORE_SPONSORED) {
      if (maskNextAutoLoad) {
        setMaskNextAutoLoad(false)
      }
      setViewHydrating(false)
      return
    }

    const shouldShowSkeleton = maskNextAutoLoad
    setMaskNextAutoLoad(false)
    loadMore({ showTransitionSkeleton: shouldShowSkeleton })
  }, [
    activeFilter,
    filterPending,
    hasMore,
    isPending,
    items,
    loadMore,
    loading,
    maskNextAutoLoad,
  ])

  const usesSectionedLayout =
    activeFilter === "top" ||
    activeFilter === "new" ||
    activeFilter === "recent"

  const renderableSections = Array.isArray(sectionedSections)
    ? sectionedSections.filter((section) => section.items.length > 0)
    : []

  const hasSectionedContent = renderableSections.length > 0

  const shouldShowEmptyState = usesSectionedLayout
    ? !hasSectionedContent
    : feedRows.length === 0

  const emptyState =
    shouldShowEmptyState && !isLoading ? (
      <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-12 text-center text-sm font-medium text-slate-500">
        Nothing to show yet for this view. Try switching filters to explore more
        launches.
      </div>
    ) : null
  const handleLoadMore = useCallback(() => {
    loadMore()
  }, [loadMore])

  const filterViewSkeleton = useMemo(
    () => (
      <div className="space-y-6" aria-hidden="true">
        {Array.from({ length: FILTER_SKELETON_COUNT }).map((_, index) => (
          <ProductFeedCardSkeleton key={`filter-switch-skeleton-${index}`} />
        ))}
      </div>
    ),
    [],
  )

  return (
    <div
      className={cn("space-y-6", className)}
      data-testid="homepage-feed-client"
    >
      <div className="flex flex-wrap items-center gap-2 rounded-full border border-slate-200/60 bg-white px-2 py-2 shadow-[0_18px_38px_-32px_rgba(28,35,51,0.25)]">
        {FEED_FILTERS.map((filter) => {
          const isActive = activeFilter === filter.key
          return (
            <button
              key={filter.key}
              type="button"
              onClick={() => handleFilterSelect(filter.key)}
              className={cn(
                "inline-flex items-center rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
                isActive
                  ? "bg-[#1C2333] text-white shadow-[0_18px_38px_-28px_rgba(28,35,51,0.55)]"
                  : "bg-transparent text-[#3B4256] hover:bg-slate-100",
              )}
              aria-pressed={isActive}
              disabled={isActive || filterPending}
            >
              {filter.label}
            </button>
          )
        })}
      </div>

      <StickyBannerRegion priority={20} className="w-full" />

      {filterPending || viewHydrating ? (
        filterViewSkeleton
      ) : (
        <>
          {usesSectionedLayout ? (
            <>
              <section className="space-y-10">
                {renderableSections.map((section, index) => {
                  const isLastSection = index === renderableSections.length - 1
                  if (section.kind === "promoted") {
                    return (
                      <div key={section.key} className="space-y-5">
                        <div className="flex flex-col gap-3">
                          <div className="inline-flex items-center gap-3 text-[#B45309]">
                            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FEF3C7] text-[#D97706]">
                              <Flame className="h-4 w-4" aria-hidden="true" />
                            </span>
                            <span className="text-lg font-semibold tracking-tight">
                              {section.title}
                            </span>
                          </div>
                          <span
                            aria-hidden="true"
                            className="block h-px w-full rounded-full bg-[#FCD34D]/60"
                          />
                        </div>
                        <div className="space-y-4">
                          {section.items.map((item) => (
                            <ProductFeedCard
                              key={`${section.key}-${item.id}`}
                              item={item}
                              variant="promoted"
                            />
                          ))}
                        </div>
                        {!isLastSection ? (
                          <span
                            aria-hidden="true"
                            className="block h-px w-full rounded-full bg-[#E9ECF8]"
                          />
                        ) : null}
                      </div>
                    )
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
                        {section.items.map((item) => (
                          <ProductFeedCard
                            key={`${section.key}-${item.id}`}
                            item={item}
                          />
                        ))}
                      </div>
                    </div>
                  )
                })}
              </section>

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
            </>
          ) : (
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
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#575C73]">
                      Sponsored
                    </p>
                    <div className="space-y-6">
                      {row.items.map((item) => (
                        <ProductFeedCard
                          key={`${row.key}-${item.id}`}
                          item={item}
                          variant="sponsored"
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {!usesSectionedLayout && showSkeletons ? (
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

          {!usesSectionedLayout && hasMore ? (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={isLoading || filterPending}
                className="inline-flex items-center rounded-full bg-[#1C2333] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#101524] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isLoading ? "Loading…" : "Load more launches"}
              </button>
            </div>
          ) : null}

          {!usesSectionedLayout && !hasMore ? (
            <p className="py-6 text-center text-sm font-semibold uppercase tracking-[0.22em] text-[#98A0B5]">
              You&apos;ve reached the end of today&apos;s launches — check back
              tomorrow for fresh drops.
            </p>
          ) : null}
        </>
      )}
    </div>
  )
}

export default HomepageFeedClient

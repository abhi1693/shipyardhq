"use client"

import Link from "next/link"
import { Flame } from "lucide-react"
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { addDays, startOfDay } from "date-fns"

import type { HomepageFeedItem } from "@/actions/public/homepage/feed"
import { GoogleAdsenseUnit } from "@/components/molecules/GoogleAdsenseUnit"
import ProductFeedCard from "@/components/molecules/ProductFeedCard"
import type { HomepageFeedView } from "@/lib/homepage/feed-views"
import { MEMBER_PRODUCTS_PATH } from "@/lib/routes"
import { cn } from "@/lib/utils"

const REMAINING_PAGE_SIZE = 20
const PROMOTED_PRODUCT_INTERVAL = 8
const PROMOTED_PRODUCTS_PER_SLOT = 1

export interface ProductFeedListProps {
  activeFilter: HomepageFeedView
  items: HomepageFeedItem[]
  className?: string
  referenceDateIso: string
  showRemaining?: boolean
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

function getFeedItemDate(item: HomepageFeedItem) {
  return item.publishedAt ?? item.createdAt
}

function isPromotedFeedItem(item: HomepageFeedItem) {
  return item.isSponsored || item.variant === "promoted"
}

function compareBucketItems(a: HomepageFeedItem, b: HomepageFeedItem) {
  const aRank = Number.isFinite(a.shuffleRank) ? a.shuffleRank : null
  const bRank = Number.isFinite(b.shuffleRank) ? b.shuffleRank : null

  if (aRank !== null && bRank !== null && aRank !== bRank) {
    return aRank - bRank
  }

  if (aRank !== null) return -1
  if (bRank !== null) return 1

  const aTime = new Date(getFeedItemDate(a) ?? "").getTime()
  const bTime = new Date(getFeedItemDate(b) ?? "").getTime()
  const aHasTime = !Number.isNaN(aTime)
  const bHasTime = !Number.isNaN(bTime)

  if (aHasTime && bHasTime && aTime !== bTime) {
    return bTime - aTime
  }

  return a.name.localeCompare(b.name)
}

function buildNewViewSections(
  items: HomepageFeedItem[],
  referenceDate: Date,
): FeedSection[] {
  if (items.length === 0) {
    return []
  }

  const startToday = startOfDay(referenceDate)
  const startYesterday = addDays(startToday, -1)
  const startLastSevenDays = addDays(startToday, -7)

  type BucketKey = "today" | "yesterday" | "thisWeek"
  const bucketOrder: Array<{ key: BucketKey; label: string }> = [
    { key: "today", label: "Published Today" },
    { key: "yesterday", label: "Published Yesterday" },
    { key: "thisWeek", label: "Published This Week" },
  ]

  const buckets = new Map<BucketKey, HomepageFeedItem[]>(
    bucketOrder.map((bucket) => [bucket.key, []]),
  )

  const organicItems = items.filter((item) => !isPromotedFeedItem(item))
  organicItems.forEach((item) => {
    const published = new Date(getFeedItemDate(item))
    const publishedTime = published.getTime()
    const resolvedDate = Number.isNaN(publishedTime) ? startToday : published

    let bucketKey: BucketKey | null = null
    if (resolvedDate >= startToday) {
      bucketKey = "today"
    } else if (resolvedDate >= startYesterday) {
      bucketKey = "yesterday"
    } else if (resolvedDate >= startLastSevenDays) {
      bucketKey = "thisWeek"
    }

    if (!bucketKey) {
      return
    }

    const bucket = buckets.get(bucketKey)
    if (bucket) {
      bucket.push(item)
    }
  })

  const promotedItems = items.filter(isPromotedFeedItem)

  const sections: FeedSection[] = []
  let promotedIndex = 0
  let promotedSectionCount = 0

  const takePromotedChunk = () => {
    const remaining = promotedItems.length - promotedIndex
    if (remaining <= 0) {
      return null
    }
    const chunkSize = Math.min(PROMOTED_PRODUCTS_PER_SLOT, remaining)
    const chunk = promotedItems.slice(promotedIndex, promotedIndex + chunkSize)
    promotedIndex += chunk.length
    return chunk
  }

  const bucketsWithItems = bucketOrder.map((bucket) => ({
    key: bucket.key,
    label: bucket.label,
    items: [...(buckets.get(bucket.key) ?? [])].sort(compareBucketItems),
  }))

  let organicCount = 0

  bucketsWithItems.forEach((bucket) => {
    const rows: BucketRow[] = []

    if (promotedIndex === 0) {
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

    bucket.items.forEach((item) => {
      rows.push({
        kind: "product",
        key: `${bucket.key}-product-${item.id}`,
        item,
      })
      organicCount += 1

      const reachedPromotedSlot = organicCount % PROMOTED_PRODUCT_INTERVAL === 0
      if (reachedPromotedSlot) {
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
  }

  return sections
}

export function ProductFeedList({
  activeFilter,
  items,
  className,
  referenceDateIso,
  showRemaining = false,
}: ProductFeedListProps) {
  const view = activeFilter
  const [remainingPages, setRemainingPages] = useState<Record<string, number>>(
    {},
  )
  const remainingObserverRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    return () => {
      remainingObserverRef.current?.disconnect()
      remainingObserverRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!showRemaining || view !== "new") {
      remainingObserverRef.current?.disconnect()
      remainingObserverRef.current = null
    }
  }, [showRemaining, view])

  const sortedItems = useMemo(() => {
    if (view !== "new") {
      return [...items]
    }

    return [...items].sort((a, b) => {
      const aTime = new Date(getFeedItemDate(a) ?? "").getTime()
      const bTime = new Date(getFeedItemDate(b) ?? "").getTime()

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
  }, [items, view])

  const referenceDate = useMemo(() => {
    const parsed = new Date(referenceDateIso)
    return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed
  }, [referenceDateIso])

  const sections = useMemo(() => {
    if (view !== "new") {
      return [] as FeedSection[]
    }

    return buildNewViewSections(sortedItems, referenceDate)
  }, [referenceDate, sortedItems, view])

  const sectionProductIds = useMemo(() => {
    if (view !== "new" || !showRemaining) {
      return new Set<string>()
    }

    const ids = new Set<string>()

    sections.forEach((section) => {
      if (section.kind === "bucket") {
        section.rows.forEach((row) => {
          if (row.kind === "product") {
            ids.add(row.item.id)
          } else {
            row.items.forEach((item) => ids.add(item.id))
          }
        })
      } else {
        section.items.forEach((item) => ids.add(item.id))
      }
    })

    return ids
  }, [sections, showRemaining, view])

  const remainingKey = useMemo(() => {
    if (!showRemaining || view !== "new") {
      return "disabled"
    }

    const ids = sortedItems.map((item) => item.id).join("|")
    return `${view}:${ids}`
  }, [showRemaining, sortedItems, view])

  const remainingItems = useMemo(() => {
    if (view !== "new" || !showRemaining) {
      return [] as HomepageFeedItem[]
    }

    if (!sortedItems.length) {
      return [] as HomepageFeedItem[]
    }

    return sortedItems.filter((item) => !sectionProductIds.has(item.id))
  }, [sectionProductIds, showRemaining, sortedItems, view])

  const remainingPage = useMemo(() => {
    if (!showRemaining || view !== "new") {
      return 1
    }

    return remainingPages[remainingKey] ?? 1
  }, [remainingKey, remainingPages, showRemaining, view])

  const visibleRemainingItems = useMemo(() => {
    if (!showRemaining || view !== "new") {
      return [] as HomepageFeedItem[]
    }

    return remainingItems.slice(0, remainingPage * REMAINING_PAGE_SIZE)
  }, [remainingItems, remainingPage, showRemaining, view])

  const sectionFallbackAdRowKey = useMemo(() => {
    if (view !== "new") return null

    const hasPromotedRows = sections.some((section) => {
      if (section.kind === "promoted") return section.items.length > 0
      return section.rows.some((row) => row.kind === "promoted")
    })

    if (hasPromotedRows) return null

    for (const section of sections) {
      if (section.kind === "promoted") continue
      const firstProductRow = section.rows.find((row) => row.kind === "product")
      if (firstProductRow) return firstProductRow.key
    }

    return null
  }, [sections, view])

  const fallbackAdBoundaryIndex = useMemo(() => {
    if (view === "new" || sortedItems.length === 0) return -1

    const lastSponsoredIndex = sortedItems.reduce(
      (lastIndex, item, index) => (item.isSponsored ? index : lastIndex),
      -1,
    )

    return lastSponsoredIndex >= 0 ? lastSponsoredIndex : 0
  }, [sortedItems, view])

  const remainingAdBoundaryIndex = useMemo(() => {
    if (view !== "new" || visibleRemainingItems.length === 0) return -1

    const lastSponsoredIndex = visibleRemainingItems.reduce(
      (lastIndex, item, index) => (item.isSponsored ? index : lastIndex),
      -1,
    )

    return lastSponsoredIndex >= 0 ? lastSponsoredIndex : 0
  }, [view, visibleRemainingItems])

  const hasMoreRemaining =
    showRemaining &&
    view === "new" &&
    visibleRemainingItems.length < remainingItems.length

  const hasSectionedContent = sections.some((section) =>
    section.kind === "bucket"
      ? section.rows.some((row) => row.kind === "product")
      : section.items.length > 0,
  )

  const hasRemainingContent =
    showRemaining && view === "new" && visibleRemainingItems.length > 0
  const hasFallbackContent = view !== "new" && sortedItems.length > 0

  const remainingLoaderRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (remainingObserverRef.current) {
        remainingObserverRef.current.disconnect()
        remainingObserverRef.current = null
      }

      if (!node || !showRemaining || view !== "new" || !hasMoreRemaining) {
        return
      }

      const observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0]
          if (entry?.isIntersecting) {
            observer.disconnect()
            remainingObserverRef.current = null
            setRemainingPages((prev) => {
              const current = prev[remainingKey] ?? 1
              return {
                ...prev,
                [remainingKey]: current + 1,
              }
            })
          }
        },
        { rootMargin: "0px 0px 200px", threshold: 0.1 },
      )

      observer.observe(node)
      remainingObserverRef.current = observer
    },
    [hasMoreRemaining, remainingKey, showRemaining, view],
  )

  const emptyState =
    !hasSectionedContent &&
    !hasFallbackContent &&
    (!showRemaining || !hasRemainingContent) ? (
      <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-12 text-center text-sm text-slate-600">
        <div className="space-y-3">
          <p className="text-base font-semibold text-[#1C2333]">
            No launches yet. Be the first to add yours.
          </p>
          <p className="text-sm text-slate-500">
            Share your startup to appear in the feed and start collecting
            traction.
          </p>
          <div className="flex justify-center">
            <Link
              href={MEMBER_PRODUCTS_PATH}
              className="inline-flex items-center gap-2 rounded-full bg-[color:var(--brand-1)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[color:var(--brand-2)]"
            >
              Launch your startup
            </Link>
          </div>
        </div>
      </div>
    ) : null

  const fallbackList =
    view !== "new" && sortedItems.length > 0 ? (
      <div className="space-y-4">
        {sortedItems.map((item, index) => (
          <Fragment key={`feed-${item.id}`}>
            <ProductFeedCard item={item} />
            {index === fallbackAdBoundaryIndex ? <GoogleAdsenseUnit /> : null}
          </Fragment>
        ))}
      </div>
    ) : null

  const remainingList =
    showRemaining && hasRemainingContent && view === "new" ? (
      <section className="space-y-5">
        {hasSectionedContent ? (
          <div className="space-y-3">
            <span className="text-lg font-semibold text-[#1C2333]">
              Earlier launches
            </span>
            <span
              aria-hidden="true"
              className="block h-px w-full rounded-full bg-[#E5E8F5]"
            />
          </div>
        ) : null}
        <div className="space-y-4">
          {visibleRemainingItems.map((item, index) => (
            <Fragment key={`remaining-${item.id}`}>
              <ProductFeedCard item={item} />
              {index === remainingAdBoundaryIndex ? (
                <GoogleAdsenseUnit />
              ) : null}
            </Fragment>
          ))}
        </div>
        {hasMoreRemaining ? (
          <div
            ref={remainingLoaderRef}
            className="flex justify-center py-4 text-sm text-slate-500"
          >
            Loading more launches…
          </div>
        ) : null}
      </section>
    ) : null

  const renderPromotedGroup = (
    key: string,
    promotedItems: HomepageFeedItem[],
    options: { showDivider?: boolean } = {},
  ) => (
    <div key={key} className="space-y-5">
      <div className="flex flex-col gap-3">
        <div className="inline-flex items-center gap-3 text-[#B45309]">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FEF3C7] text-[#D97706]">
            <Flame
              className="h-4 w-4"
              aria-hidden="true"
              fill="currentColor"
              strokeWidth={1.75}
            />
          </span>
          <span className="text-lg font-semibold tracking-tight">Promoted</span>
        </div>
        <span
          aria-hidden="true"
          className="block h-px w-full rounded-full bg-[#FCD34D]/60"
        />
      </div>
      <div className="space-y-4">
        {promotedItems.map((item) => (
          <ProductFeedCard
            key={`${key}-${item.id}`}
            item={item}
            variant="promoted"
          />
        ))}
      </div>
      <GoogleAdsenseUnit />
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
                  {section.rows.length > 0 ? (
                    section.rows.map((row) => {
                      if (row.kind === "product") {
                        return (
                          <Fragment key={row.key}>
                            <ProductFeedCard item={row.item} />
                            {row.key === sectionFallbackAdRowKey ? (
                              <GoogleAdsenseUnit />
                            ) : null}
                          </Fragment>
                        )
                      }
                      return renderPromotedGroup(row.key, row.items)
                    })
                  ) : (
                    <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/60 px-5 py-4 text-sm text-slate-500">
                      No launches in this window yet.
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </section>
      ) : null}

      {remainingList}

      {fallbackList}

      {emptyState}
    </div>
  )
}

export default ProductFeedList

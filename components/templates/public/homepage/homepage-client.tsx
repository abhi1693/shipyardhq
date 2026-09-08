"use client"

import {
  createContext,
  Fragment,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import Link from "next/link"
import { BadgeCheck, ChevronUp } from "lucide-react"

import { Card, CardContent } from "@/components/atoms/card"
import { Button } from "@/components/atoms/button"
import { ProductLogoImage } from "@/components/atoms/product-logo-image"
import type {
  HomepageFeedItem,
  HomepageFeedPageResult,
} from "@/lib/server/homepage/feed"
import { ProductCategoryPills } from "@/components/molecules/ProductCategoryPills"
import type { ProductCategorySummary } from "@/lib/products/categories"
import type { HomepageLaunchPeriod } from "@/lib/homepage/launch-periods"
import { BROWSE_PATH, productCardPath } from "@/lib/routes"
import { cn } from "@/lib/utils"

const formatter = new Intl.NumberFormat("en-US")
const SPONSORED_DROP_INTERVAL = 8

type HomepageVoteStateContextValue = {
  isVoted: (productId?: string) => boolean
  markVoted: (productId?: string) => void
  registerProductIds: (productIds: string[]) => void
}

const HomepageVoteStateContext = createContext<HomepageVoteStateContextValue>({
  isVoted: () => false,
  markVoted: () => {},
  registerProductIds: () => {},
})

export function HomepageVoteStateProvider({
  productIds,
  children,
}: {
  productIds: string[]
  children: ReactNode
}) {
  const [votedIds, setVotedIds] = useState<Set<string>>(() => new Set())
  const requestedIdsRef = useRef<Set<string>>(new Set())
  const productIdsKey = useMemo(() => productIds.join("|"), [productIds])
  const normalizedProductIds = useMemo(
    () => productIdsKey.split("|").filter(Boolean),
    [productIdsKey],
  )

  const fetchVoteState = useCallback(async (ids: string[]) => {
    const nextIds = Array.from(new Set(ids))
      .filter(Boolean)
      .filter((id) => !requestedIdsRef.current.has(id))
    if (!nextIds.length) return

    nextIds.forEach((id) => requestedIdsRef.current.add(id))

    try {
      const response = await fetch("/api/homepage/votes", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({ productIds: nextIds }),
      })
      if (!response.ok) return

      const payload = (await response.json()) as {
        votedProductIds?: unknown
      }
      const votedProductIds = payload.votedProductIds
      if (!Array.isArray(votedProductIds)) return

      setVotedIds((current) => {
        const next = new Set(current)
        votedProductIds
          .filter((id): id is string => typeof id === "string")
          .forEach((id) => next.add(id))
        return next
      })
    } catch {
      nextIds.forEach((id) => requestedIdsRef.current.delete(id))
    }
  }, [])

  useEffect(() => {
    requestedIdsRef.current = new Set()

    void fetchVoteState(normalizedProductIds)
  }, [fetchVoteState, normalizedProductIds])

  const value = useMemo<HomepageVoteStateContextValue>(
    () => ({
      isVoted: (productId) => Boolean(productId && votedIds.has(productId)),
      markVoted: (productId) => {
        if (!productId) return
        requestedIdsRef.current.add(productId)
        setVotedIds((current) => {
          const next = new Set(current)
          next.add(productId)
          return next
        })
      },
      registerProductIds: (ids) => {
        void fetchVoteState(ids)
      },
    }),
    [fetchVoteState, votedIds],
  )

  return (
    <HomepageVoteStateContext.Provider value={value}>
      {children}
    </HomepageVoteStateContext.Provider>
  )
}

function useHomepageVoteState() {
  return useContext(HomepageVoteStateContext)
}

function useCurrentRedirect() {
  const [redirectUrl] = useState<string | undefined>(() => {
    if (typeof window === "undefined") return undefined
    const { pathname, search, hash } = window.location
    return `${pathname}${search}${hash}`
  })

  return redirectUrl
}

function buildLoginHref(redirectUrl?: string) {
  if (!redirectUrl) return "/login"
  const params = new URLSearchParams({ redirect_url: redirectUrl })
  return `/login?${params.toString()}`
}

export function HomepageUpvoteButton({
  productId,
  productSlug,
  initialCount,
  initialUpvoted,
  className,
  dark = false,
  fullLabel = false,
  hideZeroCount = false,
}: {
  productId?: string
  productSlug?: string
  initialCount?: number | null
  initialUpvoted?: boolean
  className?: string
  dark?: boolean
  fullLabel?: boolean
  hideZeroCount?: boolean
}) {
  const voteState = useHomepageVoteState()
  const redirectUrl = useCurrentRedirect()
  const resolvedInitialUpvoted = Boolean(
    initialUpvoted || voteState.isVoted(productId),
  )
  const [state, setState] = useState({
    count:
      typeof initialCount === "number" && Number.isFinite(initialCount)
        ? initialCount
        : null,
    upvoted: resolvedInitialUpvoted,
    pending: false,
  })

  useEffect(() => {
    setState({
      count:
        typeof initialCount === "number" && Number.isFinite(initialCount)
          ? initialCount
          : null,
      upvoted: resolvedInitialUpvoted,
      pending: false,
    })
  }, [initialCount, resolvedInitialUpvoted])

  async function toggleUpvote() {
    if (state.pending) return
    if (state.upvoted) return

    const nextUpvoted = true
    const previous = state

    setState({
      count: state.count,
      upvoted: nextUpvoted,
      pending: Boolean(productSlug),
    })

    if (!productSlug) {
      return
    }

    try {
      const response = await fetch(
        `/api/products/${encodeURIComponent(productSlug)}/upvote`,
        { method: "POST" },
      )
      const payload = (await response.json().catch(() => ({}))) as Partial<{
        upvoted: boolean
      }>

      if (!response.ok) {
        if (response.status === 401) {
          window.location.assign(buildLoginHref(redirectUrl))
          return
        }

        throw new Error("Failed to update upvote")
      }

      setState({
        count: state.count,
        upvoted:
          typeof payload.upvoted === "boolean" ? payload.upvoted : nextUpvoted,
        pending: false,
      })
      voteState.markVoted(productId)
    } catch {
      setState({ ...previous, pending: false })
    }
  }

  const buttonClassName = cn(
    "inline-flex h-auto cursor-pointer items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-xs font-semibold transition-all active:scale-[0.98] disabled:cursor-pointer disabled:opacity-70",
    dark
      ? "border border-white/10 bg-white/5 text-white hover:bg-white/10"
      : "bg-[#0051d5] text-white shadow-sm hover:bg-[#0048bf]",
    className,
    state.upvoted &&
      (dark
        ? "border-[#C0FF00] bg-[#C0FF00] text-[#061d31] hover:bg-[#C0FF00]/90"
        : "bg-[#0051d5] text-white hover:bg-[#0048bf]"),
  )
  const displayCount = typeof state.count === "number" ? state.count : null
  const shouldDisplayCount =
    displayCount !== null && (!hideZeroCount || displayCount > 0)
  const content = (
    <>
      <span
        className={cn(
          "inline-flex h-5 w-5 items-center justify-center rounded-full transition-colors",
          state.upvoted && (dark ? "bg-black/10" : "bg-white/20"),
        )}
      >
        <ChevronUp
          className={cn("size-4", state.upvoted && "stroke-[3]")}
          aria-hidden
        />
      </span>
      <span>
        {fullLabel ? "Upvote" : ""}
        {shouldDisplayCount
          ? `${fullLabel ? " " : ""}${formatter.format(displayCount)}`
          : ""}
      </span>
    </>
  )

  return (
    <Button
      type="button"
      className={buttonClassName}
      onClick={toggleUpvote}
      disabled={state.pending || state.upvoted}
      aria-pressed={state.upvoted}
    >
      {content}
    </Button>
  )
}

export type HomepageDropListItem = {
  id?: string
  slug?: string
  name: string
  tagline: string
  logo?: string | null
  category?: string | null
  categorySlug?: string | null
  categories: ProductCategorySummary[]
  scoreCount?: number | null
  isSponsored?: boolean
  variant?: HomepageFeedItem["variant"]
  isVoted?: boolean
  publishedAt?: string | null
  createdAt?: string
}

type HomepageDropSection = {
  key: string
  title: string
  items: HomepageDropListItem[]
}

const HOMEPAGE_LAUNCH_PERIOD_TITLES: Record<HomepageLaunchPeriod, string> = {
  recent: "This Week",
  lastWeek: "Last Week",
  thisMonth: "This Month",
  previousMonth: "Last Month",
  thisYear: "This Year",
}

function toDropListItem(item: HomepageFeedItem): HomepageDropListItem {
  return {
    id: item.id,
    slug: item.slug,
    name: item.name,
    tagline: item.tagline,
    logo: item.logo,
    category: item.category,
    categorySlug: item.categorySlug,
    categories: item.categories,
    scoreCount: item.scoreCount,
    isSponsored: item.isSponsored,
    variant: item.variant,
    isVoted: item.isVoted,
    publishedAt: item.publishedAt,
    createdAt: item.createdAt,
  }
}

function dropKey(product: HomepageDropListItem) {
  return product.id ?? product.slug ?? product.name
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((segment) => segment[0]?.toUpperCase() ?? "")
    .join("")
}

function getDropDate(item: HomepageDropListItem) {
  return item.publishedAt ?? item.createdAt
}

function isPromotedDrop(item: HomepageDropListItem) {
  return Boolean(item.isSponsored) || item.variant === "promoted"
}

function startOfUtcDay(date: Date) {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
}

function addUtcDays(time: number, days: number) {
  return time + days * 24 * 60 * 60 * 1000
}

function startOfUtcWeek(time: number) {
  const start = startOfUtcDay(new Date(time))
  const day = new Date(start).getUTCDay()
  const daysSinceMonday = day === 0 ? 6 : day - 1
  return addUtcDays(start, -daysSinceMonday)
}

function startOfUtcMonth(time: number) {
  const date = new Date(time)
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)
}

function startOfPreviousUtcMonth(time: number) {
  const date = new Date(time)
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 1, 1)
}

function startOfUtcYear(time: number) {
  const date = new Date(time)
  return Date.UTC(date.getUTCFullYear(), 0, 1)
}

function buildDropSections(
  items: HomepageDropListItem[],
  referenceDateIso: string,
  launchPeriod: HomepageLaunchPeriod | null,
): HomepageDropSection[] {
  const referenceDate = new Date(referenceDateIso)
  const referenceTime = Number.isNaN(referenceDate.getTime())
    ? Date.now()
    : referenceDate.getTime()
  const startToday = startOfUtcDay(new Date(referenceTime))
  const startYesterday = addUtcDays(startToday, -1)
  const startThisWeek = startOfUtcWeek(referenceTime)
  const startLastWeek = addUtcDays(startThisWeek, -7)
  const startThisMonth = startOfUtcMonth(referenceTime)
  const startPreviousMonth = startOfPreviousUtcMonth(referenceTime)
  const startThisYear = startOfUtcYear(referenceTime)
  const sponsoredItems = items.filter(isPromotedDrop)

  if (launchPeriod && launchPeriod !== "recent") {
    const sectionItems = [...items]
    return sectionItems.length > 0
      ? [
          {
            key: launchPeriod,
            title: HOMEPAGE_LAUNCH_PERIOD_TITLES[launchPeriod],
            items: sectionItems,
          },
        ]
      : []
  }

  type BucketKey =
    | "today"
    | "yesterday"
    | "thisWeek"
    | "lastWeek"
    | "thisMonth"
    | "previousMonth"
    | "thisYear"
  const primaryBucketOrder: Array<{ key: BucketKey; title: string }> = [
    { key: "today", title: "Today" },
    { key: "yesterday", title: "Yesterday" },
  ]
  const fallbackBucketOrder: Array<{ key: BucketKey; title: string }> = [
    { key: "thisWeek", title: "This Week" },
    { key: "lastWeek", title: "Last Week" },
    { key: "thisMonth", title: "This Month" },
    { key: "previousMonth", title: "Last Month" },
    { key: "thisYear", title: "This Year" },
  ]
  const buckets = new Map<BucketKey, HomepageDropListItem[]>(
    [...primaryBucketOrder, ...fallbackBucketOrder].map((bucket) => [
      bucket.key,
      [],
    ]),
  )

  items
    .filter((item) => !isPromotedDrop(item))
    .forEach((item) => {
      const published = new Date(getDropDate(item) ?? referenceDateIso)
      const publishedTime = published.getTime()
      const resolvedTime = Number.isNaN(publishedTime)
        ? referenceTime
        : publishedTime

      let bucketKey: BucketKey | null = null
      if (resolvedTime >= startToday) {
        bucketKey = "today"
      } else if (resolvedTime >= startYesterday) {
        bucketKey = "yesterday"
      } else if (resolvedTime >= startThisWeek) {
        bucketKey = "thisWeek"
      } else if (resolvedTime >= startLastWeek) {
        bucketKey = "lastWeek"
      } else if (
        startThisMonth < startLastWeek &&
        resolvedTime >= startThisMonth
      ) {
        bucketKey = "thisMonth"
      } else if (
        resolvedTime >= startPreviousMonth &&
        resolvedTime < startThisMonth
      ) {
        bucketKey = "previousMonth"
      } else if (
        resolvedTime >= startThisYear &&
        resolvedTime < startPreviousMonth
      ) {
        bucketKey = "thisYear"
      }

      if (!bucketKey) return
      buckets.get(bucketKey)?.push(item)
    })

  const sections: HomepageDropSection[] = []
  let organicIndex = 0
  let sponsoredIndex = 0
  const selectedFallbackBucket = fallbackBucketOrder.find(
    (bucket) => (buckets.get(bucket.key) ?? []).length > 0,
  )
  const bucketOrder = selectedFallbackBucket
    ? [...primaryBucketOrder, selectedFallbackBucket]
    : primaryBucketOrder

  bucketOrder.forEach((bucket) => {
    const organicItems = buckets.get(bucket.key) ?? []
    const sectionItems: HomepageDropListItem[] = []

    if (
      sponsoredIndex === 0 &&
      sponsoredIndex < sponsoredItems.length &&
      organicItems.length > 0
    ) {
      sectionItems.push(sponsoredItems[sponsoredIndex])
      sponsoredIndex += 1
    }

    organicItems.forEach((item) => {
      sectionItems.push(item)
      organicIndex += 1

      if (
        organicIndex % SPONSORED_DROP_INTERVAL === 0 &&
        sponsoredIndex < sponsoredItems.length
      ) {
        sectionItems.push(sponsoredItems[sponsoredIndex])
        sponsoredIndex += 1
      }
    })

    if (sectionItems.length > 0) {
      sections.push({
        key: bucket.key,
        title: bucket.title,
        items: sectionItems,
      })
    }
  })

  return sections
}

function uniqueDropItems(items: HomepageDropListItem[]) {
  const seen = new Set<string>()

  return items.filter((item) => {
    const key = dropKey(item)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function DropProductLogo({
  product,
  sponsored,
}: {
  product: HomepageDropListItem
  sponsored: boolean
}) {
  return (
    <div
      className={cn(
        "flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg text-sm font-black shadow-sm sm:size-14",
        sponsored
          ? "border border-white/20 bg-white/10 text-white"
          : "bg-[#e5eeff] text-[#061d31]",
      )}
    >
      {product.logo ? (
        <ProductLogoImage
          src={product.logo}
          name={product.name}
          width={56}
          height={56}
          sizes={sponsored ? "56px" : "40px"}
          className={cn(
            "h-full w-full object-cover",
            sponsored ? "contrast-125" : "h-10 w-10",
          )}
        />
      ) : (
        <span>{initials(product.name)}</span>
      )}
    </div>
  )
}

function HomepageDropRow({ product }: { product: HomepageDropListItem }) {
  const sponsored = Boolean(product.isSponsored)
  const editorPick = !sponsored && product.variant === "promoted"
  const href = product.slug
    ? productCardPath(product.slug, { sponsored })
    : BROWSE_PATH
  const redirectsToWebsite = Boolean(product.slug && sponsored)

  return (
    <Card
      className={cn(
        "group relative gap-0 rounded-xl py-0 shadow-none transition-all",
        sponsored
          ? "border-white/10 bg-[#213145] text-white hover:shadow-lg"
          : "border-[#E2E8F0] bg-white hover:shadow-sm",
      )}
    >
      <CardContent className="flex flex-wrap items-center gap-3 p-4 sm:flex-nowrap sm:gap-6 sm:p-5">
        {sponsored || editorPick ? (
          <div
            className={cn(
              "absolute right-2 top-2 flex items-center gap-1",
              sponsored ? "text-white/60" : "text-[#7C3AED]",
            )}
          >
            <span className="text-[9px] font-extrabold uppercase leading-[10px] tracking-widest">
              {sponsored ? "Sponsored" : "Editor's Pick"}
            </span>
            <BadgeCheck className="size-3" aria-hidden />
          </div>
        ) : null}
        <DropProductLogo product={product} sponsored={sponsored} />
        <div className="min-w-0 flex-[1_1_calc(100%-60px)] sm:flex-1">
          <div className="mb-1 flex min-w-0 items-center gap-2">
            <Link
              href={href}
              prefetch={redirectsToWebsite ? false : undefined}
              target={redirectsToWebsite ? "_blank" : undefined}
              rel={
                redirectsToWebsite ? "noopener noreferrer sponsored" : undefined
              }
              className="truncate text-lg font-semibold leading-6 hover:underline"
            >
              {product.name}
            </Link>
          </div>
          <p
            className={cn(
              "truncate text-sm leading-5",
              sponsored ? "text-white/70" : "text-[#43474c]",
            )}
          >
            {product.tagline}
          </p>
          <ProductCategoryPills
            categories={product.categories}
            emptyLabel="New Tool"
            className="mt-2 gap-1.5"
            pillClassName={cn(
              "rounded border-0 px-2 py-0.5 text-[9px] font-extrabold uppercase leading-[10px]",
              sponsored
                ? "bg-[#C0FF00] text-black"
                : "bg-[#F8FAFC] text-[#334155]",
            )}
            linkClassName={
              sponsored
                ? "hover:bg-[#C0FF00]/90 hover:text-black"
                : "hover:bg-[#e5eeff]"
            }
          />
        </div>
        <div className="ml-[60px] flex w-[calc(100%-60px)] justify-end pt-3 sm:ml-0 sm:w-auto sm:pt-0 sm:pl-6">
          <HomepageUpvoteButton
            productId={product.id}
            productSlug={product.slug}
            initialCount={product.scoreCount}
            initialUpvoted={product.isVoted}
            dark={sponsored}
            className={cn(
              "min-w-16 flex-col gap-0 rounded-r-xl bg-transparent px-3 py-2 shadow-none",
              sponsored
                ? "text-[#C0FF00] hover:bg-white/10"
                : "text-[#0051d5] hover:bg-[#EFF6FF]",
            )}
          />
        </div>
      </CardContent>
    </Card>
  )
}

export function HomepageDropsInfiniteList({
  initialItems,
  initialHasMore,
  initialNextPage,
  pageSize,
  launchPeriod,
  excludedProductId,
  excludedSlug,
  referenceDateIso,
  afterFirstSectionSlot,
  afterSecondSectionSlot,
}: {
  initialItems: HomepageDropListItem[]
  initialHasMore: boolean
  initialNextPage: number | null
  pageSize: number
  launchPeriod: HomepageLaunchPeriod | null
  excludedProductId?: string
  excludedSlug?: string
  referenceDateIso: string
  afterFirstSectionSlot?: ReactNode
  afterSecondSectionSlot?: ReactNode
}) {
  const initialUniqueItems = useMemo(
    () => uniqueDropItems(initialItems),
    [initialItems],
  )
  const [items, setItems] = useState(initialUniqueItems)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [nextPage, setNextPage] = useState(initialNextPage)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const sentinelVisibleRef = useRef(false)
  const seenKeysRef = useRef(new Set(initialUniqueItems.map(dropKey)))
  const voteState = useHomepageVoteState()
  const sections = useMemo(
    () => buildDropSections(items, referenceDateIso, launchPeriod),
    [items, launchPeriod, referenceDateIso],
  )
  const visibleSections = sections

  const loadMore = useCallback(async () => {
    if (loading || error || !hasMore || !nextPage) return

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        page: String(nextPage),
        pageSize: String(pageSize),
      })
      if (launchPeriod) {
        params.set("launchPeriod", launchPeriod)
      }
      if (excludedProductId) {
        params.set("excludeProductId", excludedProductId)
      }
      const response = await fetch(`/api/homepage/feed?${params.toString()}`, {
        headers: { accept: "application/json" },
      })

      if (!response.ok) {
        throw new Error("Failed to load drops")
      }

      const payload = (await response.json()) as HomepageFeedPageResult
      const nextItems = payload.items
        .filter((item) => !excludedSlug || item.slug !== excludedSlug)
        .map(toDropListItem)
        .filter((item) => {
          const key = dropKey(item)
          if (seenKeysRef.current.has(key)) return false
          seenKeysRef.current.add(key)
          return true
        })

      voteState.registerProductIds(
        nextItems
          .map((item) => item.id)
          .filter((id): id is string => Boolean(id)),
      )
      setItems((current) => [...current, ...nextItems])
      setHasMore(payload.hasMore)
      setNextPage(payload.nextPage)
    } catch {
      setError("More drops could not be loaded.")
    } finally {
      setLoading(false)
    }
  }, [
    error,
    excludedProductId,
    excludedSlug,
    hasMore,
    launchPeriod,
    loading,
    nextPage,
    pageSize,
    voteState,
  ])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !hasMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        const isIntersecting = entries.some((entry) => entry.isIntersecting)

        if (!isIntersecting) {
          sentinelVisibleRef.current = false
          return
        }

        if (!sentinelVisibleRef.current) {
          sentinelVisibleRef.current = true
          void loadMore()
        }
      },
      { rootMargin: "160px 0px" },
    )

    observer.observe(sentinel)

    return () => {
      observer.disconnect()
    }
  }, [hasMore, loadMore])

  if (items.length === 0 && !hasMore) {
    return (
      <Card className="rounded-xl border-[#E2E8F0] bg-white py-0 shadow-sm">
        <CardContent className="p-5 text-sm text-[#43474c]">
          No drops are live yet.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {visibleSections.map((section, sectionIndex) => {
        return (
          <Fragment key={section.key}>
            <section
              className="space-y-3"
              data-product-feed-section={section.key}
            >
              <div className="flex items-center gap-3">
                <h3 className="shrink-0 text-lg font-semibold text-black">
                  {section.title}
                </h3>
                <span className="h-px flex-1 bg-[#E2E8F0]" aria-hidden />
                <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#74777d]">
                  {section.items.length} launches
                </span>
              </div>
              <div className="space-y-3">
                {section.items.length > 0 ? (
                  section.items.map((product) => (
                    <HomepageDropRow key={dropKey(product)} product={product} />
                  ))
                ) : (
                  <Card className="rounded-xl border-dashed border-[#D8E0EA] bg-white/60 py-0 shadow-none">
                    <CardContent className="p-4 text-sm text-[#475569]">
                      No launches in this window yet.
                    </CardContent>
                  </Card>
                )}
              </div>
            </section>
            {sectionIndex === 0 && afterFirstSectionSlot ? (
              <div className="py-5">{afterFirstSectionSlot}</div>
            ) : null}
            {sectionIndex === Math.min(1, visibleSections.length - 1) &&
            afterSecondSectionSlot ? (
              <div className="py-5">{afterSecondSectionSlot}</div>
            ) : null}
          </Fragment>
        )
      })}

      <div ref={sentinelRef} className="min-h-10" aria-hidden />

      <div className="pt-2 text-center text-xs font-semibold uppercase tracking-[0.12em] text-[#74777d]">
        {loading ? "Loading more drops..." : null}
        {!loading && error ? error : null}
        {!loading && !error && !hasMore && items.length > 0
          ? `You've reached the end of ${launchPeriod && launchPeriod !== "recent" ? HOMEPAGE_LAUNCH_PERIOD_TITLES[launchPeriod].toLowerCase() : "recent"} launches.`
          : null}
      </div>
    </div>
  )
}

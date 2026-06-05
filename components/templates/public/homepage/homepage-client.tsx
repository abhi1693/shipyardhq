"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useUser } from "@clerk/nextjs"
import {
  Activity,
  BadgeCheck,
  ChevronUp,
  Handshake,
  Users,
  X,
  Zap,
} from "lucide-react"
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts"

import { ChartContainer, ChartTooltip } from "@/components/atoms/chart"
import { Card, CardContent } from "@/components/atoms/card"
import { Button } from "@/components/atoms/button"
import { Image } from "@/components/atoms/image"
import SignInButton from "@/components/molecules/SignInButton"
import type {
  HomepageFeedItem,
  HomepageFeedPageResult,
} from "@/actions/public/homepage/feed"
import type { TrafficSidebarStatsPayload } from "@/components/templates/public/common/TrafficSidebarStatsContent"
import { BROWSE_PATH, categoryPath, productPath } from "@/lib/routes"
import { cn } from "@/lib/utils"

const formatter = new Intl.NumberFormat("en-US")
const SPONSORED_DROP_INTERVAL = 4

function useCurrentRedirect() {
  const [redirectUrl] = useState<string | undefined>(() => {
    if (typeof window === "undefined") return undefined
    const { pathname, search, hash } = window.location
    return `${pathname}${search}${hash}`
  })

  return redirectUrl
}

export function HomepageUpvoteButton({
  productSlug,
  initialCount,
  initialUpvoted,
  className,
  dark = false,
  fullLabel = false,
}: {
  productSlug?: string
  initialCount: number
  initialUpvoted?: boolean
  className?: string
  dark?: boolean
  fullLabel?: boolean
}) {
  const { isSignedIn } = useUser()
  const redirectUrl = useCurrentRedirect()
  const [state, setState] = useState({
    count: initialCount,
    upvoted: Boolean(initialUpvoted),
    pending: false,
  })

  useEffect(() => {
    setState({
      count: initialCount,
      upvoted: Boolean(initialUpvoted),
      pending: false,
    })
  }, [initialCount, initialUpvoted])

  async function toggleUpvote() {
    if (state.pending) return

    const nextUpvoted = !state.upvoted
    const optimisticCount = Math.max(0, state.count + (nextUpvoted ? 1 : -1))
    const previous = state

    setState({
      count: optimisticCount,
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
        upvotes: number
        upvoted: boolean
      }>

      if (!response.ok) {
        throw new Error("Failed to update upvote")
      }

      setState({
        count:
          typeof payload.upvotes === "number"
            ? payload.upvotes
            : optimisticCount,
        upvoted:
          typeof payload.upvoted === "boolean" ? payload.upvoted : nextUpvoted,
        pending: false,
      })
    } catch {
      setState({ ...previous, pending: false })
    }
  }

  const buttonClassName = cn(
    "inline-flex h-auto items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-xs font-semibold transition-all active:scale-[0.98] disabled:opacity-70",
    dark
      ? "border border-white/10 bg-white/5 text-white hover:bg-white/10"
      : state.upvoted
        ? "bg-[#0051d5] text-white shadow-sm hover:bg-[#0048bf]"
        : "bg-[#0051d5] text-white shadow-sm hover:bg-[#0048bf]",
    className,
  )
  const content = (
    <>
      <ChevronUp
        className={cn("size-4", state.upvoted && "fill-current")}
        aria-hidden
      />
      <span>
        {fullLabel ? "Upvote " : ""}
        {formatter.format(state.count)}
      </span>
    </>
  )

  if (productSlug && !isSignedIn) {
    return (
      <SignInButton
        mode="modal"
        forceRedirectUrl={redirectUrl}
        signUpForceRedirectUrl={redirectUrl}
      >
        <span className={buttonClassName} role="button" tabIndex={0}>
          {content}
        </span>
      </SignInButton>
    )
  }

  return (
    <Button
      type="button"
      className={buttonClassName}
      onClick={toggleUpvote}
      disabled={state.pending}
      aria-pressed={state.upvoted}
    >
      {content}
    </Button>
  )
}

type HomepageMetricPoint = {
  label: string
  date: string
  pageViews: number
  visitors: number
}

function formatMetricDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date)
}

function normalizeMetricSeries(
  series: TrafficSidebarStatsPayload["trafficSeries"],
): HomepageMetricPoint[] {
  return (series ?? [])
    .map((point) => ({
      label: formatMetricDate(point.date),
      date: point.date,
      pageViews: Math.max(0, point.pageViews),
      visitors: Math.max(0, point.visitors),
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

function calculateSeriesDelta(
  points: HomepageMetricPoint[],
  key: "pageViews" | "visitors",
) {
  if (points.length < 4) return null

  const midpoint = Math.floor(points.length / 2)
  const previous = points
    .slice(0, midpoint)
    .reduce((sum, point) => sum + point[key], 0)
  const current = points
    .slice(midpoint)
    .reduce((sum, point) => sum + point[key], 0)

  if (previous <= 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

function formatDelta(value: number | null) {
  if (value == null) return "Last 30d"
  const sign = value > 0 ? "+" : ""
  return `${sign}${value.toFixed(1)}%`
}

export type HomepageDropListItem = {
  id?: string
  slug?: string
  name: string
  tagline: string
  logo?: string | null
  category?: string | null
  categorySlug?: string | null
  upvoteCount: number
  isSponsored?: boolean
  isVoted?: boolean
  publishedAt?: string | null
  createdAt?: string
  shuffleRank?: number
}

type HomepageDropSection = {
  key: string
  title: string
  items: HomepageDropListItem[]
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
    upvoteCount: item.upvoteCount,
    isSponsored: item.isSponsored,
    isVoted: item.isVoted,
    publishedAt: item.publishedAt,
    createdAt: item.createdAt,
    shuffleRank: item.shuffleRank,
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

function startOfUtcDay(date: Date) {
  return Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  )
}

function addUtcDays(time: number, days: number) {
  return time + days * 24 * 60 * 60 * 1000
}

function buildDropSections(
  items: HomepageDropListItem[],
  referenceDateIso: string,
): HomepageDropSection[] {
  const referenceDate = new Date(referenceDateIso)
  const referenceTime = Number.isNaN(referenceDate.getTime())
    ? Date.now()
    : referenceDate.getTime()
  const startToday = startOfUtcDay(new Date(referenceTime))
  const startYesterday = addUtcDays(startToday, -1)
  const startThisWeek = addUtcDays(startToday, -7)
  const sponsoredItems = items.filter((item) => item.isSponsored)

  type BucketKey = "today" | "yesterday" | "thisWeek"
  const bucketOrder: Array<{ key: BucketKey; title: string }> = [
    { key: "today", title: "Today" },
    { key: "yesterday", title: "Yesterday" },
    { key: "thisWeek", title: "This Week" },
  ]
  const buckets = new Map<BucketKey, HomepageDropListItem[]>(
    bucketOrder.map((bucket) => [bucket.key, []]),
  )

  items
    .filter((item) => !item.isSponsored)
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
      }

      if (!bucketKey) return
      buckets.get(bucketKey)?.push(item)
    })

  const sections: HomepageDropSection[] = []
  let organicIndex = 0
  let sponsoredIndex = 0

  bucketOrder.forEach((bucket) => {
    const organicItems = buckets.get(bucket.key) ?? []
    const sectionItems: HomepageDropListItem[] = []
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

    sections.push({
      key: bucket.key,
      title: bucket.title,
      items: sectionItems,
    })
  })

  if (sponsoredIndex === 0 && sponsoredItems.length > 0) {
    const firstSection = sections[0]
    if (firstSection) {
      firstSection.items.push(sponsoredItems[0])
      sponsoredIndex = 1
    }
  }

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
        "flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg text-sm font-black shadow-sm",
        sponsored
          ? "border border-white/20 bg-white/10 text-white"
          : "bg-[#e5eeff] text-[#061d31]",
      )}
    >
      {product.logo ? (
        <Image
          src={product.logo}
          alt={`${product.name} logo`}
          width={56}
          height={56}
          sizes="56px"
          className={cn(
            "h-full w-full object-cover",
            sponsored ? "contrast-125" : "h-10 w-10",
          )}
          unoptimized
        />
      ) : (
        <span>{initials(product.name)}</span>
      )}
    </div>
  )
}

function HomepageDropRow({ product }: { product: HomepageDropListItem }) {
  const sponsored = Boolean(product.isSponsored)
  const href = product.slug ? productPath(product.slug) : BROWSE_PATH
  const categoryLabel = product.category ?? "New Tool"
  const categoryClassName = cn(
    "shrink-0 rounded px-2 py-0.5 text-[9px] font-extrabold uppercase leading-[10px]",
    sponsored
      ? "bg-[#C0FF00] text-black hover:bg-[#C0FF00]/90"
      : "bg-[#F8FAFC] text-[#74777d] hover:bg-[#e5eeff] hover:text-[#0051d5]",
  )

  return (
    <Card
      className={cn(
        "group relative gap-0 rounded-xl py-0 shadow-none transition-all",
        sponsored
          ? "border-white/10 bg-[#213145] text-white hover:shadow-lg"
          : "border-[#E2E8F0] bg-white hover:shadow-sm",
      )}
    >
      <CardContent className="flex items-center gap-4 p-5 sm:gap-6">
        {sponsored ? (
          <div className="absolute right-2 top-2 flex items-center gap-1 text-white/60">
            <span className="text-[9px] font-extrabold uppercase leading-[10px] tracking-widest">
              Sponsored
            </span>
            <BadgeCheck className="size-3" aria-hidden />
          </div>
        ) : null}
        <DropProductLogo product={product} sponsored={sponsored} />
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex min-w-0 items-center gap-2">
            <Link
              href={href}
              className="truncate text-lg font-semibold leading-6 hover:underline"
            >
              {product.name}
            </Link>
            {product.categorySlug ? (
              <Link
                href={categoryPath(product.categorySlug)}
                className={categoryClassName}
              >
                {categoryLabel}
              </Link>
            ) : (
              <span className={categoryClassName}>{categoryLabel}</span>
            )}
          </div>
          <p
            className={cn(
              "truncate text-sm leading-5",
              sponsored ? "text-white/70" : "text-[#43474c]",
            )}
          >
            {product.tagline}
          </p>
        </div>
        <div
          className={cn(
            "pl-4 sm:pl-6",
            sponsored
              ? "border-l border-white/10"
              : "border-l border-[#E2E8F0]",
          )}
        >
          <HomepageUpvoteButton
            productSlug={product.slug}
            initialCount={product.upvoteCount}
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
  excludedSlug,
  referenceDateIso,
}: {
  initialItems: HomepageDropListItem[]
  initialHasMore: boolean
  initialNextPage: number | null
  pageSize: number
  excludedSlug?: string
  referenceDateIso: string
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
  const sections = useMemo(
    () =>
      buildDropSections(items, referenceDateIso).filter(
        (section) => section.items.length > 0,
      ),
    [items, referenceDateIso],
  )

  const loadMore = useCallback(async () => {
    if (loading || error || !hasMore || !nextPage) return

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        page: String(nextPage),
        pageSize: String(pageSize),
      })
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

      setItems((current) => [...current, ...nextItems])
      setHasMore(payload.hasMore)
      setNextPage(payload.nextPage)
    } catch {
      setError("More drops could not be loaded.")
    } finally {
      setLoading(false)
    }
  }, [error, excludedSlug, hasMore, loading, nextPage, pageSize])

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
      {sections.map((section) => (
        <section key={section.key} className="space-y-3">
          <div className="flex items-center gap-3">
            <h4 className="shrink-0 text-lg font-semibold text-black">
              {section.title}
            </h4>
            <span className="h-px flex-1 bg-[#E2E8F0]" aria-hidden />
          </div>
          <div className="space-y-3">
            {section.items.map((product) => (
              <HomepageDropRow key={dropKey(product)} product={product} />
            ))}
          </div>
        </section>
      ))}

      <div ref={sentinelRef} className="min-h-10" aria-hidden />

      <div className="pt-2 text-center text-xs font-semibold uppercase tracking-[0.12em] text-[#74777d]">
        {loading ? "Loading more drops..." : null}
        {!loading && error ? error : null}
        {!loading && !error && !hasMore && items.length > 0
          ? "You've reached the end of this week's launches."
          : null}
      </div>
    </div>
  )
}

function MetricSparkline({
  color,
  data,
  dataKey,
}: {
  color: string
  data: HomepageMetricPoint[]
  dataKey: "pageViews" | "visitors"
}) {
  return (
    <ChartContainer
      config={{
        [dataKey]: {
          label: dataKey === "pageViews" ? "Views" : "Visitors",
          color,
        },
      }}
      className="h-10 rounded-none border-0 bg-transparent p-0 shadow-none"
      aria-label={`${dataKey === "pageViews" ? "Views" : "Visitors"} trend`}
    >
      <ResponsiveContainer width="100%" height={40}>
        <LineChart
          data={data}
          margin={{ top: 3, right: 0, bottom: 3, left: 0 }}
        >
          <RechartsTooltip
            cursor={{ stroke: color, strokeOpacity: 0.18 }}
            content={
              <ChartTooltip
                labelFormatter={(label) => String(label)}
                valueFormatter={(value) => formatter.format(value)}
              />
            }
          />
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={`var(--chart-${dataKey})`}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3, strokeWidth: 0 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}

export function HomepageAnalyticsGrid({
  initialStats,
}: {
  initialStats: TrafficSidebarStatsPayload
}) {
  const [stats, setStats] = useState<TrafficSidebarStatsPayload>(initialStats)
  const [activeBuilderCount, setActiveBuilderCount] = useState(
    Math.max(1, initialStats.realtimeVisitors ?? 1),
  )

  useEffect(() => {
    let canceled = false

    fetch("/api/analytics/sidebar-stats", {
      headers: { accept: "application/json" },
    })
      .then((response) => {
        if (!response.ok) throw new Error("Failed to load stats")
        return response.json() as Promise<TrafficSidebarStatsPayload>
      })
      .then((payload) => {
        if (!canceled) {
          setStats(payload)
          setActiveBuilderCount(Math.max(1, payload.realtimeVisitors ?? 1))
        }
      })
      .catch(() => {
        if (!canceled) setStats(initialStats)
      })

    return () => {
      canceled = true
    }
  }, [initialStats])

  useEffect(() => {
    let canceled = false

    async function refreshRealtimeVisitors() {
      try {
        const response = await fetch("/api/analytics/realtime", {
          cache: "no-store",
          headers: { accept: "application/json" },
        })
        if (!response.ok) return

        const payload = (await response.json()) as { visitors?: number | null }
        if (!canceled && typeof payload.visitors === "number") {
          setActiveBuilderCount(Math.max(1, payload.visitors))
        }
      } catch {
        // Keep the last known cached value when the realtime request fails.
      }
    }

    refreshRealtimeVisitors()
    const interval = window.setInterval(refreshRealtimeVisitors, 30000)

    return () => {
      canceled = true
      window.clearInterval(interval)
    }
  }, [])

  const views = stats.pageViews30 ?? 0
  const visitors = stats.visitors30 ?? 0
  const metricSeries = normalizeMetricSeries(stats.trafficSeries)
  const fallbackSeries: HomepageMetricPoint[] = [
    {
      label: "Last 30d",
      date: "last-30d",
      pageViews: views,
      visitors,
    },
  ]
  const chartSeries = metricSeries.length > 0 ? metricSeries : fallbackSeries
  const viewsDelta = calculateSeriesDelta(chartSeries, "pageViews")
  const visitorsDelta = calculateSeriesDelta(chartSeries, "visitors")

  return (
    <div className="grid h-full grid-cols-2 gap-4">
      <Card className="col-span-1 min-h-[150px] gap-0 rounded-xl border-[#E2E8F0] bg-white py-0 shadow-sm transition-colors hover:border-[#0051d5]">
        <CardContent className="flex h-full flex-col justify-between p-4">
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#43474c]">
                Views
              </span>
              <Activity className="size-4 text-[#74777d]" aria-hidden />
            </div>
            <div className="text-2xl font-bold leading-none text-black">
              {formatter.format(views)}
            </div>
            <div
              className={cn(
                "mt-1 text-[10px] font-bold",
                viewsDelta == null || viewsDelta >= 0
                  ? "text-[#16a34a]"
                  : "text-[#ba1a1a]",
              )}
            >
              {formatDelta(viewsDelta)}
            </div>
          </div>
          <div className="mt-4">
            <MetricSparkline
              color="#0051d5"
              data={chartSeries}
              dataKey="pageViews"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="col-span-1 min-h-[150px] gap-0 rounded-xl border-[#E2E8F0] bg-white py-0 shadow-sm transition-colors hover:border-[#16a34a]">
        <CardContent className="flex h-full flex-col justify-between p-4">
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#43474c]">
                Visitors
              </span>
              <Users className="size-4 text-[#74777d]" aria-hidden />
            </div>
            <div className="text-2xl font-bold leading-none text-black">
              {formatter.format(visitors)}
            </div>
            <div
              className={cn(
                "mt-1 text-[10px] font-bold",
                visitorsDelta == null || visitorsDelta >= 0
                  ? "text-[#16a34a]"
                  : "text-[#ba1a1a]",
              )}
            >
              {formatDelta(visitorsDelta)}
            </div>
          </div>
          <div className="mt-4">
            <MetricSparkline
              color="#16a34a"
              data={chartSeries}
              dataKey="visitors"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="relative col-span-2 min-h-[88px] overflow-hidden rounded-xl border-0 bg-black py-0 text-white shadow-sm">
        <CardContent className="flex h-full items-center justify-between p-4">
          <div className="relative z-10 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-white/10">
              <span className="relative flex size-3">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#16a34a] opacity-75" />
                <span className="relative inline-flex size-3 rounded-full bg-[#16a34a]" />
              </span>
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/60">
                Live Performance
              </div>
              <div className="flex items-baseline gap-1 text-lg font-bold">
                <span>{formatter.format(activeBuilderCount)}</span>
                <span className="text-xs font-normal text-white/40">
                  Active Builders
                </span>
              </div>
            </div>
          </div>
          <div className="absolute right-0 top-0 flex h-full w-24 items-center justify-center bg-gradient-to-l from-white/10 to-transparent">
            <Zap className="size-10 rotate-12 text-white/20" aria-hidden />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function PartnerSpotlight() {
  const [visible, setVisible] = useState(true)

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 z-[60] w-full border-t border-white/10 bg-[#213145] text-white shadow-2xl">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-3 px-4 sm:gap-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-4 sm:gap-6">
          <div className="flex shrink-0 items-center gap-2 sm:border-r sm:border-white/20 sm:pr-6">
            <Handshake className="size-5 text-[#C0FF00]" aria-hidden />
            <span className="hidden text-[11px] font-bold uppercase tracking-[0.18em] sm:inline">
              Partner Spotlight
            </span>
          </div>
          <p className="hidden truncate text-sm text-white/90 lg:block">
            Scale your infrastructure with our new Enterprise Cloud integration.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <Button
            asChild
            className="h-9 rounded-full border-0 bg-[#C0FF00] px-4 text-xs font-bold uppercase tracking-[0.05em] text-black hover:bg-[#C0FF00]/90 sm:px-6"
          >
            <Link href="/pricing">Learn More</Link>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 rounded-full border-0 bg-transparent p-1 text-white/60 shadow-none hover:bg-transparent hover:text-white"
            onClick={() => setVisible(false)}
            aria-label="Dismiss partner spotlight"
          >
            <X className="size-5" aria-hidden />
          </Button>
        </div>
      </div>
    </div>
  )
}

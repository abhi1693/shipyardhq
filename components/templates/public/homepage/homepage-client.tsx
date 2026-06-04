"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useUser } from "@clerk/nextjs"
import { Activity, ChevronUp, Handshake, Users, X, Zap } from "lucide-react"
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts"

import { ChartContainer, ChartTooltip } from "@/components/atoms/chart"
import { Card, CardContent } from "@/components/atoms/card"
import { Button } from "@/components/atoms/button"
import SignInButton from "@/components/molecules/SignInButton"
import type { TrafficSidebarStatsPayload } from "@/components/templates/public/common/TrafficSidebarStatsContent"
import { cn } from "@/lib/utils"

const formatter = new Intl.NumberFormat("en-US")

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
  const [stats, setStats] =
    useState<TrafficSidebarStatsPayload>(initialStats)
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
            Scale your infrastructure with our new Enterprise Cloud
            integration.
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

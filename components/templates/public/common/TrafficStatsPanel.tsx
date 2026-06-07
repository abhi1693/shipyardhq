"use client"

import { useEffect, useState } from "react"
import { Activity, Users, Zap } from "lucide-react"
import type { TooltipContentProps } from "recharts"
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts"

import { Card, CardContent } from "@/components/atoms/card"
import { cn } from "@/lib/utils"

export interface TrafficStatsPayload {
  pageViews30?: number | null
  visitors30?: number | null
  trafficSeries?: Array<{
    date: string
    pageViews: number
    visitors: number
  }> | null
  realtimeVisitors?: number | null
}

type TrafficMetricPoint = {
  label: string
  date: string
  pageViews: number
  visitors: number
}

const formatter = new Intl.NumberFormat("en-US")

function formatMetricDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date)
}

function normalizeMetricSeries(
  series: TrafficStatsPayload["trafficSeries"],
): TrafficMetricPoint[] {
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
  points: TrafficMetricPoint[],
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

function TrafficSparklineTooltip({
  active,
  payload,
  label,
}: Partial<TooltipContentProps<number, string>>) {
  if (!active || !payload?.length) return null

  const entry = payload[0]
  const value =
    typeof entry.value === "number" ? entry.value : Number(entry.value ?? 0)
  const color = (entry.color as string | undefined) ?? "#0051d5"

  return (
    <div className="max-w-[104px] rounded-md border border-[#E2E8F0] bg-white/95 px-2 py-1 text-[10px] leading-tight shadow-lg backdrop-blur">
      <div className="truncate font-medium text-[#74777d]">{String(label)}</div>
      <div className="mt-0.5 flex items-center gap-1.5">
        <span
          className="size-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
          aria-hidden
        />
        <span className="truncate font-bold text-black">
          {formatter.format(value)}
        </span>
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
  data: TrafficMetricPoint[]
  dataKey: "pageViews" | "visitors"
}) {
  const label = dataKey === "pageViews" ? "Views" : "Visitors"

  return (
    <div
      className="h-11 w-full min-w-0 overflow-visible [&_.recharts-wrapper]:!h-full [&_.recharts-wrapper]:!w-full [&_.recharts-wrapper]:!overflow-visible [&_.recharts-tooltip-wrapper]:!z-50 [&_.recharts-tooltip-wrapper]:!outline-none [&_svg]:!h-full [&_svg]:!w-full"
      aria-label={`${label} trend`}
      role="img"
    >
      <ResponsiveContainer width="100%" height={44} minWidth={0}>
        <AreaChart
          data={data}
          margin={{ top: 5, right: 4, bottom: 5, left: 4 }}
        >
          <defs>
            <linearGradient
              id={`traffic-gradient-${dataKey}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="5%" stopColor={color} stopOpacity={0.22} />
              <stop offset="95%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <RechartsTooltip
            allowEscapeViewBox={{ x: true, y: true }}
            cursor={{ stroke: color, strokeOpacity: 0.18 }}
            offset={8}
            content={<TrafficSparklineTooltip />}
            wrapperStyle={{ pointerEvents: "none", zIndex: 50 }}
          />
          <Area
            type="monotone"
            dataKey={dataKey}
            name={label}
            stroke={color}
            strokeWidth={2}
            fill={`url(#traffic-gradient-${dataKey})`}
            fillOpacity={1}
            dot={false}
            activeDot={{ r: 3, stroke: color, strokeWidth: 0 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function TrafficMetricCard({
  label,
  value,
  delta,
  color,
  data,
  dataKey,
  Icon,
}: {
  label: string
  value: number
  delta: number | null
  color: string
  data: TrafficMetricPoint[]
  dataKey: "pageViews" | "visitors"
  Icon: typeof Activity
}) {
  return (
    <Card className="min-h-[150px] gap-0 rounded-xl border-[#E2E8F0] bg-white py-0 shadow-sm transition-colors">
      <CardContent className="flex h-full flex-col justify-between p-4">
        <div>
          <div className="mb-1 flex items-center justify-between gap-3">
            <span className="truncate text-[11px] font-bold uppercase tracking-[0.18em] text-[#43474c]">
              {label}
            </span>
            <Icon className="size-4 shrink-0 text-[#74777d]" aria-hidden />
          </div>
          <div className="text-2xl font-bold leading-none text-black">
            {formatter.format(value)}
          </div>
          <div
            className={cn(
              "mt-1 text-[10px] font-bold",
              delta == null || delta >= 0 ? "text-[#16a34a]" : "text-[#ba1a1a]",
            )}
          >
            {formatDelta(delta)}
          </div>
        </div>
        <div className="mt-4 min-w-0">
          <MetricSparkline color={color} data={data} dataKey={dataKey} />
        </div>
      </CardContent>
    </Card>
  )
}

function LivePerformanceCard({ count }: { count: number }) {
  return (
    <Card className="relative min-h-[88px] overflow-hidden rounded-xl border-0 bg-black py-0 text-white shadow-sm @[20rem]:col-span-2">
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
              <span>{formatter.format(count)}</span>
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
  )
}

export function TrafficStatsPanel({
  initialStats,
  className,
  showDashboardLink = false,
}: {
  initialStats: TrafficStatsPayload
  className?: string
  showDashboardLink?: boolean
}) {
  const [activeBuilderCount, setActiveBuilderCount] = useState(
    Math.max(1, initialStats.realtimeVisitors ?? 1),
  )

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

  const views = initialStats.pageViews30 ?? 0
  const visitors = initialStats.visitors30 ?? 0
  const metricSeries = normalizeMetricSeries(initialStats.trafficSeries)
  const fallbackSeries: TrafficMetricPoint[] = [
    {
      label: "Start",
      date: "start",
      pageViews: views,
      visitors,
    },
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
    <div className={cn("@container", className)}>
      <div className="grid grid-cols-1 gap-3 @[20rem]:grid-cols-2">
        <TrafficMetricCard
          label="Views"
          value={views}
          delta={viewsDelta}
          color="#0051d5"
          data={chartSeries}
          dataKey="pageViews"
          Icon={Activity}
        />
        <TrafficMetricCard
          label="Visitors"
          value={visitors}
          delta={visitorsDelta}
          color="#16a34a"
          data={chartSeries}
          dataKey="visitors"
          Icon={Users}
        />
        <LivePerformanceCard count={activeBuilderCount} />
      </div>
      {showDashboardLink ? (
        <p className="mt-3 text-center text-xs text-muted-foreground">
          See{" "}
          <a
            href="/analytics"
            className="font-semibold text-slate-700 underline-offset-4 hover:underline"
          >
            the analytics dashboard
          </a>
        </p>
      ) : null}
    </div>
  )
}

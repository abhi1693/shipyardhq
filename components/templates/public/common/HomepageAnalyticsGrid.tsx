"use client"

import { useEffect, useState } from "react"
import { Activity, Users, Zap } from "lucide-react"
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts"

import { Card, CardContent } from "@/components/atoms/card"
import { ChartContainer, ChartTooltip } from "@/components/atoms/chart"
import type { TrafficSidebarStatsPayload } from "@/components/templates/public/common/TrafficSidebarStatsContent"
import { cn } from "@/lib/utils"

const formatter = new Intl.NumberFormat("en-US")

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
  className,
}: {
  initialStats: TrafficSidebarStatsPayload
  className?: string
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
    <div className={cn("grid grid-cols-2 gap-4", className)}>
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

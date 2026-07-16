"use client"

import { Activity, Users } from "lucide-react"
import type { TooltipContentProps } from "recharts"
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts"

import { Card, CardContent } from "@/components/atoms/card"
import { ANALYTICS_REPORTING_WINDOW_DAYS } from "@/lib/analytics/reportingWindow"
import { cn } from "@/lib/utils"

export interface TrafficStatsPayload {
  analyticsWindowDays?: number | null
  pageViews?: number | null
  visitors?: number | null
  trafficSeries?: Array<{
    date: string
    pageViews: number
    visitors: number
  }> | null
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

function formatDelta(value: number | null, windowDays: number) {
  if (value == null) return `Last ${windowDays}d`
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
      <div className="truncate font-medium text-[#43474c]">{String(label)}</div>
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
      className="h-11 w-full min-w-0 overflow-visible [&_.recharts-tooltip-wrapper]:!z-50 [&_.recharts-tooltip-wrapper]:!outline-none"
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
          <XAxis dataKey="label" hide />
          <YAxis hide />
          <RechartsTooltip
            allowEscapeViewBox={{ x: false, y: true }}
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
  windowDays,
  color,
  data,
  dataKey,
  Icon,
}: {
  label: string
  value: number
  delta: number | null
  windowDays: number
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
            <Icon className="size-4 shrink-0 text-[#43474c]" aria-hidden />
          </div>
          <div className="text-2xl font-bold leading-none text-black">
            {formatter.format(value)}
          </div>
          <div
            className={cn(
              "mt-1 text-[10px] font-bold",
              delta == null || delta >= 0 ? "text-[#166534]" : "text-[#ba1a1a]",
            )}
          >
            {formatDelta(delta, windowDays)}
          </div>
        </div>
        <div className="mt-4 min-w-0">
          <MetricSparkline color={color} data={data} dataKey={dataKey} />
        </div>
      </CardContent>
    </Card>
  )
}

export function TrafficStatsPanel({
  initialStats,
  className,
}: {
  initialStats: TrafficStatsPayload
  className?: string
}) {
  const windowDays = Math.max(
    1,
    initialStats.analyticsWindowDays ?? ANALYTICS_REPORTING_WINDOW_DAYS,
  )
  const views = initialStats.pageViews ?? 0
  const visitors = initialStats.visitors ?? 0
  const metricSeries = normalizeMetricSeries(initialStats.trafficSeries)
  const fallbackSeries: TrafficMetricPoint[] = [
    {
      label: "Start",
      date: "start",
      pageViews: views,
      visitors,
    },
    {
      label: `Last ${windowDays}d`,
      date: `last-${windowDays}d`,
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
          windowDays={windowDays}
          color="#0051d5"
          data={chartSeries}
          dataKey="pageViews"
          Icon={Activity}
        />
        <TrafficMetricCard
          label="Visitors"
          value={visitors}
          delta={visitorsDelta}
          windowDays={windowDays}
          color="#16a34a"
          data={chartSeries}
          dataKey="visitors"
          Icon={Users}
        />
      </div>
    </div>
  )
}

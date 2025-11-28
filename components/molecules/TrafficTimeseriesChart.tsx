"use client"

import type { ChartConfig } from "@/components/atoms/chart"
import {
  AnalyticsLineChart,
  type AnalyticsLineDefinition,
} from "./AnalyticsLineChart"
import { cn } from "@/lib/utils"

type TrafficTimeseriesPoint = {
  label: string
  pageViews: number
  uniqueVisitors: number
}

const TRAFFIC_CHART_CONFIG: ChartConfig = {
  pageViews: { label: "Page views", color: "#0ea5e9" },
  uniqueVisitors: { label: "Visitors", color: "#a855f7" },
}

const TRAFFIC_LINES: AnalyticsLineDefinition<TrafficTimeseriesPoint>[] = [
  { dataKey: "pageViews", strokeWidth: 2 },
  { dataKey: "uniqueVisitors", strokeWidth: 2 },
]

export function TrafficTimeseriesChart({
  points,
  height = 280,
  showLegend = true,
  className,
  emptyLabel = "Not enough data yet.",
  emptyClassName,
}: {
  points: TrafficTimeseriesPoint[]
  height?: number
  showLegend?: boolean
  className?: string
  emptyLabel?: string
  emptyClassName?: string
}) {
  const hasTrafficData = points.some(
    (point) => point.pageViews > 0 || point.uniqueVisitors > 0,
  )

  if (!hasTrafficData) {
    return (
      <div
        className={cn(
          "flex h-64 items-center justify-center text-sm text-slate-500",
          emptyClassName,
        )}
      >
        {emptyLabel}
      </div>
    )
  }

  return (
    <AnalyticsLineChart
      data={points}
      config={TRAFFIC_CHART_CONFIG}
      lines={TRAFFIC_LINES}
      height={height}
      showLegend={showLegend}
      className={className}
      cursorStroke="hsl(220, 13%, 82%)"
    />
  )
}

"use client"

import type { ChartConfig } from "@/components/atoms/chart"
import {
  LazyAnalyticsLineChart,
  type AnalyticsLineDefinition,
} from "@/components/molecules/LazyAnalyticsCharts"
import { cn } from "@/lib/utils"

type AiCrawlerTimeseriesPoint = {
  label: string
  requests: number
}

const CHART_CONFIG: ChartConfig = {
  requests: { label: "AI crawler requests", color: "#7c3aed" },
}

const CHART_LINES: AnalyticsLineDefinition<AiCrawlerTimeseriesPoint>[] = [
  { dataKey: "requests", strokeWidth: 2 },
]

export function AiCrawlerTimeseriesChart({
  points,
  className,
}: {
  points: AiCrawlerTimeseriesPoint[]
  className?: string
}) {
  if (!points.some((point) => point.requests > 0)) {
    return (
      <div
        className={cn(
          "flex h-52 items-center justify-center text-sm text-slate-500",
          className,
        )}
      >
        No AI crawler activity in this range.
      </div>
    )
  }

  return (
    <LazyAnalyticsLineChart
      data={points}
      config={CHART_CONFIG}
      lines={CHART_LINES}
      height={220}
      showLegend={false}
      className={className}
      cursorStroke="hsl(220, 13%, 82%)"
    />
  )
}

"use client"

import { AnalyticsLineChart } from "@/components/molecules/AnalyticsLineChart"
import type { ChartConfig } from "@/components/atoms/chart"

const chartConfig: ChartConfig = {
  upvotes: { label: "Monthly upvotes", color: "#2563eb" },
  champion: { label: "Champion score", color: "#0ea5e9" },
  average: { label: "Average score", color: "#64748b" },
}

const numberFormatter = new Intl.NumberFormat("en-US")

const formatNumber = (value: number) =>
  numberFormatter.format(Math.round(value))

export type LeaderboardProgressionPoint = {
  label: string
  upvotes: number
  champion: number
  average: number
}

export function LeaderboardProgressionChart({
  data,
}: {
  data: LeaderboardProgressionPoint[]
}) {
  return (
    <AnalyticsLineChart
      className="min-h-[300px]"
      data={data}
      config={chartConfig}
      lines={[
        { dataKey: "upvotes" },
        { dataKey: "champion", strokeDasharray: "6 3" },
        { dataKey: "average", strokeDasharray: "2 2" },
      ]}
      yTickFormatter={formatNumber}
      tooltipFormatter={formatNumber}
      cursorStroke="var(--chart-upvotes)"
    />
  )
}

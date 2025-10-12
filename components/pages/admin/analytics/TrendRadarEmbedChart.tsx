"use client"

import {
  AnalyticsLineChart,
  type AnalyticsLineDefinition,
} from "@/components/molecules/AnalyticsLineChart"
import type { ChartConfig } from "@/components/atoms/chart"

export type TrendRadarChartPoint = {
  label: string
  embeds: number
}

const chartConfig: ChartConfig = {
  daily: { label: "Daily embeds", color: "#2563eb" },
  cumulative: { label: "Cumulative embeds", color: "#0ea5e9" },
}

const lineDefinitions: AnalyticsLineDefinition<
  TrendRadarChartPoint & { cumulative: number; daily: number }
>[] = [
  { dataKey: "daily", type: "monotone" },
  { dataKey: "cumulative", strokeDasharray: "6 3" },
]

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
})

export function TrendRadarEmbedChart({
  data,
}: {
  data: TrendRadarChartPoint[]
}) {
  let runningTotal = 0
  const series = data.map((point) => {
    runningTotal += point.embeds
    return {
      ...point,
      daily: point.embeds,
      cumulative: runningTotal,
    }
  })

  const formatNumber = (value: number) =>
    numberFormatter.format(Math.round(value))

  return (
    <AnalyticsLineChart
      data={series}
      config={chartConfig}
      lines={lineDefinitions}
      showLegend
      yTickFormatter={formatNumber}
      tooltipFormatter={formatNumber}
      tooltipLabelFormatter={(label) => String(label)}
      cursorStroke="var(--chart-daily)"
      className="min-h-[260px]"
    />
  )
}

"use client"

import { AnalyticsBarChart } from "@/components/molecules/AnalyticsBarChart"
import type { ChartConfig } from "@/components/atoms/chart"

export interface ReferrerAssistDatum {
  referrer: string
  assistedConversionRate: number
  clickThroughRate: number
  assistedUpvotes: number
  clicks: number
}

const chartConfig: ChartConfig = {
  assistedConversionRate: {
    label: "Upvotes per click",
    color: "#22c55e",
  },
  clickThroughRate: {
    label: "CTR",
    color: "#0ea5e9",
  },
}

export function ReferrerAssistChart({ data }: { data: ReferrerAssistDatum[] }) {
  return (
    <AnalyticsBarChart
      className="min-h-[280px]"
      data={data}
      config={chartConfig}
      bars={[
        {
          dataKey: "assistedConversionRate",
          barProps: { radius: [4, 4, 4, 4] },
        },
        {
          dataKey: "clickThroughRate",
          barProps: { radius: [4, 4, 4, 4], fillOpacity: 0.45 },
        },
      ]}
      layout="vertical"
      showLegend
      xAxis={{
        type: "number",
        tickFormatter: (value) => `${value.toFixed(0)}%`,
      }}
      yAxis={{ type: "category", dataKey: "referrer", width: 140 }}
      tooltip={{
        valueFormatter: (value) => `${value.toFixed(1)}%`,
      }}
      grid={{ strokeDasharray: "3 3" }}
    />
  )
}

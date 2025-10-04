"use client"

import { AnalyticsChartCard } from "@/components/molecules/AnalyticsChartCard"
import {
  AnalyticsLineChart,
  type AnalyticsLineDefinition,
} from "@/components/molecules/AnalyticsLineChart"
import type { ChartConfig } from "@/components/atoms/chart"
import type { RewardAnalyticsTimelinePoint } from "@/types/rewards"

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
})

const chartConfig: ChartConfig = {
  earn: { label: "Earned", color: "#0ea5e9" },
  spend: { label: "Spent", color: "#f97316" },
  adjustment: { label: "Adjustments", color: "#a855f7" },
  refund: { label: "Refunded", color: "#22c55e" },
  net: { label: "Net issuance", color: "#1f2937" },
}

const lineDefinition: AnalyticsLineDefinition<RewardAnalyticsTimelinePoint>[] =
  [
    { dataKey: "earn" },
    { dataKey: "spend" },
    { dataKey: "adjustment" },
    { dataKey: "refund" },
    { dataKey: "net", strokeWidth: 2.5 },
  ]

interface RewardsFlowChartProps {
  timeline: RewardAnalyticsTimelinePoint[]
  days: number
}

export function RewardsFlowChart({ timeline, days }: RewardsFlowChartProps) {
  return (
    <AnalyticsChartCard
      title="Reward flow"
      description={`Daily reward activity for the last ${days} days.`}
      tooltip="Track reward issuance, spending, adjustments, and refunds over time. Net issuance highlights the overall supply change."
      infoLabel="Learn more about reward flow"
      headerClassName="px-4 pb-0"
      contentClassName="px-4 pb-5 pt-4"
    >
      <AnalyticsLineChart
        className="min-h-[260px]"
        data={timeline}
        config={chartConfig}
        lines={lineDefinition}
        showLegend
        yTickFormatter={(value) => numberFormatter.format(value)}
        tooltipFormatter={(value) => numberFormatter.format(value)}
        tooltipLabelFormatter={(label) => String(label)}
        cursorStroke="var(--chart-net)"
      />
    </AnalyticsChartCard>
  )
}

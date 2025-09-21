"use client"

import { AnalyticsChartCard } from "@/components/molecules/AnalyticsChartCard"
import { AnalyticsLineChart } from "@/components/molecules/AnalyticsLineChart"
import type { ChartConfig } from "@/components/atoms/chart"

const FUNNEL_CHART_COLORS: ChartConfig = {
  views: { label: "Views", color: "#2563eb" },
  clicks: { label: "Clicks", color: "#f97316" },
  upvotes: { label: "Upvotes", color: "#22c55e" },
}

const numberFormatter = new Intl.NumberFormat("en-US")

function formatNumber(value: number) {
  return numberFormatter.format(value)
}

export type ConversionFunnelPoint = {
  date: string
  label: string
  views: number
  clicks: number
  upvotes: number
}

interface ConversionFunnelChartProps {
  data: ConversionFunnelPoint[]
  rangeDays: number
}

export function ConversionFunnelChart({
  data,
  rangeDays,
}: ConversionFunnelChartProps) {
  const hasActivity = data.some(
    (point) => point.views > 0 || point.clicks > 0 || point.upvotes > 0,
  )

  return (
    <AnalyticsChartCard
      title="Funnel throughput"
      description={`Daily views, clicks, and upvotes over the past ${rangeDays} days.`}
      tooltip="Overlay of each funnel stage to contextualize drop-off. Use the range selector to zoom into key campaigns or anomaly windows."
      infoLabel="View funnel throughput description"
      headerClassName="px-4 pb-0"
      contentClassName="px-4 pb-5 pt-4"
    >
      {hasActivity ? (
        <AnalyticsLineChart
          className="min-h-[320px]"
          data={data}
          config={FUNNEL_CHART_COLORS}
          lines={[
            { dataKey: "views" },
            { dataKey: "clicks", strokeDasharray: "6 3" },
            { dataKey: "upvotes", strokeDasharray: "2 2" },
          ]}
          yTickFormatter={formatNumber}
          tooltipFormatter={formatNumber}
          cursorStroke="var(--chart-views)"
        />
      ) : (
        <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-10 text-center text-base text-muted-foreground">
          Funnel activity will surface here once Shipyard records views, clicks,
          or upvotes for the selected range.
        </p>
      )}
    </AnalyticsChartCard>
  )
}

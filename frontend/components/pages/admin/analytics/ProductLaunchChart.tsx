"use client"

import { type ChartConfig } from "@/components/atoms/chart"
import { AnalyticsChartCard } from "@/components/molecules/AnalyticsChartCard"
import {
  AnalyticsLineChart,
  type AnalyticsLineDefinition,
} from "@/components/molecules/AnalyticsLineChart"
import { cn } from "@/lib/utils"

interface LaunchPoint {
  label: string
  products: number
}

interface ProductLaunchChartProps {
  data: LaunchPoint[]
  days: number
  currentTotal: number
  previousTotal: number
}

const chartConfig: ChartConfig = {
  products: {
    label: "Products added",
    color: "#0ea5e9",
  },
}

const lineDefinition: AnalyticsLineDefinition<LaunchPoint>[] = [
  { dataKey: "products" },
]

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
    value,
  )
}

export function ProductLaunchChart({
  data,
  days,
  currentTotal,
  previousTotal,
}: ProductLaunchChartProps) {
  const series = data.length
    ? data
    : [{ label: "No data", products: 0 } satisfies LaunchPoint]

  const delta = currentTotal - previousTotal
  const hasDelta = Number.isFinite(delta) && previousTotal >= 0
  const deltaTone = delta > 0 ? "text-emerald-600" : "text-rose-600"
  const deltaPrefix = delta > 0 ? "+" : ""
  const deltaText = `${deltaPrefix}${formatNumber(delta)} vs prior`

  return (
    <AnalyticsChartCard
      title="Launch cadence"
      description={`Daily new products in the last ${days} days.`}
      tooltip="Track how many products are launching each day. Use the range selector to widen or narrow the window and spot surges or slowdowns."
      infoLabel="Learn more about launch cadence"
      headerClassName="px-4 pb-0"
      contentClassName="px-4 pb-5 pt-4"
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-baseline gap-3">
          <p className="text-2xl font-semibold text-slate-900">
            {formatNumber(currentTotal)} new
          </p>
          <span className="text-sm text-muted-foreground">
            Last {days} days
          </span>
          {hasDelta ? (
            <span
              className={cn(
                "text-xs font-medium tabular-nums",
                delta === 0 ? "text-muted-foreground" : deltaTone,
              )}
            >
              {delta === 0 ? "No change vs prior" : deltaText}
            </span>
          ) : null}
        </div>

        <AnalyticsLineChart
          className="min-h-[260px]"
          data={series}
          config={chartConfig}
          lines={lineDefinition}
          showLegend={false}
          yTickFormatter={formatNumber}
          tooltipFormatter={formatNumber}
          tooltipLabelFormatter={(label) => String(label)}
          cursorStroke="var(--chart-products)"
        />
      </div>
    </AnalyticsChartCard>
  )
}

"use client"

import type { ProductUpdateTrendPoint } from "@/types/analytics"

import { AnalyticsChartCard } from "@/components/molecules/AnalyticsChartCard"
import {
  AnalyticsLineChart,
  type AnalyticsLineDefinition,
} from "@/components/molecules/AnalyticsLineChart"
import { type ChartConfig } from "@/components/atoms/chart"
import { cn } from "@/lib/utils"

interface ProductUpdateTrendChartProps {
  data: ProductUpdateTrendPoint[]
  rangeDays: number
  createdTotal: number
  createdPrevious: number
  publishedTotal: number
  publishedPrevious: number
}

const chartConfig: ChartConfig = {
  created: {
    label: "Created",
    color: "#2563eb",
  },
  published: {
    label: "Published",
    color: "#16a34a",
  },
}

const lines: AnalyticsLineDefinition<ProductUpdateTrendPoint>[] = [
  { dataKey: "created" },
  { dataKey: "published" },
]

const numberFormatter = new Intl.NumberFormat("en-US")

function formatNumber(value: number) {
  return numberFormatter.format(value)
}

function formatDelta(current: number, previous: number) {
  const delta = current - previous
  if (delta === 0) {
    return (
      <span className="text-xs text-muted-foreground">No change vs prior</span>
    )
  }

  if (previous === 0) {
    return (
      <span className="text-xs font-medium text-emerald-600">
        ▲ {formatNumber(current)} new vs prior
      </span>
    )
  }

  const percent = (Math.abs(delta) / previous) * 100
  const tone = delta > 0 ? "text-emerald-600" : "text-rose-600"
  const arrow = delta > 0 ? "▲" : "▼"

  return (
    <span className={cn("text-xs font-medium", tone)}>
      {arrow} {formatNumber(Math.abs(delta))} ({percent.toFixed(1)}%) vs prior
    </span>
  )
}

export function ProductUpdateTrendChart({
  data,
  rangeDays,
  createdTotal,
  createdPrevious,
  publishedTotal,
  publishedPrevious,
}: ProductUpdateTrendChartProps) {
  const series = data.length
    ? data
    : [
        {
          date: "N/A",
          label: "No data",
          created: 0,
          published: 0,
        },
      ]

  return (
    <AnalyticsChartCard
      title="Update cadence"
      description={`Created and published updates in the last ${rangeDays} days.`}
      tooltip="Track the velocity of product update creation versus publication. Use this to spot teams that ship changelog entries but hold them in draft."
      infoLabel="Learn more about update cadence"
      headerClassName="px-4 pb-0"
      contentClassName="px-4 pb-5 pt-4"
    >
      <div className="flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-muted-foreground">
              Created
            </p>
            <div className="mt-1 text-2xl font-semibold text-slate-900">
              {formatNumber(createdTotal)}
            </div>
            <div className="mt-1">{formatDelta(createdTotal, createdPrevious)}</div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-muted-foreground">
              Published
            </p>
            <div className="mt-1 text-2xl font-semibold text-slate-900">
              {formatNumber(publishedTotal)}
            </div>
            <div className="mt-1">
              {formatDelta(publishedTotal, publishedPrevious)}
            </div>
          </div>
        </div>

        <AnalyticsLineChart
          className="min-h-[260px]"
          data={series}
          config={chartConfig}
          lines={lines}
          showLegend
          xKey="label"
          tooltipLabelFormatter={(label) => String(label)}
          tooltipFormatter={(value) => formatNumber(value)}
          cursorStroke="var(--chart-created)"
        />
      </div>
    </AnalyticsChartCard>
  )
}

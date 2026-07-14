"use client"

import type { ChartConfig } from "@/components/atoms/chart"
import {
  LazyAnalyticsLineChart,
  type AnalyticsLineDefinition,
} from "@/components/molecules/LazyAnalyticsCharts"

type TrafficPoint = {
  date: string
  label: string
  views: number
  uniqueVisitors: number
  upvotes: number
}

interface MemberAnalyticsChartsProps {
  trafficData: TrafficPoint[]
  rangeDays: number
  hasTrafficActivity?: boolean
}

const trafficChartConfig: ChartConfig = {
  views: { label: "Total views", color: "#c0ff00" },
  upvotes: { label: "Upvotes", color: "#0051d5" },
}

const trafficLines: AnalyticsLineDefinition<TrafficPoint>[] = [
  { dataKey: "views", strokeWidth: 3 },
  { dataKey: "upvotes", strokeWidth: 3 },
]

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
})

export function MemberAnalyticsCharts({
  trafficData,
  rangeDays,
  hasTrafficActivity,
}: MemberAnalyticsChartsProps) {
  const hasTrafficPoints =
    typeof hasTrafficActivity === "boolean"
      ? hasTrafficActivity
      : trafficData.some((point) => point.views > 0 || point.uniqueVisitors > 0)

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">
            Traffic & Engagement
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Correlation between product page views and member upvotes.
          </p>
        </div>
        <div className="inline-flex h-8 items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-600">
          Last {rangeDays}d
        </div>
      </div>
      {hasTrafficPoints ? (
        <LazyAnalyticsLineChart
          className="min-h-[280px] border-0 bg-transparent p-0 shadow-none"
          data={trafficData}
          config={trafficChartConfig}
          lines={trafficLines}
          yTickFormatter={(value) => numberFormatter.format(value)}
          tooltipFormatter={(value) => numberFormatter.format(value)}
          cursorStroke="#0051d5"
          margin={{ left: 0, right: 8, top: 12, bottom: 0 }}
        />
      ) : (
        <ChartPlaceholder
          message={`No traffic events recorded in the past ${rangeDays} days.`}
        />
      )}
    </section>
  )
}

function ChartPlaceholder({ message }: { message: string }) {
  return (
    <div className="flex min-h-[280px] items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 px-6 text-center text-sm text-muted-foreground">
      {message}
    </div>
  )
}

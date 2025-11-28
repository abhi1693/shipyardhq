"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"
import type { ChartConfig } from "@/components/atoms/chart"
import {
  AnalyticsLineChart,
  type AnalyticsLineDefinition,
} from "@/components/molecules/AnalyticsLineChart"

type TrafficPoint = {
  date: string
  label: string
  views: number
  uniqueVisitors: number
}

interface MemberAnalyticsChartsProps {
  trafficData: TrafficPoint[]
  hasTrafficActivity?: boolean
}

const trafficChartConfig: ChartConfig = {
  views: { label: "Views", color: "#2563eb" },
  uniqueVisitors: { label: "Unique visitors", color: "#0ea5e9" },
}

const trafficLines: AnalyticsLineDefinition<TrafficPoint>[] = [
  { dataKey: "views" },
  { dataKey: "uniqueVisitors", strokeDasharray: "4 4" },
]

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
})

export function MemberAnalyticsCharts({
  trafficData,
  hasTrafficActivity,
}: MemberAnalyticsChartsProps) {
  const hasTrafficPoints =
    typeof hasTrafficActivity === "boolean"
      ? hasTrafficActivity
      : trafficData.some((point) => point.views > 0 || point.uniqueVisitors > 0)

  return (
    <section className="grid gap-4">
      <Card className="border border-slate-200 bg-white">
        <CardHeader>
          <CardTitle>Traffic</CardTitle>
          <CardDescription>Views vs. unique visitors</CardDescription>
        </CardHeader>
        <CardContent>
          {hasTrafficPoints ? (
            <AnalyticsLineChart
              className="min-h-[280px]"
              data={trafficData}
              config={trafficChartConfig}
              lines={trafficLines}
              yTickFormatter={(value) => numberFormatter.format(value)}
              tooltipFormatter={(value) => numberFormatter.format(value)}
              cursorStroke="#2563eb"
            />
          ) : (
            <ChartPlaceholder message="No traffic events recorded in the past 7 days." />
          )}
        </CardContent>
      </Card>
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

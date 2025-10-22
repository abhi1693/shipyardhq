import * as React from "react"

import { HeadingSkeleton } from "@/components/atoms/heading.skeleton"
import { Skeleton } from "@/components/atoms/skeleton"
import { CardSkeleton } from "@/components/atoms/card.skeleton"
import { ChartSkeleton } from "@/components/atoms/chart.skeleton"
import { TableSkeleton } from "@/components/atoms/table.skeleton"
import { RangeSelectorSkeleton } from "@/components/molecules/RangeSelector.skeleton"
import { cn } from "@/lib/utils"

type ChartVariant = "line" | "bar" | "pie" | "radar"

interface ChartSectionConfig {
  variant?: ChartVariant
  span?: 1 | 2 | 3
  legend?: boolean
}

interface TableSectionConfig {
  columns?: number
  rows?: number
}

interface AdminAnalyticsPageSkeletonProps extends React.ComponentProps<"div"> {
  metricCount?: number
  chartSections?: ChartSectionConfig[]
  secondaryCharts?: ChartSectionConfig[]
  tableSections?: TableSectionConfig[]
  insightCardCount?: number
  showRangeSelector?: boolean
  descriptionLines?: number
}

export function AdminAnalyticsPageSkeleton({
  className,
  metricCount = 4,
  chartSections = [{ variant: "line" }, { variant: "bar" }],
  secondaryCharts = [],
  tableSections = [],
  insightCardCount = 0,
  showRangeSelector = true,
  descriptionLines = 1,
  ...props
}: AdminAnalyticsPageSkeletonProps) {
  const metrics = Math.max(0, metricCount)
  const charts = chartSections.length ? chartSections : []
  const secondary = secondaryCharts.length ? secondaryCharts : []
  const tables = tableSections.length ? tableSections : []
  const insights = Math.max(0, insightCardCount)

  return (
    <div
      className={cn("space-y-6", className)}
      data-slot="admin-analytics-page-skeleton"
      aria-hidden="true"
      {...props}
    >
      <header className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <HeadingSkeleton lines={1 + descriptionLines} />
          </div>
          {showRangeSelector ? (
            <RangeSelectorSkeleton className="self-start" />
          ) : null}
        </div>
        <Skeleton className="h-px w-full rounded-full" tone="muted" />
      </header>

      {metrics > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: metrics }).map((_, index) => (
            <CardSkeleton
              // eslint-disable-next-line react/no-array-index-key -- decorative
              key={index}
              lines={3}
              showFooter={false}
              actionWidth="4rem"
            />
          ))}
        </div>
      ) : null}

      {charts.length > 0 ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {charts.map((section, index) => (
            <ChartSkeleton
              // eslint-disable-next-line react/no-array-index-key -- decorative
              key={index}
              variant={section.variant ?? "line"}
              showLegend={section.legend ?? false}
              className={cn(
                section.span === 2 && "lg:col-span-2",
                section.span === 3 && "lg:col-span-2 xl:col-span-3",
              )}
            />
          ))}
        </div>
      ) : null}

      {secondary.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {secondary.map((section, index) => (
            <ChartSkeleton
              // eslint-disable-next-line react/no-array-index-key -- decorative
              key={index}
              variant={section.variant ?? "bar"}
              showLegend={section.legend ?? false}
              className={cn(
                section.span === 2 && "md:col-span-2",
                section.span === 3 && "md:col-span-2 xl:col-span-3",
              )}
            />
          ))}
        </div>
      ) : null}

      {tables.length > 0 ? (
        <div className="space-y-6">
          {tables.map((section, index) => (
            <section
              // eslint-disable-next-line react/no-array-index-key -- decorative
              key={index}
              className="space-y-4 rounded-2xl border border-border/60 bg-white/90 p-5 shadow-sm"
            >
              <HeadingSkeleton lines={1} />
              <TableSkeleton
                columns={section.columns ?? 4}
                rows={section.rows ?? 6}
              />
            </section>
          ))}
        </div>
      ) : null}

      {insights > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: insights }).map((_, index) => (
            <CardSkeleton
              // eslint-disable-next-line react/no-array-index-key -- decorative
              key={index}
              lines={5}
              showHeader
              actionWidth="5rem"
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

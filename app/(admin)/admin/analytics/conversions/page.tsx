import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"
import RangeSelector from "@/components/molecules/RangeSelector"
import { getGlobalTrafficSummary } from "@/lib/server/analytics/productTrafficSummary"
import { cn } from "@/lib/utils"
import type { ProductTrafficSummary } from "@/types/analytics"
import {
  ConversionFunnelChart,
  type ConversionFunnelPoint,
} from "@/components/pages/admin/analytics/ConversionFunnelChart"

export const revalidate = 60

type SearchParams = { range?: string }

function rangeToDays(range?: string): number {
  switch (range) {
    case "14d":
      return 14
    case "30d":
      return 30
    case "90d":
      return 90
    case "7d":
    default:
      return 7
  }
}

const numberFormatter = new Intl.NumberFormat("en-US")
const percentFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
})

function formatNumber(value: number) {
  return numberFormatter.format(value)
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) {
    if (Number.isNaN(value)) {
      return "—"
    }
    return `${value > 0 ? "+" : "-"}∞%`
  }
  return `${percentFormatter.format(value)}%`
}

function calcChange(current: number, previous: number) {
  if (previous === 0) {
    return current > 0 ? Number.POSITIVE_INFINITY : 0
  }
  return ((current - previous) / previous) * 100
}

function TrendBadge({ delta }: { delta?: number }) {
  if (typeof delta !== "number" || Number.isNaN(delta)) {
    return <span className="text-xs text-muted-foreground">—</span>
  }

  if (!Number.isFinite(delta)) {
    return <span className="text-xs font-medium text-emerald-600">New</span>
  }

  if (delta === 0) {
    return <span className="text-xs text-muted-foreground">0%</span>
  }

  const tone = delta > 0 ? "text-emerald-600" : "text-rose-600"

  return (
    <span className={cn("text-xs font-medium", tone)}>
      {delta > 0 ? "+" : ""}
      {percentFormatter.format(delta)}%
    </span>
  )
}

function MetricTile({
  title,
  value,
  delta,
  helper,
}: {
  title: string
  value: string
  delta?: number
  helper?: string
}) {
  return (
    <Card className="border-slate-200/70 bg-white/90 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold uppercase tracking-[0.32em] text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-2xl font-semibold text-slate-900">{value}</div>
        <TrendBadge delta={delta} />
        {helper ? (
          <p className="text-xs text-muted-foreground">{helper}</p>
        ) : null}
      </CardContent>
    </Card>
  )
}

function ConversionRateRow({
  label,
  description,
  current,
  delta,
  helper,
  percent,
}: {
  label: string
  description: string
  current: string
  delta?: number
  helper: string
  percent: number
}) {
  const clamped = Number.isFinite(percent)
    ? Math.max(Math.min(percent, 100), 0)
    : 0

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-slate-900">{label}</div>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <div className="text-right">
          <div className="text-lg font-semibold text-slate-900">{current}</div>
          <TrendBadge delta={delta} />
        </div>
      </div>
      <div className="text-xs text-muted-foreground">{helper}</div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200/70">
        <div
          className="h-full rounded-full bg-gradient-to-r from-sky-500 via-sky-400 to-sky-600"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  )
}

function buildFunnelSeries(
  summary: ProductTrafficSummary,
): ConversionFunnelPoint[] {
  const engagementByDate = new Map(
    summary.engagementOverTime.map((point) => [point.date, point]),
  )

  return summary.viewsOverTime.map((point) => {
    const engagement = engagementByDate.get(point.date)
    return {
      date: point.date,
      label: point.label,
      views: point.views,
      clicks: engagement?.clicks ?? 0,
      upvotes: engagement?.upvotes ?? 0,
    }
  })
}

export default async function ConversionsAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams
  const days = rangeToDays(sp?.range)
  const summary = await getGlobalTrafficSummary({ rangeDays: days })

  const funnelSeries = buildFunnelSeries(summary)
  const previousClickThroughRate =
    summary.previousViews > 0
      ? (summary.previousClicks / summary.previousViews) * 100
      : 0
  const previousUpvoteConversionRate =
    summary.previousUniqueVisitors > 0
      ? (summary.previousUpvotes / summary.previousUniqueVisitors) * 100
      : 0

  const clickToUpvoteRate =
    summary.clicksInRange > 0
      ? (summary.upvotesInRange / summary.clicksInRange) * 100
      : 0
  const previousClickToUpvoteRate =
    summary.previousClicks > 0
      ? (summary.previousUpvotes / summary.previousClicks) * 100
      : 0
  const clickToUpvoteChange = calcChange(
    clickToUpvoteRate,
    previousClickToUpvoteRate,
  )

  const viewToUpvoteRate =
    summary.totalViews > 0
      ? (summary.upvotesInRange / summary.totalViews) * 100
      : 0
  const previousViewToUpvoteRate =
    summary.previousViews > 0
      ? (summary.previousUpvotes / summary.previousViews) * 100
      : 0
  const viewToUpvoteChange = calcChange(
    viewToUpvoteRate,
    previousViewToUpvoteRate,
  )

  const metrics = [
    {
      title: `Views (${summary.rangeDays}d)`,
      value: formatNumber(summary.totalViews),
      delta: summary.totalViewsChange,
      helper: `Prev ${formatNumber(summary.previousViews)} for ${summary.rangeDays}d`,
    },
    {
      title: `Clicks (${summary.rangeDays}d)`,
      value: formatNumber(summary.clicksInRange),
      delta: summary.clicksChange,
      helper: `Prev ${formatNumber(summary.previousClicks)} for ${summary.rangeDays}d`,
    },
    {
      title: `Upvotes (${summary.rangeDays}d)`,
      value: formatNumber(summary.upvotesInRange),
      delta: summary.upvotesChange,
      helper: `Prev ${formatNumber(summary.previousUpvotes)} for ${summary.rangeDays}d`,
    },
    {
      title: "Click-through rate",
      value: formatPercent(summary.clickThroughRate),
      delta: summary.clickThroughRateChange,
      helper: `Prev ${formatPercent(previousClickThroughRate)}`,
    },
    {
      title: "Upvote conversion",
      value: formatPercent(summary.upvoteConversionRate),
      delta: summary.upvoteConversionRateChange,
      helper: `Prev ${formatPercent(previousUpvoteConversionRate)}`,
    },
  ]

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            Conversion control tower
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Monitor how Shipyard traffic advances from impressions to actions.
            Use this workspace to track the views → clicks → upvotes funnel and
            spot friction fast.
          </p>
        </div>
        <RangeSelector />
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            Funnel signals
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {metrics.map((metric) => (
            <MetricTile
              key={metric.title}
              title={metric.title}
              value={metric.value}
              delta={metric.delta}
              helper={metric.helper}
            />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            Control tower
          </h2>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <ConversionFunnelChart
            data={funnelSeries}
            rangeDays={summary.rangeDays}
          />

          <Card className="border-slate-200/70 bg-white/90 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base text-slate-900">
                Conversion health
              </CardTitle>
              <CardDescription>
                Snapshot of stage efficiency across the current window.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <ConversionRateRow
                label="Views → Clicks"
                description="Share of page views that triggered a CTA click."
                current={formatPercent(summary.clickThroughRate)}
                delta={summary.clickThroughRateChange}
                helper={`${formatNumber(summary.clicksInRange)} clicks from ${formatNumber(summary.totalViews)} views.`}
                percent={summary.clickThroughRate}
              />
              <ConversionRateRow
                label="Clicks → Upvotes"
                description="Clickers who went on to endorse a product."
                current={formatPercent(clickToUpvoteRate)}
                delta={clickToUpvoteChange}
                helper={`${formatNumber(summary.upvotesInRange)} upvotes from ${formatNumber(summary.clicksInRange)} clicks.`}
                percent={clickToUpvoteRate}
              />
              <ConversionRateRow
                label="Views → Upvotes"
                description="End-to-end impact of traffic on sentiment."
                current={formatPercent(viewToUpvoteRate)}
                delta={viewToUpvoteChange}
                helper={`${formatNumber(summary.upvotesInRange)} upvotes from ${formatNumber(summary.totalViews)} views.`}
                percent={viewToUpvoteRate}
              />
              <ConversionRateRow
                label="Visitors → Upvotes"
                description="Recognised visitors who upvoted."
                current={formatPercent(summary.upvoteConversionRate)}
                delta={summary.upvoteConversionRateChange}
                helper={`${formatNumber(summary.upvotesInRange)} upvotes from ${formatNumber(summary.uniqueVisitors)} unique visitors.`}
                percent={summary.upvoteConversionRate}
              />
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}

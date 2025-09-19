import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"
import RangeSelector from "@/components/molecules/RangeSelector"
import { ProductAnalyticsCharts } from "@/components/pages/ProductAnalyticsCharts"
import { getGlobalTrafficSummary } from "@/lib/server/analytics/productTrafficSummary"
import { cn } from "@/lib/utils"

export const revalidate = 60

type SearchParams = { range?: string }

function rangeToDays(range?: string): number {
  switch (range) {
    case "30d":
      return 30
    case "90d":
      return 90
    case "7d":
    default:
      return 7
  }
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value)
}

function formatPercent(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`
}

function TrendBadge({ delta }: { delta?: number }) {
  if (typeof delta !== "number" || !Number.isFinite(delta)) {
    return <span className="text-xs text-muted-foreground">—</span>
  }

  if (delta === 0) {
    return <span className="text-xs text-muted-foreground">0%</span>
  }

  const tone = delta > 0 ? "text-emerald-600" : "text-rose-600"

  return (
    <span className={cn("text-xs font-medium", tone)}>{formatPercent(delta)}</span>
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

function BreakdownCard({
  title,
  description,
  items,
  emptyLabel,
}: {
  title: string
  description: string
  items: Array<{ key: string; label: string | null; views: number }>
  emptyLabel: string
}) {
  const total = items.reduce((sum, item) => sum + item.views, 0)

  return (
    <Card className="border-slate-200/70 bg-white/90 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base text-slate-900">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyLabel}</p>
        ) : (
          <ul className="space-y-3 text-sm">
            {items.map((item) => {
              const percent = total > 0 ? Math.round((item.views / total) * 100) : 0
              return (
                <li key={item.key} className="space-y-1">
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate font-medium text-slate-900">
                      {item.label ? (
                        item.label
                      ) : (
                        <span className="italic text-muted-foreground">Unknown</span>
                      )}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatNumber(item.views)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200/70">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-sky-500 via-sky-400 to-sky-600"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <span className="shrink-0 tabular-nums">{percent}%</span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

export default async function TrafficAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams
  const days = rangeToDays(sp?.range)
  const summary = await getGlobalTrafficSummary({ rangeDays: days })

  const metrics = [
    {
      title: `Views (${summary.rangeDays}d)`,
      value: formatNumber(summary.totalViews),
      delta: summary.totalViewsChange,
      helper: `Prev ${formatNumber(summary.previousViews)} for ${summary.rangeDays}d`,
    },
    {
      title: "Unique visitors",
      value: formatNumber(summary.uniqueVisitors),
      delta: summary.uniqueVisitorsChange,
      helper: `Prev ${formatNumber(summary.previousUniqueVisitors)} for ${summary.rangeDays}d`,
    },
    {
      title: "Views today",
      value: formatNumber(summary.viewsToday),
      helper: `${formatNumber(summary.viewsSevenDays)} in the past 7 days`,
    },
    {
      title: "Top referrer",
      value:
        summary.topReferrer?.referrer && summary.topReferrer?.referrer.length
          ? summary.topReferrer.referrer
          : "Direct / None",
      helper: `${formatNumber(summary.topReferrer?.views ?? 0)} visits from this source`,
    },
  ]

  const topCountries = summary.countryBreakdown.slice(0, 5).map((entry) => ({
    key: entry.country || "unknown",
    label: entry.country || "Unknown",
    views: entry.views,
  }))

  const topReferrers = summary.referrerBreakdown.slice(0, 5).map((entry) => ({
    key: entry.referrer || "direct",
    label: entry.referrer || "Direct / None",
    views: entry.views,
  }))

  const topBrowsers = summary.browserBreakdown.slice(0, 5).map((entry) => ({
    key: entry.browser || "unknown",
    label: entry.browser || "Unknown",
    views: entry.views,
  }))

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            Traffic analytics
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Understand how visitors discover Shipyard, what devices they use, and how
            momentum is trending.
          </p>
        </div>
        <RangeSelector />
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            Key signals
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
            Velocity & devices
          </h2>
        </div>
        <ProductAnalyticsCharts summary={summary} />
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            Audience sources
          </h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <BreakdownCard
            title="Top countries"
            description="Where recent traffic originated."
            items={topCountries}
            emptyLabel="No country data for this window."
          />
          <BreakdownCard
            title="Top referrers"
            description="External sources delivering traffic."
            items={topReferrers}
            emptyLabel="No referrer data for this window."
          />
          <BreakdownCard
            title="Top browsers"
            description="Dominant user agents observed."
            items={topBrowsers}
            emptyLabel="No browser data for this window."
          />
        </div>
      </section>
    </div>
  )
}

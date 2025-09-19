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

function renderDelta(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return <span className="text-xs text-muted-foreground">—</span>
  }
  if (value === 0) {
    return <span className="text-xs text-muted-foreground">0%</span>
  }
  const formatted = `${value > 0 ? "+" : ""}${value.toFixed(1)}%`
  return (
    <span
      className={`text-xs font-semibold ${value > 0 ? "text-green-600" : "text-red-600"}`}
    >
      {formatted}
    </span>
  )
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams
  const days = rangeToDays(sp?.range)
  const summary = await getGlobalTrafficSummary({ rangeDays: days })

  const highlightCards = [
    {
      label: `Total views (last ${summary.rangeDays}d)`,
      value: formatNumber(summary.totalViews),
      delta: summary.totalViewsChange,
      helper: `vs prior ${summary.rangeDays} days`,
    },
    {
      label: "Unique visitors",
      value: formatNumber(summary.uniqueVisitors),
      delta: summary.uniqueVisitorsChange,
      helper: `vs prior ${summary.rangeDays} days`,
    },
    {
      label: "Views today",
      value: formatNumber(summary.viewsToday),
      helper: `${formatNumber(summary.viewsSevenDays)} in past 7 days`,
    },
    {
      label: "Average per day",
      value: summary.averageViewsPerDay.toLocaleString("en-US", {
        maximumFractionDigits: 1,
      }),
      helper: `Across last ${summary.rangeDays} days`,
    },
  ]

  const topCountries = summary.countryBreakdown.slice(0, 6)
  const topReferrers = summary.referrerBreakdown.slice(0, 6)
  const deviceBreakdown = summary.deviceBreakdown

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Deep-dive into product engagement across Shipyard.
          </p>
        </div>
        <RangeSelector />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Snapshot</CardTitle>
          <CardDescription>
            High-level metrics for the last {summary.rangeDays} days with
            prior-period deltas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {highlightCards.map((item) => (
              <div key={item.label} className="space-y-1">
                <div className="text-xs text-muted-foreground">
                  {item.label}
                </div>
                <div className="flex items-baseline gap-2 text-lg font-semibold">
                  <span>{item.value}</span>
                  {item.delta !== undefined ? renderDelta(item.delta) : null}
                </div>
                {item.helper && (
                  <div className="text-xs text-muted-foreground">
                    {item.helper}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <ProductAnalyticsCharts summary={summary} />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Top Countries</CardTitle>
            <CardDescription>Leading sources by view volume.</CardDescription>
          </CardHeader>
          <CardContent>
            {topCountries.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No country data yet.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {topCountries.map((entry) => (
                  <li key={entry.country} className="flex items-center gap-2">
                    <span className="flex-1 truncate">
                      {entry.country || "Unknown"}
                    </span>
                    <span className="font-medium">
                      {formatNumber(entry.views)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Top Referrers</CardTitle>
            <CardDescription>External sources sending traffic.</CardDescription>
          </CardHeader>
          <CardContent>
            {topReferrers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No referrer data yet.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {topReferrers.map((entry) => (
                  <li key={entry.referrer} className="flex items-center gap-2">
                    <span className="flex-1 truncate">
                      {entry.referrer || "Direct / None"}
                    </span>
                    <span className="font-medium">
                      {formatNumber(entry.views)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Device Mix</CardTitle>
            <CardDescription>
              Breakdown by detected device type.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {deviceBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No device data captured yet.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {deviceBreakdown.map((entry) => (
                  <li key={entry.device} className="flex items-center gap-2">
                    <span className="flex-1 truncate">{entry.label}</span>
                    <span className="font-medium">
                      {formatNumber(entry.views)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

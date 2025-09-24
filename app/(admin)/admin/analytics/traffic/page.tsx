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
import type {
  ProductTrafficAnomaly,
  ProductTrafficSummary,
} from "@/types/analytics"

export const revalidate = 3600

type SearchParams = { range?: string }

function rangeToDays(range?: string): number {
  switch (range) {
    case "7d":
      return 7
    case "14d":
      return 14
    case "30d":
      return 30
    case "90d":
      return 90
    default:
      return 7
  }
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value)
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) {
    if (Number.isNaN(value)) {
      return "—"
    }
    return `${value > 0 ? "+" : "-"}∞%`
  }
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`
}

function labelForDevice(device?: string | null) {
  switch (device) {
    case "desktop":
      return "Desktop"
    case "mobile":
      return "Mobile"
    case "tablet":
      return "Tablet"
    default:
      return "Unknown device"
  }
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
      {formatPercent(delta)}
    </span>
  )
}

function TrendingPathsCard({
  paths,
}: {
  paths: ProductTrafficSummary["advanced"]["pathBreakdown"]
}) {
  const rows = paths.slice(0, 10)

  return (
    <Card className="border-slate-200/70 bg-white/90 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base text-slate-900">
          Trending paths
        </CardTitle>
        <CardDescription>
          Paths gaining traction versus the previous window.
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No path activity recorded for this window.
          </p>
        ) : (
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground">
                <th className="py-2 pr-4 text-left font-medium">Path</th>
                <th className="py-2 pr-4 text-right font-medium">Views</th>
                <th className="py-2 pr-4 text-right font-medium">
                  Prev window
                </th>
                <th className="py-2 text-right font-medium">Change</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70">
              {rows.map((row, index) => (
                <tr key={`${row.path}-${index}`}>
                  <td className="py-3 pr-4 align-top">
                    <span className="block max-w-[260px] break-words font-medium text-slate-900">
                      {row.path || "/"}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-right font-medium text-slate-900 tabular-nums">
                    {formatNumber(row.views)}
                  </td>
                  <td className="py-3 pr-4 text-right tabular-nums text-muted-foreground">
                    {formatNumber(row.previousViews)}
                  </td>
                  <td className="py-3 text-right">
                    <TrendBadge delta={row.viewsChange} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
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
              const percent =
                total > 0 ? Math.round((item.views / total) * 100) : 0
              return (
                <li key={item.key} className="space-y-1">
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate font-medium text-slate-900">
                      {item.label ? (
                        item.label
                      ) : (
                        <span className="italic text-muted-foreground">
                          Unknown
                        </span>
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

function VisitorLoyaltyCard({
  data,
}: {
  data: ProductTrafficSummary["advanced"]["newVsReturning"]
}) {
  const totalKnown = data.newVisitors + data.returningVisitors
  const totalAll = totalKnown + data.unknownVisitors
  const returningRate = Number.isFinite(data.returningRate)
    ? (data.returningRate * 100).toFixed(1)
    : null

  return (
    <Card className="border-slate-200/70 bg-white/90 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base text-slate-900">
          Visitor loyalty
        </CardTitle>
        <CardDescription>
          Returning share calculated from recognised visitors.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-baseline justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
              Returning rate
            </span>
            <div className="text-3xl font-semibold text-slate-900">
              {returningRate ? `${returningRate}%` : "—"}
            </div>
          </div>
          <div className="text-xs text-muted-foreground text-right space-y-1">
            <div>{formatNumber(data.returningVisitors)} returning</div>
            <div>{formatNumber(data.newVisitors)} new</div>
            <div>{formatNumber(data.unknownVisitors)} unknown</div>
          </div>
        </div>
        <div className="grid gap-2 text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>Known visitors</span>
            <span>{formatNumber(totalKnown)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Total sessions</span>
            <span>{formatNumber(totalAll)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ProductLeaderboardCard({
  products,
}: {
  products: NonNullable<ProductTrafficSummary["advanced"]["topProducts"]>
}) {
  if (!products.length) {
    return (
      <Card className="border-slate-200/70 bg-white/90 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base text-slate-900">
            Product leaderboard
          </CardTitle>
          <CardDescription>
            Top products by page views for this window.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No product traffic recorded in this period.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-slate-200/70 bg-white/90 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base text-slate-900">
          Product leaderboard
        </CardTitle>
        <CardDescription>Share of visits by top destinations.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3 text-sm">
          {products.slice(0, 8).map((product) => (
            <li key={product.productId} className="space-y-1">
              <div className="flex items-center justify-between gap-3">
                <span className="truncate font-medium text-slate-900">
                  {product.productName ?? product.productId}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatNumber(product.views)} ·{" "}
                  {(product.share * 100).toFixed(1)}%
                </span>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

function ReferrerMatrixCard({
  rows,
}: {
  rows: NonNullable<ProductTrafficSummary["advanced"]["referrerProductMatrix"]>
}) {
  if (!rows.length) {
    return (
      <Card className="border-slate-200/70 bg-white/90 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base text-slate-900">
            Referrer matrix
          </CardTitle>
          <CardDescription>
            Cross-product contributions from key referrers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Referral traffic has not surfaced yet for this window.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-slate-200/70 bg-white/90 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base text-slate-900">
          Referrer matrix
        </CardTitle>
        <CardDescription>
          Top referrers paired with the products they drive.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.slice(0, 5).map((row) => (
          <div key={row.referrer} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-slate-900">{row.referrer}</span>
              <span className="text-xs text-muted-foreground">
                {formatNumber(row.views)} visits
              </span>
            </div>
            <ul className="space-y-1 text-xs text-muted-foreground">
              {row.topProducts.slice(0, 5).map((product) => (
                <li key={`${row.referrer}-${product.productId}`}>
                  <span className="text-slate-700">
                    {product.productName ?? product.productId}
                  </span>{" "}
                  · {formatNumber(product.views)}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function AnomalyCard({ anomalies }: { anomalies: ProductTrafficAnomaly[] }) {
  if (!anomalies.length) {
    return (
      <Card className="border-slate-200/70 bg-white/90 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base text-slate-900">
            Anomaly watch
          </CardTitle>
          <CardDescription>
            Network-wide spikes and outliers surface here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No anomalies detected for the selected window.
          </p>
        </CardContent>
      </Card>
    )
  }

  const labels: Record<ProductTrafficAnomaly["type"], string> = {
    "ip-spike": "IP spike",
    "path-surge": "Path surge",
    "geo-surge": "Geo surge",
  }

  return (
    <Card className="border-slate-200/70 bg-white/90 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base text-slate-900">
          Anomaly watch
        </CardTitle>
        <CardDescription>
          Focus your reviews on unusual traffic bursts.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {anomalies.map((anomaly) => (
          <div
            key={`${anomaly.type}-${anomaly.key}`}
            className="space-y-1 rounded-lg border border-slate-200/70 bg-white/80 px-3 py-3"
          >
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="uppercase tracking-[0.24em] text-slate-500">
                {labels[anomaly.type]}
              </span>
              {typeof anomaly.share === "number" ? (
                <span>{Math.round(anomaly.share * 100)}% share</span>
              ) : null}
            </div>
            <div className="text-sm font-medium text-slate-900">
              {anomaly.key}
            </div>
            <p className="text-sm text-slate-700">{anomaly.description}</p>
          </div>
        ))}
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
  const summary = await getGlobalTrafficSummary({
    rangeDays: days,
    cacheTier: "slowest",
  })
  const advanced = summary.advanced
  const loyalty = advanced.newVsReturning

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
      title: "Returning rate",
      value: Number.isFinite(loyalty.returningRate)
        ? `${(loyalty.returningRate * 100).toFixed(1)}%`
        : "—",
      helper: `${formatNumber(loyalty.returningVisitors)} returning · ${formatNumber(loyalty.newVisitors)} new · ${formatNumber(loyalty.unknownVisitors)} unknown`,
    },
  ]

  const topCountries = summary.countryBreakdown.slice(0, 5).map((entry) => ({
    key: entry.country || "unknown",
    label: entry.country || "Unknown",
    views: entry.views,
  }))

  const topRegions = advanced.regionBreakdown
    .slice(0, 5)
    .map((entry, index) => ({
      key: `${entry.region}-${index}`,
      label: entry.country
        ? `${entry.region} · ${entry.country}`
        : entry.region,
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

  const topUserAgents = summary.userAgentBreakdown
    .slice(0, 5)
    .map((entry, index) => {
      const browser = entry.browser ?? "Unknown browser"
      const os = entry.os ?? "Unknown OS"
      const deviceLabel = labelForDevice(entry.device)
      return {
        key: `${browser}-${os}-${entry.device ?? "unknown"}-${index}`,
        label: `${browser} · ${os} (${deviceLabel})`,
        views: entry.views,
      }
    })

  const trafficChannels = advanced.referrerCategoryBreakdown
    .slice(0, 5)
    .map((entry) => ({
      key: entry.category,
      label: entry.label,
      views: entry.views,
    }))

  const topOperatingSystems = advanced.osBreakdown
    .slice(0, 5)
    .map((entry, index) => ({
      key: entry.os || `unknown-${index}`,
      label: entry.os || "Unknown",
      views: entry.views,
    }))

  const anomalies = advanced.anomalies
  const topProducts = advanced.topProducts ?? []
  const referrerMatrix = advanced.referrerProductMatrix ?? []
  const trendingPaths = advanced.pathBreakdown

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            Traffic analytics
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Understand how visitors discover Shipyard, what devices they use,
            and how momentum is trending.
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
            Engagement insights
          </h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <VisitorLoyaltyCard data={loyalty} />
          <AnomalyCard anomalies={anomalies} />
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            Velocity & devices
          </h2>
        </div>
        <ProductAnalyticsCharts summary={summary} showUserAgents={false} />
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            Network hotspots
          </h2>
        </div>
        <div className="space-y-4">
          <TrendingPathsCard paths={trendingPaths} />
          <div className="grid gap-4 lg:grid-cols-2">
            <ProductLeaderboardCard products={topProducts} />
            <ReferrerMatrixCard rows={referrerMatrix} />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            Audience sources
          </h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          <BreakdownCard
            title="Top countries"
            description="Where recent traffic originated."
            items={topCountries}
            emptyLabel="No country data for this window."
          />
          <BreakdownCard
            title="Top regions"
            description="Regional clusters gaining traction."
            items={topRegions}
            emptyLabel="No region-level data for this window."
          />
          <BreakdownCard
            title="Traffic channel mix"
            description="Share of sessions by referrer category."
            items={trafficChannels}
            emptyLabel="Referrer categories will appear once data arrives."
          />
          <BreakdownCard
            title="Top referrers"
            description="External sources delivering traffic."
            items={topReferrers}
            emptyLabel="No referrer data for this window."
          />
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <BreakdownCard
            title="Top browsers"
            description="Dominant user agents observed."
            items={topBrowsers}
            emptyLabel="No browser data for this window."
          />
          <BreakdownCard
            title="Top user agents"
            description="Most common browser, OS, and device combinations."
            items={topUserAgents}
            emptyLabel="No user agent signatures recorded yet."
          />
          <BreakdownCard
            title="Top operating systems"
            description="Device environments seen across the network."
            items={topOperatingSystems}
            emptyLabel="No OS data for this window."
          />
        </div>
      </section>
    </div>
  )
}

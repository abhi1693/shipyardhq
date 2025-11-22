import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"
import RangeSelector from "@/components/molecules/RangeSelector"
import { AdminRevenueChart } from "@/components/pages/admin/analytics/AdminRevenueChart"
import { getAdminRevenueAnalytics } from "@/lib/server/analytics/adminRevenue"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

type SearchParams = { range?: string }

const providerLabels = {
  stripe: "Stripe",
  paddle: "Paddle",
  lemonsqueezy: "Lemon Squeezy",
  polar: "Polar",
  dodo: "DoDo",
  revenuecat: "RevenueCat",
} as const

function rangeToKey(range?: string): number | "all" {
  switch (range) {
    case "14d":
      return 14
    case "30d":
      return 30
    case "90d":
      return 90
    case "all":
      return "all"
    case "7d":
    default:
      return 7
  }
}

function formatCurrency(amountCents: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format((amountCents || 0) / 100)
  } catch {
    return `$${((amountCents || 0) / 100).toFixed(0)}`
  }
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) {
    if (Number.isNaN(value)) return "—"
    return value > 0 ? "+∞%" : "-∞%"
  }
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`
}

function formatDays(value: number | null) {
  if (value === null || Number.isNaN(value)) return "—"
  if (!Number.isFinite(value)) return "inf"
  return `${value.toFixed(1)}d`
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

export default async function RevenueAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams
  const rangeKey = rangeToKey(sp?.range)
  const analytics = await getAdminRevenueAnalytics({ range: rangeKey })

  const rangeChange = calcChange(
    analytics.totals.rangeCents,
    analytics.totals.previousRangeCents,
  )

  const rangeLabel = rangeKey === "all" ? "All time" : `${rangeKey}d`

  const providerRows = analytics.providerShare.slice(0, 6)
  const productRows = analytics.topProducts.slice(0, 6)
  const avgDailyCents = analytics.trend.length
    ? analytics.trend.reduce((sum, p) => sum + p.valueCents, 0) /
      analytics.trend.length
    : 0
  const bestDay = analytics.trend.reduce<
    { label: string; valueCents: number } | null
  >((best, point) => {
    if (!best || point.valueCents > best.valueCents) return point
    return best
  }, null)
  const topProvider = providerRows[0]
  const topProduct = productRows[0]

  const lastSynced = analytics.coverage.lastSyncedAt
    ? new Date(analytics.coverage.lastSyncedAt).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Not synced yet"

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-slate-900">Revenue</h1>
          <p className="text-sm text-muted-foreground">
            Verified revenue across all connected providers. Aggregated and safe to share.
          </p>
        </div>
        <RangeSelector
          ranges={[
            { label: "7d", value: "7d" },
            { label: "30d", value: "30d" },
            { label: "90d", value: "90d" },
            { label: "All", value: "all" },
          ]}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricTile
          title="Verified revenue"
          value={formatCurrency(analytics.totals.allTimeCents, analytics.currency)}
          helper="All-time, converted to USD when rates are available"
        />
        <MetricTile
          title={`Revenue (${rangeLabel})`}
          value={formatCurrency(analytics.totals.rangeCents, analytics.currency)}
          delta={rangeKey === "all" ? undefined : rangeChange}
          helper={
            rangeKey === "all"
              ? "Full history"
              : `Prev ${formatCurrency(analytics.totals.previousRangeCents, analytics.currency)} for ${rangeLabel}`
          }
        />
        <MetricTile
          title="Latest day"
          value={formatCurrency(analytics.totals.latestDayCents, analytics.currency)}
          helper="Most recent complete day"
        />
        <MetricTile
          title="Coverage"
          value={`${analytics.coverage.convertibleConnectors}/${analytics.coverage.totalConnectors} connectors`}
          helper={`Last sync: ${lastSynced}`}
        />
      </div>

      <Card className="border-slate-200/70 bg-white/90 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-base text-slate-900">
                Revenue trend
              </CardTitle>
              <CardDescription>
                Daily revenue totals in {analytics.currency} for the selected window.
              </CardDescription>
            </div>
            {analytics.unconvertedConnectorIds.length > 0 ? (
              <span className="text-xs font-medium text-amber-700">
                {analytics.unconvertedConnectorIds.length} connector(s) missing FX rates
              </span>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          <AdminRevenueChart points={analytics.trend} currency={analytics.currency} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-4">
        <Card className="border-slate-200/70 bg-white/90 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base text-slate-900">Provider share</CardTitle>
            <CardDescription>Share of verified revenue by provider.</CardDescription>
          </CardHeader>
          <CardContent>
            {providerRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No connected providers with revenue yet.
              </p>
            ) : (
              <ul className="space-y-3 text-sm">
                {providerRows.map((row) => (
                  <li key={row.provider} className="flex items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="font-medium text-slate-900">
                        {providerLabels[row.provider] ?? row.provider}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatCurrency(row.revenueCents, analytics.currency)}
                      </div>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatPercent(row.share * 100)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200/70 bg-white/90 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base text-slate-900">Top products</CardTitle>
            <CardDescription>Highest verified revenue (range when available).</CardDescription>
          </CardHeader>
          <CardContent>
            {productRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No product revenue recorded in this window.
              </p>
            ) : (
              <ol className="space-y-3 text-sm">
                {productRows.map((product, index) => (
                  <li
                    key={product.productId}
                    className="flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-muted-foreground">
                        #{index + 1}
                      </span>
                      <span className="font-medium text-slate-900">
                        {product.name ?? product.productId}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatCurrency(product.revenueCents, analytics.currency)}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200/70 bg-white/90 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base text-slate-900">Range insights</CardTitle>
            <CardDescription>Quick highlights tied to this revenue window.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-center justify-between text-slate-900">
              <span className="font-medium">Avg per day</span>
              <span>{formatCurrency(avgDailyCents, analytics.currency)}</span>
            </div>
            <div className="flex items-center justify-between text-slate-900">
              <span className="font-medium">Best day</span>
              <span>
                {bestDay
                  ? `${formatCurrency(bestDay.valueCents, analytics.currency)} · ${bestDay.label}`
                  : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-900">
              <span className="font-medium">Top provider</span>
              <span>
                {topProvider
                  ? `${providerLabels[topProvider.provider] ?? topProvider.provider} · ${formatPercent(topProvider.share * 100)}`
                  : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-900">
              <span className="font-medium">Top product</span>
              <span>
                {topProduct
                  ? `${topProduct.name ?? topProduct.productId} · ${formatCurrency(topProduct.revenueCents, analytics.currency)}`
                  : "—"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/70 bg-white/90 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base text-slate-900">Time to milestones</CardTitle>
            <CardDescription>Average days across connectors (USD-convertible).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            {analytics.pace.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pacing data yet.</p>
            ) : (
              <ul className="space-y-2">
                {analytics.pace.map((row) => (
                  <li
                    key={row.toCents}
                    className="flex items-center justify-between text-slate-900"
                  >
                    <span className="font-medium">{row.label}</span>
                    <span className="text-right text-xs text-muted-foreground">
                      {formatDays(row.avgDays)} {row.samples > 0 ? `· ${row.samples} samples` : ""}
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

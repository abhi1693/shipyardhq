import Link from "next/link"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"
import { Badge } from "@/components/atoms/badge"
import RangeSelector from "@/components/molecules/RangeSelector"
import { AnalyticsChartCard } from "@/components/molecules/AnalyticsChartCard"
import { LeaderboardProgressionChart } from "@/components/pages/admin/analytics/LeaderboardProgressionChart"
import { getLeaderboardRangeAnalytics } from "@/lib/server/analytics/leaderboardRange"
import {
  TrendRadarEmbedChart,
  type TrendRadarChartPoint,
} from "@/components/pages/admin/analytics/TrendRadarEmbedChart"
import { productPath } from "@/lib/routes"
import { cn } from "@/lib/utils"
import { getTrendRadarEmbedStats } from "@/lib/server/trendRadar/telemetry"

export const revalidate = 3600

type SearchParams = { range?: string }
type TrendRadarTelemetry = Awaited<ReturnType<typeof getTrendRadarEmbedStats>>

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
const dayFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
})

function formatNumber(value: number) {
  return numberFormatter.format(Math.round(value))
}

function formatPercent(value: number) {
  if (Number.isNaN(value)) return "—"
  if (!Number.isFinite(value)) {
    return value > 0 ? "+∞%" : "-∞%"
  }
  const prefix = value > 0 ? "+" : ""
  return `${prefix}${percentFormatter.format(value)}%`
}

function formatDayLabel(date: string) {
  const [year, month, day] = date.split("-").map((segment) => Number(segment))
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day)
  ) {
    return date
  }
  const parsed = new Date(year, month - 1, day)
  if (Number.isNaN(parsed.getTime())) {
    return date
  }
  return dayFormatter.format(parsed)
}

function ChangeBadge({
  value,
  positiveIsGood = true,
  newLabel = "New",
}: {
  value?: number | null
  positiveIsGood?: boolean
  newLabel?: string
}) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return <span className="text-xs text-muted-foreground">—</span>
  }

  if (!Number.isFinite(value)) {
    return (
      <span className="text-xs font-medium text-emerald-600">{newLabel}</span>
    )
  }

  if (value === 0) {
    return <span className="text-xs text-muted-foreground">0</span>
  }

  const good = value > 0 === positiveIsGood
  const tone = good ? "text-emerald-600" : "text-rose-600"
  const prefix = value > 0 ? "+" : "-"
  const magnitude = formatNumber(Math.abs(value))

  return (
    <span className={cn("text-xs font-medium", tone)}>
      {prefix}
      {magnitude}
    </span>
  )
}

function RankDeltaBadge({
  currentRank,
  previousRank,
}: {
  currentRank: number
  previousRank: number | null
}) {
  if (previousRank === null) {
    return <span className="text-xs text-muted-foreground">—</span>
  }

  const value = previousRank - currentRank
  if (value === 0) {
    return <span className="text-xs text-muted-foreground">0</span>
  }

  const magnitude = Math.abs(value)
  const tone = value > 0 ? "text-emerald-600" : "text-rose-600"
  const arrow = value > 0 ? "▲" : "▼"
  const prefix = value > 0 ? "+" : "-"

  return (
    <span className={cn("text-xs font-medium", tone)}>
      {arrow} {prefix}
      {magnitude}
    </span>
  )
}

function ProductListCard({
  title,
  description,
  products,
  emptyLabel,
}: {
  title: string
  description: string
  products: Awaited<
    ReturnType<typeof getLeaderboardRangeAnalytics>
  >["products"]["top"]
  emptyLabel: string
}) {
  return (
    <Card className="border-slate-200/70 bg-white/90 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-slate-900">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {products.length ? (
          products.map((product) => (
            <div
              key={product.id}
              className="flex items-start justify-between gap-3"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">
                    #{product.rank}
                  </span>
                  <Link
                    href={productPath(product.slug)}
                    className="truncate font-medium text-slate-900 hover:underline"
                  >
                    {product.name}
                  </Link>
                  {product.isNew ? (
                    <Badge
                      variant="outline"
                      className="border-emerald-200 bg-emerald-50 text-emerald-700"
                    >
                      New
                    </Badge>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  {product.makerName}
                  {product.categoryName ? ` • ${product.categoryName}` : ""}
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-slate-900">
                  {formatNumber(product.rangeUpvotes)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatPercent(product.upvoteDelta)} vs prior
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">{emptyLabel}</p>
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
  positiveIsGood = true,
}: {
  title: string
  value: string
  delta?: number | null
  helper?: string
  positiveIsGood?: boolean
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
        {typeof delta === "number" ? (
          <ChangeBadge value={delta} positiveIsGood={positiveIsGood} />
        ) : null}
        {helper ? (
          <p className="text-xs text-muted-foreground">{helper}</p>
        ) : null}
      </CardContent>
    </Card>
  )
}

function TrendRadarTelemetryCard({ stats }: { stats: TrendRadarTelemetry }) {
  if (!stats.available) {
    return (
      <AnalyticsChartCard
        title="Trend Radar reach"
        description="Embed impressions captured from the public radar widget."
        headerClassName="px-4 pb-0"
        contentClassName="px-4 pb-5 pt-4"
      >
        <p className="text-sm text-muted-foreground">
          Redis telemetry is unavailable. Set `REDIS_URL` to start tracking
          radar impressions.
        </p>
      </AnalyticsChartCard>
    )
  }

  const chartData: TrendRadarChartPoint[] = stats.daily.length
    ? stats.daily.map((entry) => ({
        label: formatDayLabel(entry.date),
        embeds: entry.count,
      }))
    : [{ label: "No data", embeds: 0 }]

  return (
    <AnalyticsChartCard
      title="Trend Radar reach"
      description="Embed impressions captured from the public radar widget."
      headerClassName="px-4 pb-0"
      contentClassName="px-4 pb-5 pt-4"
    >
      <div className="space-y-5">
        <div className="grid gap-3 rounded-2xl border border-slate-200/70 bg-slate-50 px-4 py-3 sm:grid-cols-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
              All-time embeds
            </p>
            <p className="text-xl font-semibold text-slate-900">
              {formatNumber(stats.totalEmbeds)}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
              Last {stats.windowDays} days
            </p>
            <p className="text-xl font-semibold text-slate-900">
              {formatNumber(stats.windowTotal)}
            </p>
          </div>
        </div>

        <TrendRadarEmbedChart data={chartData} />
      </div>
    </AnalyticsChartCard>
  )
}

export default async function LeaderboardAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams
  const days = rangeToDays(sp?.range)
  const [analytics, trendTelemetry] = await Promise.all([
    getLeaderboardRangeAnalytics(days, 25),
    getTrendRadarEmbedStats(7),
  ])
  const { summary } = analytics
  const rangeLabel = `${analytics.rangeDays}d`

  const metrics = [
    {
      title: `Upvotes (${rangeLabel})`,
      value: formatNumber(summary.totalUpvotes),
      delta: summary.upvoteChange,
      helper: `Prev ${formatNumber(summary.previousUpvotes)} for ${rangeLabel} (${formatPercent(summary.upvoteDelta)})`,
    },
    {
      title: "Unique products",
      value: formatNumber(summary.uniqueProducts),
      delta: summary.uniqueProducts - summary.previousUniqueProducts,
      helper: `Prev ${formatNumber(summary.previousUniqueProducts)} ranked`,
    },
    {
      title: "Average daily upvotes",
      value: formatNumber(summary.averageDailyUpvotes),
      helper: `${formatNumber(summary.returningProducts)} returning · ${formatNumber(summary.newProducts)} new`,
    },
    {
      title: "Champion upvotes",
      value:
        summary.championUpvotes !== null
          ? formatNumber(summary.championUpvotes)
          : "—",
      delta: summary.championDelta ?? undefined,
      helper:
        summary.championPreviousUpvotes !== null
          ? `Prev champion ${formatNumber(summary.championPreviousUpvotes)}`
          : undefined,
    },
  ]

  const historyData = analytics.history

  const summaryInsights = [
    `${formatPercent(summary.returningRate)} returning rate with ${formatNumber(summary.returningProducts)} returning and ${formatNumber(summary.newProducts)} new entrants.`,
    `${formatNumber(summary.improvingProducts)} products gained momentum, ${formatNumber(summary.decliningProducts)} dipped, and ${formatNumber(summary.stableProducts)} held steady.`,
  ]

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            Leaderboard momentum
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Track which products are earning upvotes in the selected window,
            spot surging makers, and compare momentum against the prior period.
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
        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <AnalyticsChartCard
            title="Range progression"
            description="Daily upvotes, champion strength, and average traction across the selected window."
            tooltip="Use this view to validate campaign timing, see when energy spikes, and catch slowdowns early."
            infoLabel="View upvote trend description"
            headerClassName="px-4 pb-0"
            contentClassName="px-4 pb-5 pt-4"
          >
            {historyData.length ? (
              <LeaderboardProgressionChart data={historyData} />
            ) : (
              <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-10 text-center text-base text-muted-foreground">
                We need more activity in this range to render a progression
                chart.
              </p>
            )}
          </AnalyticsChartCard>

          <Card className="border-slate-200/70 bg-white/90 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base text-slate-900">
                Range insights
              </CardTitle>
              <CardDescription>
                Headlines for the past {rangeLabel} compared with the previous
                window.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-700">
              {summaryInsights.map((insight, index) => (
                <p key={index}>{insight}</p>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            Trend Radar
          </h2>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Monitor how often the public radar embed is loading across external
            properties to gauge off-platform reach.
          </p>
        </div>
        <TrendRadarTelemetryCard stats={trendTelemetry} />
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            Top products
          </h2>
          <p className="text-sm text-muted-foreground max-w-3xl">
            Ordered by upvotes during this window with context from the prior
            period and lifetime totals.
          </p>
        </div>
        <Card className="border-slate-200/70 bg-white/95 shadow-sm">
          <CardContent className="overflow-x-auto">
            {analytics.products.top.length ? (
              <table className="w-full min-w-[880px] text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    <th className="py-2 pr-4 text-left font-semibold">Rank</th>
                    <th className="py-2 pr-4 text-left font-semibold">
                      Product
                    </th>
                    <th className="py-2 pr-4 text-right font-semibold">
                      Upvotes
                    </th>
                    <th className="py-2 pr-4 text-right font-semibold">
                      Change
                    </th>
                    <th className="py-2 pr-4 text-right font-semibold">
                      Previous
                    </th>
                    <th className="py-2 pr-4 text-right font-semibold">
                      Total
                    </th>
                    <th className="py-2 text-right font-semibold">Rank Δ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70">
                  {analytics.products.top.map((product) => (
                    <tr key={product.id}>
                      <td className="py-3 pr-4 align-top text-sm font-semibold text-slate-900">
                        #{product.rank}
                      </td>
                      <td className="py-3 pr-4 align-top">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              href={productPath(product.slug)}
                              className="text-sm font-semibold text-slate-900 hover:underline"
                            >
                              {product.name}
                            </Link>
                            {product.isNew ? (
                              <Badge
                                variant="outline"
                                className="border-emerald-200 bg-emerald-50 text-emerald-700"
                              >
                                New
                              </Badge>
                            ) : null}
                          </div>
                          {product.tagline ? (
                            <p className="text-xs text-muted-foreground">
                              {product.tagline}
                            </p>
                          ) : null}
                          <p className="text-xs text-muted-foreground">
                            {product.makerName}
                            {product.categoryName
                              ? ` • ${product.categoryName}`
                              : ""}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-right font-semibold text-slate-900 tabular-nums">
                        {formatNumber(product.rangeUpvotes)}
                      </td>
                      <td className="py-3 pr-4 text-right tabular-nums">
                        <div className="flex flex-col items-end gap-1">
                          <ChangeBadge value={product.upvoteChange} />
                          <span className="text-xs text-muted-foreground">
                            {formatPercent(product.upvoteDelta)}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-right tabular-nums text-muted-foreground">
                        {formatNumber(product.previousUpvotes)}
                      </td>
                      <td className="py-3 pr-4 text-right tabular-nums text-muted-foreground">
                        {formatNumber(product.totalUpvotes)}
                      </td>
                      <td className="py-3 text-right">
                        <RankDeltaBadge
                          currentRank={product.rank}
                          previousRank={product.previousRank}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No upvotes recorded for this range yet. Once products earn
                engagement, rankings will populate here.
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            Momentum signals
          </h2>
          <p className="text-sm text-muted-foreground max-w-3xl">
            Snapshot lists to celebrate surging products and welcome newcomers
            entering the leaderboard.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <ProductListCard
            title="Surging products"
            description="Largest percentage gains versus the previous window."
            products={analytics.products.surging}
            emptyLabel="Need returning products with upvotes to highlight momentum swings."
          />
          <ProductListCard
            title="New entrants"
            description="Fresh products collecting upvotes for the first time this window."
            products={analytics.products.new}
            emptyLabel="No new products have earned upvotes yet in this range."
          />
        </div>
      </section>
    </div>
  )
}

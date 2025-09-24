import Link from "next/link"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"
import { Badge } from "@/components/atoms/badge"
import { AnalyticsChartCard } from "@/components/molecules/AnalyticsChartCard"
import { LeaderboardMonthSelect } from "@/components/pages/admin/analytics/LeaderboardMonthSelect"
import { LeaderboardProgressionChart } from "@/components/pages/admin/analytics/LeaderboardProgressionChart"
import { getLeaderboardScoringAnalytics } from "@/lib/server/analytics/leaderboardScoring"
import { productPath } from "@/lib/routes"
import { cn } from "@/lib/utils"

export const revalidate = 3600

type SearchParams = { month?: string }

const numberFormatter = new Intl.NumberFormat("en-US")
const percentFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
})

function formatNumber(value: number) {
  return numberFormatter.format(Math.round(value))
}

function formatPercent(value: number) {
  return `${percentFormatter.format(value)}%`
}

function makerName(product: {
  user: { firstName: string | null; lastName: string | null } | null
}) {
  if (!product.user) return "Unknown maker"
  const first = product.user.firstName ?? ""
  const last = product.user.lastName ?? ""
  const name = `${first} ${last}`.trim()
  return name || "Unknown maker"
}

function DeltaBadge({
  value,
  formatter = formatNumber,
  positiveIsGood = true,
}: {
  value: number | null
  formatter?: (value: number) => string
  positiveIsGood?: boolean
}) {
  if (value === null) {
    return <span className="text-xs text-muted-foreground">—</span>
  }
  if (value === 0) {
    return <span className="text-xs text-muted-foreground">0</span>
  }
  const magnitude = Math.abs(value)
  const good = value > 0 === positiveIsGood
  const tone = good ? "text-emerald-600" : "text-rose-600"
  const arrow = value > 0 ? "▲" : "▼"
  const prefix = value > 0 ? "+" : "-"
  return (
    <span className={cn("text-xs font-medium", tone)}>
      {arrow} {prefix}
      {formatter(magnitude)}
    </span>
  )
}

function MetricTile({
  title,
  value,
  helper,
  delta,
  deltaFormatter = formatNumber,
  deltaLabel,
  positiveIsGood = true,
}: {
  title: string
  value: string
  helper?: string
  delta?: number | null
  deltaFormatter?: (value: number) => string
  deltaLabel?: string
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
        {typeof delta !== "undefined" && delta !== null ? (
          <div className="flex items-center gap-2 text-xs">
            <DeltaBadge
              value={delta}
              formatter={deltaFormatter}
              positiveIsGood={positiveIsGood}
            />
            {deltaLabel ? (
              <span className="text-muted-foreground">{deltaLabel}</span>
            ) : null}
          </div>
        ) : null}
        {helper ? (
          <p className="text-xs text-muted-foreground">{helper}</p>
        ) : null}
      </CardContent>
    </Card>
  )
}

function RankChangeBadge({ value }: { value: number | null }) {
  if (value === null) {
    return <span className="text-xs text-muted-foreground">—</span>
  }
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

export default async function LeaderboardAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams
  const analytics = await getLeaderboardScoringAnalytics({ month: sp?.month })

  const historyData = analytics.history.map((entry) => ({
    label: entry.label,
    upvotes: entry.totalMonthlyUpvotes,
    champion: entry.championScore ?? 0,
    average: entry.averageScore,
  }))

  const rankUps = analytics.rankings
    .filter((item) => (item.rankChange ?? 0) > 0)
    .sort((a, b) => (b.rankChange ?? 0) - (a.rankChange ?? 0))
    .slice(0, 5)

  const scoreGains = analytics.rankings
    .filter((item) => (item.scoreChange ?? 0) > 0)
    .sort((a, b) => (b.scoreChange ?? 0) - (a.scoreChange ?? 0))
    .slice(0, 5)

  const newEntries = analytics.rankings.filter((item) => item.isNew).slice(0, 5)

  const churnPercent = analytics.summary.rankedCount
    ? (analytics.summary.newCount / analytics.summary.rankedCount) * 100
    : 0

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            Leaderboard scoring
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Inspect how monthly upvotes translate into score, track returning
            products, and understand momentum shifts that move makers up or down
            the leaderboard.
          </p>
        </div>
        <LeaderboardMonthSelect
          months={analytics.availableMonths}
          current={analytics.month.key}
        />
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            Score pulse
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricTile
            title="Ranked products"
            value={formatNumber(analytics.summary.rankedCount)}
            helper={`${analytics.summary.returningCount} returning (${formatPercent(analytics.summary.returningRate)})`}
          />
          <MetricTile
            title={`Monthly upvotes (${analytics.month.label.split(" ")[0]})`}
            value={formatNumber(analytics.summary.totalMonthlyUpvotes)}
            helper={`Median per product: ${formatNumber(analytics.summary.medianMonthlyUpvotes)}`}
          />
          <MetricTile
            title="Champion score"
            value={
              analytics.summary.topScore !== null
                ? formatNumber(analytics.summary.topScore)
                : "—"
            }
            delta={analytics.summary.championScoreDelta}
            deltaLabel="vs previous month"
          />
          <MetricTile
            title="Score spread"
            value={
              analytics.summary.scoreSpread !== null
                ? formatNumber(analytics.summary.scoreSpread)
                : "—"
            }
            helper={
              analytics.summary.bottomScore !== null
                ? `Bottom score: ${formatNumber(analytics.summary.bottomScore)}`
                : undefined
            }
          />
        </div>
      </section>

      <section className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <AnalyticsChartCard
            title="Monthly progression"
            description="Total upvotes, champion score, and average score across recent leaderboard runs."
            tooltip="Helps validate whether the scoring formula behaves consistently across months and highlights when campaigns drive outsized upvotes."
            infoLabel="View monthly scoring trend description"
            headerClassName="px-4 pb-0"
            contentClassName="px-4 pb-5 pt-4"
          >
            {historyData.length ? (
              <LeaderboardProgressionChart data={historyData} />
            ) : (
              <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-10 text-center text-base text-muted-foreground">
                Leaderboard scoring history will appear once monthly rankings
                are generated.
              </p>
            )}
          </AnalyticsChartCard>

          <Card className="border-slate-200/70 bg-white/90 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base text-slate-900">
                Monthly highlights
              </CardTitle>
              <CardDescription>
                Quick stats derived from {analytics.month.label} rankings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="space-y-1">
                <p className="font-medium text-slate-900">
                  {analytics.summary.returningCount} returning products
                </p>
                <p className="text-muted-foreground">
                  {analytics.summary.newCount} newcomers earned a rank this
                  month, indicating {percentFormatter.format(churnPercent)}{" "}
                  churn among the leaderboard spots you monitor.
                </p>
              </div>
              <div className="space-y-1">
                <p className="font-medium text-slate-900">
                  {analytics.summary.improvingCount} climbed in rank
                </p>
                <p className="text-muted-foreground">
                  {analytics.summary.decliningCount} dropped compared to last
                  month, while {analytics.summary.stableCount} held their spots.
                </p>
              </div>
              {analytics.summary.championUpvoteDelta !== null ? (
                <div className="space-y-1">
                  <p className="font-medium text-slate-900">Champion upvotes</p>
                  <p className="text-muted-foreground">
                    The top product collected{" "}
                    {formatNumber(analytics.summary.topMonthlyUpvotes ?? 0)}{" "}
                    upvotes this month
                    {analytics.summary.championUpvoteDelta !== null
                      ? ` (${analytics.summary.championUpvoteDelta > 0 ? "+" : ""}${formatNumber(analytics.summary.championUpvoteDelta)} vs last month).`
                      : "."}
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            Detailed rankings
          </h2>
          <p className="text-sm text-muted-foreground max-w-3xl">
            Score reflects the monthly formula (monthly upvotes × 100 + lifetime
            upvotes). Track how each product’s position shifts relative to last
            month to spot campaign spikes or fatigue.
          </p>
        </div>
        <Card className="border-slate-200/70 bg-white/95 shadow-sm">
          <CardContent className="overflow-x-auto">
            {analytics.rankings.length ? (
              <table className="w-full min-w-[880px] text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    <th className="py-2 pr-4 text-left font-semibold">Rank</th>
                    <th className="py-2 pr-4 text-left font-semibold">
                      Product
                    </th>
                    <th className="py-2 pr-4 text-right font-semibold">
                      Monthly upvotes
                    </th>
                    <th className="py-2 pr-4 text-right font-semibold">
                      Score
                    </th>
                    <th className="py-2 pr-4 text-right font-semibold">
                      Rank Δ
                    </th>
                    <th className="py-2 pr-4 text-right font-semibold">
                      Score Δ
                    </th>
                    <th className="py-2 pr-4 text-right font-semibold">
                      Upvotes Δ
                    </th>
                    <th className="py-2 text-right font-semibold">
                      Total upvotes
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70">
                  {analytics.rankings.map((item) => {
                    const categoryName =
                      item.product.category?.name ?? "Uncategorized"
                    const tag = item.product.tagline
                    return (
                      <tr
                        key={item.productId}
                        className={cn(
                          "transition-colors",
                          item.rank === 1
                            ? "bg-[linear-gradient(120deg,rgba(7,78,134,0.04),rgba(7,78,134,0.02))]"
                            : undefined,
                        )}
                      >
                        <td className="py-3 pr-4 align-top text-sm font-semibold text-slate-900">
                          #{item.rank}
                        </td>
                        <td className="py-3 pr-4 align-top">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <Link
                                href={productPath(item.product.slug)}
                                className="text-sm font-semibold text-slate-900 hover:underline"
                              >
                                {item.product.name}
                              </Link>
                              {item.isNew ? (
                                <Badge variant="success">New</Badge>
                              ) : null}
                            </div>
                            {tag ? (
                              <p className="text-xs text-muted-foreground">
                                {tag}
                              </p>
                            ) : null}
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
                              <span>{categoryName}</span>
                              <span>{makerName(item.product)}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-right font-semibold text-slate-900 tabular-nums">
                          {formatNumber(item.monthlyUpvotes)}
                        </td>
                        <td className="py-3 pr-4 text-right font-semibold text-slate-900 tabular-nums">
                          {formatNumber(item.score)}
                        </td>
                        <td className="py-3 pr-4 text-right tabular-nums">
                          <RankChangeBadge value={item.rankChange} />
                        </td>
                        <td className="py-3 pr-4 text-right tabular-nums">
                          <DeltaBadge value={item.scoreChange} />
                        </td>
                        <td className="py-3 pr-4 text-right tabular-nums">
                          <DeltaBadge value={item.upvoteChange} />
                        </td>
                        <td className="py-3 text-right tabular-nums text-muted-foreground">
                          {formatNumber(item.totalUpvotes)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No leaderboard rankings recorded for {analytics.month.label}{" "}
                yet. Once the monthly job runs, detailed scoring will appear
                here.
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
            Use these callouts to triage campaigns that are working, identify
            drops to investigate, and celebrate makers making a debut.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="border-slate-200/70 bg-white/90 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-slate-900">
                Biggest climbers
              </CardTitle>
              <CardDescription>
                Ranked by biggest upward delta versus the previous month.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {rankUps.length ? (
                rankUps.map((item) => (
                  <div
                    key={item.productId}
                    className="flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0 space-y-1">
                      <p className="truncate font-medium text-slate-900">
                        {item.product.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Now #{item.rank} • was #{item.previousRank ?? "—"}
                      </p>
                    </div>
                    <RankChangeBadge value={item.rankChange} />
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Need at least two months of rankings to surface movers.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200/70 bg-white/90 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-slate-900">
                Score surges
              </CardTitle>
              <CardDescription>
                Products with the largest positive score change
                month-over-month.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {scoreGains.length ? (
                scoreGains.map((item) => (
                  <div
                    key={item.productId}
                    className="flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0 space-y-1">
                      <p className="truncate font-medium text-slate-900">
                        {item.product.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        #{item.rank} • {formatNumber(item.monthlyUpvotes)}{" "}
                        upvotes
                      </p>
                    </div>
                    <DeltaBadge value={item.scoreChange} />
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Score deltas appear after a previous month exists.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200/70 bg-white/90 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-slate-900">
                New arrivals
              </CardTitle>
              <CardDescription>
                Fresh entries ordered by current rank.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {newEntries.length ? (
                newEntries.map((item) => (
                  <div
                    key={item.productId}
                    className="flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0 space-y-1">
                      <p className="truncate font-medium text-slate-900">
                        {item.product.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        #{item.rank} • {formatNumber(item.monthlyUpvotes)}{" "}
                        upvotes
                      </p>
                    </div>
                    <Badge variant="success">New</Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Once new products appear in the rankings, they will be listed
                  here automatically.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}

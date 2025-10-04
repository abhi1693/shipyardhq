import type { ReactNode } from "react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"
import RangeSelector from "@/components/molecules/RangeSelector"
import { getRewardAnalyticsSummary } from "@/actions/admin/rewards/actions"
import { buildPageMetadata } from "@/lib/metadata"
import { RewardsFlowChart } from "@/components/pages/admin/analytics/RewardsFlowChart"
import type {
  RewardAnalyticsLeaderboardEntry,
  RewardAnalyticsSummary,
  RewardAnalyticsUserEntry,
} from "@/types/rewards"

export const metadata = buildPageMetadata({
  title: "Reward analytics",
  section: "Admin",
  description: "Monitor reward issuance, spend, and manual adjustments.",
})

export const dynamic = "force-dynamic"

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
})

const percentFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
})

function formatRewards(value: number): string {
  return `${numberFormatter.format(value)} rewards`
}

function formatSignedRewards(value: number): string {
  if (value === 0) return "0 rewards"
  const formatted = numberFormatter.format(Math.abs(value))
  return value > 0 ? `+${formatted} rewards` : `-${formatted} rewards`
}

function formatShare(share: number): string {
  if (!Number.isFinite(share)) return "—"
  return `${percentFormatter.format(share * 100)}%`
}

function formatCount(count?: number, previous?: number): string | null {
  if (count == null) return null
  const currentLabel = `${numberFormatter.format(count)} tx${count === 1 ? "" : "s"}`
  if (previous == null) return currentLabel
  const previousLabel = `${numberFormatter.format(previous)} prior`
  return `${currentLabel} · ${previousLabel}`
}

function formatDelta(delta: number): { label: string; tone: string } {
  if (Number.isNaN(delta)) {
    return { label: "—", tone: "text-muted-foreground" }
  }
  if (!Number.isFinite(delta)) {
    if (delta > 0) {
      return { label: "New", tone: "text-emerald-600" }
    }
    if (delta < 0) {
      return { label: "-∞%", tone: "text-rose-600" }
    }
    return { label: "—", tone: "text-muted-foreground" }
  }
  if (delta === 0) {
    return { label: "0%", tone: "text-muted-foreground" }
  }
  const tone = delta > 0 ? "text-emerald-600" : "text-rose-600"
  const prefix = delta > 0 ? "+" : ""
  return {
    label: `${prefix}${percentFormatter.format(delta)}%`,
    tone,
  }
}

type MetricLike = {
  amount: number
  previousAmount: number
  delta: number
  count?: number
  previousCount?: number
}

interface MetricCardProps {
  title: string
  metric: MetricLike
  description?: string
  helper?: string
  valueLabel?: string
  previousLabel?: string
  children?: ReactNode
}

function MetricCard({
  title,
  metric,
  description,
  helper,
  valueLabel,
  previousLabel,
  children,
}: MetricCardProps) {
  const { label, tone } = formatDelta(metric.delta)
  const current = valueLabel ?? formatRewards(metric.amount)
  const previous = previousLabel ?? formatRewards(metric.previousAmount)
  const countInfo = formatCount(metric.count, metric.previousCount)

  return (
    <Card className="border-slate-200/70 bg-white/95 shadow-sm">
      <CardHeader className="pb-1">
        <CardTitle className="text-xs font-semibold uppercase tracking-[0.32em] text-muted-foreground">
          {title}
        </CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="space-y-1.5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
          <span className="text-xl font-semibold text-slate-900">{current}</span>
          <span className={`text-xs font-medium tabular-nums ${tone}`}>{label}</span>
        </div>
        <div className="text-xs text-muted-foreground">vs {previous}</div>
        {countInfo ? (
          <div className="text-[11px] text-muted-foreground">{countInfo}</div>
        ) : null}
        {helper ? (
          <div className="text-xs text-muted-foreground">{helper}</div>
        ) : null}
        {children ? (
          <div className="space-y-1 text-[11px] text-slate-900">{children}</div>
        ) : null}
      </CardContent>
    </Card>
  )
}

interface LeaderboardCardProps {
  title: string
  description: string
  entries: Array<RewardAnalyticsLeaderboardEntry | RewardAnalyticsUserEntry>
  emptyLabel: string
  renderHelper?: (entry: RewardAnalyticsLeaderboardEntry | RewardAnalyticsUserEntry) => ReactNode
}

function LeaderboardCard({
  title,
  description,
  entries,
  emptyLabel,
  renderHelper,
}: LeaderboardCardProps) {
  return (
    <Card className="border-slate-200/70 bg-white/95 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-slate-900">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyLabel}</p>
        ) : (
          <ol className="space-y-4 text-sm">
            {entries.map((entry, index) => (
              <li key={entry.id} className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">
                      #{index + 1}
                    </span>
                    <span className="truncate font-medium text-slate-900">
                      {entry.name}
                    </span>
                  </div>
                  {(() => {
                    if (!renderHelper) return null
                    const helperContent = renderHelper(entry)
                    if (!helperContent) return null
                    return (
                      <div className="text-xs text-muted-foreground">
                        {helperContent}
                      </div>
                    )
                  })()}
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-sm font-semibold text-slate-900">
                    {formatRewards(entry.amount)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatShare(entry.share)} share
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}

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

function buildAdjustmentHelper(summary: RewardAnalyticsSummary): string {
  const { adjustments } = summary.totals
  const added = adjustments.positiveAmount
  const removed = adjustments.negativeAmount
  if (added === 0 && removed === 0) {
    return "No manual adjustments this period."
  }
  const addedLabel = added ? `${formatRewards(added)} added` : undefined
  const removedLabel = removed ? `${formatRewards(removed)} removed` : undefined
  return [addedLabel, removedLabel].filter(Boolean).join(" · ")
}

function renderUserHelper(entry: RewardAnalyticsLeaderboardEntry | RewardAnalyticsUserEntry) {
  if ("email" in entry && entry.email) {
    return entry.email
  }
  return ""
}

export default async function RewardAnalyticsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>
}) {
  const resolved = searchParams ? await searchParams : undefined
  const days = rangeToDays(resolved?.range)
  const analytics = await getRewardAnalyticsSummary(days)

  const adjustmentsHelper = buildAdjustmentHelper(analytics)

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Rewards analytics
          </h1>
          <p className="text-sm text-muted-foreground">
            Issuance, spend, and manual adjustments for the last {days} days.
          </p>
        </div>
        <RangeSelector />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        <MetricCard
          title="Rewards earned"
          metric={analytics.totals.earned}
          helper="Sum of system-awarded rewards."
        />
        <MetricCard
          title="Rewards spent"
          metric={analytics.totals.spent}
          helper="Total rewards redeemed from the catalog."
        />
        <MetricCard
          title="Rewards refunded"
          metric={analytics.totals.refunded}
          helper="Rewards returned to balances after cancellations."
        />
        <MetricCard
          title="Manual adjustments"
          metric={analytics.totals.adjustments}
          description="Includes grants and deductions."
          helper={adjustmentsHelper}
        >
          <div className="text-xs font-medium text-slate-900">
            Net {formatSignedRewards(analytics.totals.adjustments.net)}
          </div>
          <div className="text-xs text-muted-foreground">
            Previous net {formatSignedRewards(analytics.totals.adjustments.previousNet)}
          </div>
        </MetricCard>
        <MetricCard
          title="Net issuance"
          metric={{
            amount: analytics.totals.netIssued.amount,
            previousAmount: analytics.totals.netIssued.previousAmount,
            delta: analytics.totals.netIssued.delta,
          }}
          helper="Earned − spent + refunds + adjustments."
          valueLabel={formatSignedRewards(analytics.totals.netIssued.amount)}
          previousLabel={formatSignedRewards(
            analytics.totals.netIssued.previousAmount,
          )}
        />
      </div>

      <RewardsFlowChart timeline={analytics.timeline} days={days} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <LeaderboardCard
          title="Top earning rules"
          description="Reward rules contributing the most issuance."
          entries={analytics.leaders.topRules}
          emptyLabel="No reward issuance in this range."
        />
        <LeaderboardCard
          title="Top redeemed rewards"
          description="Catalog items driving reward spend."
          entries={analytics.leaders.topRewards}
          emptyLabel="No redemptions recorded during this range."
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <LeaderboardCard
          title="Top earners"
          description="Members who earned the most rewards."
          entries={analytics.leaders.topEarners}
          emptyLabel="No earnings found for this range."
          renderHelper={renderUserHelper}
        />
        <LeaderboardCard
          title="Top spenders"
          description="Members spending the most rewards."
          entries={analytics.leaders.topSpenders}
          emptyLabel="No spend activity during this range."
          renderHelper={renderUserHelper}
        />
      </div>
    </div>
  )
}

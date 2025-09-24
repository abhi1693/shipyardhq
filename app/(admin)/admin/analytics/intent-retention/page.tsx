import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"
import RangeSelector from "@/components/molecules/RangeSelector"
import {
  getIntentOutcomeAnalytics,
  intentOutcomeStages,
} from "@/lib/server/analytics/intentOutcome"
import type {
  IntentOutcomeRetentionMetrics,
  IntentOutcomeStageMetrics,
} from "@/types/analytics"

export const revalidate = 3600

type SearchParams = { range?: string }

const RANGE_OPTIONS = [
  { label: "30d", value: "30d" },
  { label: "60d", value: "60d" },
  { label: "90d", value: "90d" },
  { label: "180d", value: "180d" },
]

function rangeToDays(range?: string): number {
  switch (range) {
    case "30d":
      return 30
    case "60d":
      return 60
    case "180d":
      return 180
    case "90d":
    default:
      return 90
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
  if (!Number.isFinite(value)) return "—"
  return `${percentFormatter.format(value)}%`
}

function stageBucket(
  stage: IntentOutcomeStageMetrics,
  thresholdDays: number,
) {
  return stage.speedBuckets.find((bucket) => bucket.thresholdDays === thresholdDays)
}

function StageCoverageCard({
  stage,
  totalUsers,
}: {
  stage: IntentOutcomeStageMetrics
  totalUsers: number
}) {
  const within30 = stageBucket(stage, 30)
  return (
    <Card className="border-slate-200/70 bg-white/90 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
          {stage.label}
        </CardTitle>
        <CardDescription>{stage.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-2xl font-semibold text-slate-900">
          {formatNumber(stage.count)}
          <span className="ml-2 text-sm font-medium text-muted-foreground">
            {formatPercent(stage.percentage)}
          </span>
        </div>
        <div className="text-xs text-muted-foreground">
          {within30
            ? `${formatPercent(within30.percentage)} within 30 days`
            : `0% within 30 days`}
        </div>
        <div className="text-xs text-muted-foreground">
          {totalUsers === 0
            ? "No members in range"
            : `${formatNumber(stage.count)} of ${formatNumber(totalUsers)} members`}
        </div>
      </CardContent>
    </Card>
  )
}

function StageVelocityTable({
  stages,
}: {
  stages: IntentOutcomeStageMetrics[]
}) {
  return (
    <Card className="border-slate-200/70 bg-white/95 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base text-slate-900">Stage progression</CardTitle>
        <CardDescription>
          Coverage across the retention funnel with speed buckets.
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              <th className="py-2 pr-4 text-left font-semibold">Stage</th>
              <th className="py-2 pr-4 text-right font-semibold">Coverage</th>
              <th className="py-2 pr-4 text-right font-semibold">≤30d</th>
              <th className="py-2 pr-4 text-right font-semibold">≤60d</th>
              <th className="py-2 pr-4 text-right font-semibold">≤90d</th>
              <th className="py-2 text-right font-semibold">Median days</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/70">
            {stages.map((stage) => {
              const within30 = stageBucket(stage, 30)
              const within60 = stageBucket(stage, 60)
              const within90 = stageBucket(stage, 90)
              return (
                <tr key={stage.key}>
                  <td className="py-3 pr-4 align-top">
                    <div className="font-medium text-slate-900">{stage.label}</div>
                    <p className="text-xs text-muted-foreground">
                      {stage.description}
                    </p>
                  </td>
                  <td className="py-3 pr-4 text-right align-top">
                    <div className="font-semibold text-slate-900 tabular-nums">
                      {formatNumber(stage.count)}
                    </div>
                    <div className="text-xs text-muted-foreground tabular-nums">
                      {formatPercent(stage.percentage)}
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-right align-top tabular-nums text-muted-foreground">
                    {within30 ? formatPercent(within30.percentage) : "—"}
                  </td>
                  <td className="py-3 pr-4 text-right align-top tabular-nums text-muted-foreground">
                    {within60 ? formatPercent(within60.percentage) : "—"}
                  </td>
                  <td className="py-3 pr-4 text-right align-top tabular-nums text-muted-foreground">
                    {within90 ? formatPercent(within90.percentage) : "—"}
                  </td>
                  <td className="py-3 text-right align-top tabular-nums text-muted-foreground">
                    {stage.medianDaysToComplete ?? "—"}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}

function CohortTable({
  cohorts,
}: {
  cohorts: {
    id: string
    label: string
    totalUsers: number
    stageMetrics: IntentOutcomeStageMetrics[]
    retention: IntentOutcomeRetentionMetrics
  }[]
}) {
  return (
    <Card className="border-slate-200/70 bg-white/95 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base text-slate-900">
          Cohort breakdown
        </CardTitle>
        <CardDescription>
          Role intent and acquisition source cohorts ordered by size.
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full min-w-[960px] text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              <th className="py-2 pr-4 text-left font-semibold">Cohort</th>
              <th className="py-2 pr-4 text-right font-semibold">Members</th>
              {intentOutcomeStages.map((stage) => (
                <th key={stage.key} className="py-2 pr-4 text-right font-semibold">
                  {stage.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/70">
            {cohorts.map((cohort) => (
              <tr key={cohort.id}>
                <td className="py-3 pr-4 align-top">
                  <div className="font-medium text-slate-900">{cohort.label}</div>
                </td>
                <td className="py-3 pr-4 text-right align-top tabular-nums font-semibold text-slate-900">
                  {formatNumber(cohort.totalUsers)}
                </td>
                {intentOutcomeStages.map((stage) => {
                  const metrics = cohort.stageMetrics.find(
                    (item) => item.key === stage.key,
                  )
                  if (!metrics) {
                    return (
                      <td
                        key={`${cohort.id}-${stage.key}`}
                        className="py-3 pr-4 text-right align-top text-xs text-muted-foreground"
                      >
                        —
                      </td>
                    )
                  }
                  const within30 = stageBucket(metrics, 30)
                  return (
                    <td
                      key={`${cohort.id}-${stage.key}`}
                      className="py-3 pr-4 text-right align-top"
                    >
                      <div className="font-semibold text-slate-900 tabular-nums">
                        {formatNumber(metrics.count)}
                      </div>
                      <div className="text-xs text-muted-foreground tabular-nums">
                        {formatPercent(metrics.percentage)}
                      </div>
                      <div className="text-[11px] text-muted-foreground tabular-nums">
                        ≤30d {within30 ? formatPercent(within30.percentage) : "—"}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}

function RetentionSummary({
  thresholds,
}: {
  thresholds: IntentOutcomeRetentionMetrics["thresholds"]
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {thresholds.map((bucket) => (
        <Card
          key={bucket.thresholdDays}
          className="border-slate-200/70 bg-white/90 shadow-sm"
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
              {bucket.label}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-2xl font-semibold text-slate-900">
              {formatNumber(bucket.activeUsers)}
            </div>
            <div className="text-xs text-muted-foreground">
              {formatPercent(bucket.percentage)} of members remain active
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function CohortRetentionTable({
  cohorts,
}: {
  cohorts: {
    id: string
    label: string
    totalUsers: number
    retention: IntentOutcomeRetentionMetrics
  }[]
}) {
  if (!cohorts.length) {
    return null
  }

  const thresholds = cohorts[0]?.retention.thresholds ?? []

  return (
    <Card className="border-slate-200/70 bg-white/95 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base text-slate-900">
          Retention by cohort
        </CardTitle>
        <CardDescription>
          Share of members still active based on traffic, upvotes, or purchases.
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              <th className="py-2 pr-4 text-left font-semibold">Cohort</th>
              <th className="py-2 pr-4 text-right font-semibold">Members</th>
              {thresholds.map((bucket) => (
                <th key={bucket.thresholdDays} className="py-2 pr-4 text-right font-semibold">
                  {bucket.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/70">
            {cohorts.map((cohort) => (
              <tr key={cohort.id}>
                <td className="py-3 pr-4 align-top">
                  <div className="font-medium text-slate-900">{cohort.label}</div>
                </td>
                <td className="py-3 pr-4 text-right align-top tabular-nums font-semibold text-slate-900">
                  {formatNumber(cohort.totalUsers)}
                </td>
                {cohort.retention.thresholds.map((bucket) => (
                  <td
                    key={`${cohort.id}-${bucket.thresholdDays}`}
                    className="py-3 pr-4 text-right align-top"
                  >
                    <div className="font-semibold text-slate-900 tabular-nums">
                      {formatPercent(bucket.percentage)}
                    </div>
                    <div className="text-xs text-muted-foreground tabular-nums">
                      {formatNumber(bucket.activeUsers)} active
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}

export default async function IntentOutcomeAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams
  const rangeDays = rangeToDays(sp?.range)
  const analytics = await getIntentOutcomeAnalytics({ rangeDays })

  const emptyRetention = { thresholds: [] as IntentOutcomeRetentionMetrics["thresholds"] }

  const cohorts = analytics.cohorts.map((cohort) => ({
    id: cohort.id,
    label: `${cohort.roleIntentLabel} • ${cohort.heardFromLabel}`,
    totalUsers: cohort.totalUsers,
    stageMetrics: cohort.stageMetrics,
    retention: cohort.retention ?? emptyRetention,
  }))

  const summaryStages = analytics.summary.stageMetrics
  const summaryRetention = (analytics.summary.retention ?? emptyRetention).thresholds

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            Intent-to-outcome retention
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Connect onboarding intent with downstream activation signals. Track
            how quickly new members ship products, engage with the community,
            and convert into revenue-supporting cohorts.
          </p>
        </div>
        <RangeSelector ranges={RANGE_OPTIONS} paramKey="range" />
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            Coverage snapshot
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Card className="border-slate-200/70 bg-white/90 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                Members analysed
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-2xl font-semibold text-slate-900">
                {formatNumber(analytics.summary.totalUsers)}
              </div>
              <p className="text-xs text-muted-foreground">
                Active members created in the past {analytics.rangeDays} days.
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200/70 bg-white/90 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                Cohorts tracked
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-2xl font-semibold text-slate-900">
                {formatNumber(analytics.summary.totalCohorts)}
              </div>
              <p className="text-xs text-muted-foreground">
                Distinct combinations of intent and acquisition source.
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200/70 bg-white/90 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                Generated
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-2xl font-semibold text-slate-900">
                {new Date(analytics.generatedAt).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Cached for {revalidate} seconds.
              </p>
            </CardContent>
          </Card>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {summaryStages.map((stage) => (
            <StageCoverageCard
              key={stage.key}
              stage={stage}
              totalUsers={analytics.summary.totalUsers}
            />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            Stage velocity
          </h2>
        </div>
        <StageVelocityTable stages={summaryStages} />
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            Retention curves
          </h2>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Measures whether members stay active after onboarding by shipping
            products that attract traffic, upvoting, or purchasing plans.
          </p>
        </div>
        <RetentionSummary thresholds={summaryRetention} />
        <CohortRetentionTable cohorts={cohorts} />
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            Cohort performance
          </h2>
        </div>
        {cohorts.length ? (
          <CohortTable cohorts={cohorts} />
        ) : (
          <Card className="border-slate-200/70 bg-white/95 shadow-sm">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No cohorts found in this window. Collect more onboarding intent and
              acquisition responses to unlock the breakdown.
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  )
}

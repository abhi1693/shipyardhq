"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"
import { type ChartConfig } from "@/components/atoms/chart"
import { AnalyticsChartCard } from "@/components/molecules/AnalyticsChartCard"
import {
  AnalyticsLineChart,
  type AnalyticsLineDefinition,
} from "@/components/molecules/AnalyticsLineChart"
import type {
  OnboardingAnswersSummary,
  OnboardingOutcomeDeltaItem,
} from "@/types/analytics"
import { formatDistanceToNow } from "date-fns"

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value)
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) return "—"
  return `${value.toFixed(1)}%`
}

function formatRate(count: number, rate: number) {
  return `${formatNumber(count)} (${formatPercent(rate)})`
}

function BreakdownList({
  items,
  emptyLabel,
}: {
  items: OnboardingAnswersSummary["roleIntentBreakdown"]
  emptyLabel: string
}) {
  if (!items.length) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>
  }

  return (
    <ul className="space-y-4">
      {items.map((item) => {
        const clampedPercent = Math.max(0, Math.min(100, item.percentage))
        return (
          <li key={item.value} className="space-y-1">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate font-medium text-foreground">
                {item.label}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatNumber(item.count)} • {formatPercent(item.percentage)}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200/70">
              <div
                className="h-full rounded-full bg-sky-500"
                style={{ width: `${clampedPercent}%` }}
                aria-hidden
              />
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export function OnboardingAnswersAnalytics({
  summary,
}: {
  summary: OnboardingAnswersSummary
}) {
  const rangeLabel = `${summary.rangeDays}d`
  const highlights = [
    {
      label: "Completed onboarding",
      value: formatNumber(summary.completedResponses),
      helper: `${formatPercent(summary.completionRate)} completion rate (${rangeLabel})`,
    },
    {
      label: `Active members (${rangeLabel})`,
      value: formatNumber(summary.totalActiveUsers),
      helper: `${formatNumber(summary.pendingUsers)} still pending`,
    },
    {
      label: "New completions",
      value: formatNumber(summary.completedInRange),
      helper: `Completed in the past ${rangeLabel}`,
    },
    {
      label: "Latest response",
      value: summary.lastResponseAt
        ? formatDistanceToNow(new Date(summary.lastResponseAt), {
            addSuffix: true,
          })
        : "No responses yet",
      helper: summary.lastResponseAt ? "Most recent completion" : undefined,
    },
  ]

  const trackedDays = summary.signupTimeline.length
  const totalSignups = summary.signupTimeline.reduce(
    (total, point) => total + point.signups,
    0,
  )
  const latestSignupPoint = summary.signupTimeline.at(-1)
  const latestSignups = latestSignupPoint?.signups ?? 0
  const latestSignupLabel = latestSignupPoint?.label ?? "Most recent day"
  const signupChartConfig: ChartConfig = {
    signups: { label: "Signups", color: "#0ea5e9" },
  }
  const signupLineDefinition: AnalyticsLineDefinition<
    (typeof summary.signupTimeline)[number]
  >[] = [{ dataKey: "signups" }]

  const intentOutcomeSections: Array<{
    title: string
    description: string
    items: OnboardingOutcomeDeltaItem[]
  }> = [
    {
      title: "By intent",
      description: "How each stated mission converts into product activity.",
      items: summary.roleIntentOutcomes,
    },
    {
      title: "By acquisition channel",
      description: "Performance of heard-from sources across key actions.",
      items: summary.heardFromOutcomes,
    },
  ]

  const hasOutcomeData = intentOutcomeSections.some(
    (section) => section.items.length,
  )

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Onboarding snapshot</CardTitle>
          <CardDescription>
            Completion progress across the member questionnaire.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {highlights.map((item) => (
              <div key={item.label} className="space-y-1">
                <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  {item.label}
                </div>
                <div className="text-lg font-semibold text-foreground">
                  {item.value}
                </div>
                {item.helper ? (
                  <p className="text-xs text-muted-foreground">{item.helper}</p>
                ) : null}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <AnalyticsChartCard
        title="Signup velocity"
        description={`Daily active signups over the last ${Math.max(trackedDays, 1)} days.`}
        tooltip="Visualises how many active members created accounts each day. Use it to spot launch spikes or quiet stretches in onboarding activity."
        infoLabel="Learn more about signup velocity"
        headerClassName="px-4 pb-0"
        contentClassName="px-4 pb-5 pt-4"
      >
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-baseline gap-3">
            <p className="text-2xl font-semibold text-foreground">
              {formatNumber(totalSignups)}
            </p>
            <span className="text-sm text-muted-foreground">
              New active accounts • last {Math.max(trackedDays, 1)} days
            </span>
            <span className="ml-auto text-xs text-muted-foreground">
              {latestSignupLabel}: {formatNumber(latestSignups)}{" "}
              {latestSignups === 1 ? "signup" : "signups"}
            </span>
          </div>

          <AnalyticsLineChart
            className="min-h-[260px]"
            data={summary.signupTimeline}
            config={signupChartConfig}
            lines={signupLineDefinition}
            showLegend={false}
            yTickFormatter={formatNumber}
            tooltipFormatter={formatNumber}
            tooltipLabelFormatter={(label) => String(label)}
            cursorStroke="var(--chart-signups)"
          />
        </div>
      </AnalyticsChartCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mission focus</CardTitle>
            <CardDescription>
              How members describe their primary reason for joining.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BreakdownList
              items={summary.roleIntentBreakdown}
              emptyLabel="No onboarding intents recorded yet."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Discovery sources</CardTitle>
            <CardDescription>
              Where new members say they first heard about Shipyard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BreakdownList
              items={summary.heardFromBreakdown}
              emptyLabel="No discovery sources recorded yet."
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Intent-to-outcome deltas</CardTitle>
          <CardDescription>
            Spot which intents and sources lead to shipping products, community
            upvotes, and plan purchases.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {hasOutcomeData ? (
            <div className="grid gap-6 lg:grid-cols-2">
              {intentOutcomeSections.map((section) => (
                <IntentOutcomeTable
                  key={section.title}
                  title={section.title}
                  description={section.description}
                  items={section.items}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Collect more onboarding completions to unlock conversion deltas by
              role intent and acquisition channel.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function IntentOutcomeTable({
  title,
  description,
  items,
}: {
  title: string
  description: string
  items: OnboardingOutcomeDeltaItem[]
}) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {items.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                <th className="py-2 pr-3 text-left font-semibold">Segment</th>
                <th className="py-2 pr-3 text-right font-semibold">Members</th>
                <th className="py-2 pr-3 text-right font-semibold">
                  Product owners
                </th>
                <th className="py-2 pr-3 text-right font-semibold">Upvoters</th>
                <th className="py-2 pr-3 text-right font-semibold">
                  Purchasers
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70">
              {items.map((item) => (
                <tr key={item.value}>
                  <td className="py-3 pr-3 align-top font-medium text-foreground">
                    {item.label}
                  </td>
                  <td className="py-3 pr-3 text-right align-top tabular-nums text-foreground">
                    {formatNumber(item.total)}
                  </td>
                  <td className="py-3 pr-3 text-right align-top tabular-nums text-foreground">
                    {formatRate(item.productOwners, item.productOwnerRate)}
                  </td>
                  <td className="py-3 pr-3 text-right align-top tabular-nums text-foreground">
                    {formatRate(item.upvoters, item.upvoterRate)}
                  </td>
                  <td className="py-3 pr-3 text-right align-top tabular-nums text-foreground">
                    {formatRate(item.purchasers, item.purchaserRate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No conversions recorded for this segment yet.
        </p>
      )}
    </div>
  )
}

"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/atoms/chart"
import { AnalyticsBarChart } from "@/components/molecules/AnalyticsBarChart"
import type {
  OnboardingAnswersSummary,
  OnboardingOutcomeDeltaItem,
} from "@/types/analytics"
import { formatDistanceToNow } from "date-fns"
import {
  Pie,
  PieChart,
  ResponsiveContainer,
  Cell,
  Tooltip as RechartsTooltip,
} from "recharts"

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
                className="h-full rounded-full bg-gradient-to-r from-sky-500 via-sky-400 to-sky-600"
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

function NewsletterIntentBreakdown({
  items,
}: {
  items: OnboardingAnswersSummary["newsletterIntentBreakdown"]
}) {
  if (!items.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No onboarded members have newsletter preferences yet.
      </p>
    )
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => {
        const clampedPercent = Math.max(
          0,
          Math.min(100, item.subscribedPercentage),
        )

        return (
          <div
            key={item.id}
            className="space-y-2 rounded-xl border border-slate-200/70 bg-white p-4 shadow-[0_12px_30px_-26px_rgba(15,23,42,0.35)]"
          >
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium text-foreground">{item.label}</span>
              <span className="text-xs text-muted-foreground">
                {formatNumber(item.total)}{" "}
                {item.total === 1 ? "member" : "members"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(item.subscribed)} subscribed •{" "}
              {formatPercent(item.subscribedPercentage)} opt-in
            </p>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200/70">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-sky-400 to-sky-500"
                style={{ width: `${clampedPercent}%` }}
                aria-hidden
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(item.optedOut)} opted out
            </p>
          </div>
        )
      })}
    </div>
  )
}

export function OnboardingAnswersAnalytics({
  summary,
}: {
  summary: OnboardingAnswersSummary
}) {
  const highlights = [
    {
      label: "Completed onboarding",
      value: formatNumber(summary.completedResponses),
      helper: `${formatPercent(summary.completionRate)} of active members`,
    },
    {
      label: "Active members",
      value: formatNumber(summary.totalActiveUsers),
      helper: `${formatNumber(summary.pendingUsers)} still pending`,
    },
    {
      label: "New this week",
      value: formatNumber(summary.completedLast7Days),
      helper: "Completed in the past 7 days",
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

  const newsletterTotal =
    summary.newsletterSubscribed + summary.newsletterOptedOut

  const newsletterConfig: ChartConfig = {
    subscribed: { label: "Subscribed", color: "#0ea5e9" },
    optedOut: { label: "Opted out", color: "#e11d48" },
  }

  const newsletterChartData = [
    {
      key: "subscribed",
      label: "Subscribed",
      value: summary.newsletterSubscribed,
      percentage:
        newsletterTotal === 0
          ? 0
          : (summary.newsletterSubscribed / newsletterTotal) * 100,
    },
    {
      key: "optedOut",
      label: "Opted out",
      value: summary.newsletterOptedOut,
      percentage:
        newsletterTotal === 0
          ? 0
          : (summary.newsletterOptedOut / newsletterTotal) * 100,
    },
  ]

  const newsletterCompositionConfig: ChartConfig = {
    subscribed: { label: "Subscribed", color: "#0ea5e9" },
    unsubscribed: { label: "Not subscribed", color: "#f97316" },
  }

  const newsletterCompositionData = [
    {
      segment: "Registered accounts",
      subscribed: summary.newsletterRegisteredSubscribers,
      unsubscribed: summary.newsletterRegisteredNotSubscribed,
    },
    {
      segment: "Newsletter-only",
      subscribed: summary.newsletterUnregisteredSubscribers,
      unsubscribed: 0,
    },
  ]

  const hasNewsletterCompositionData = newsletterCompositionData.some(
    (item) => item.subscribed + item.unsubscribed > 0,
  )

  const newsletterAudienceStats = [
    {
      label: "Registered & subscribed",
      value: summary.newsletterRegisteredSubscribers,
      helper: "Members opted into the newsletter",
    },
    {
      label: "Registered & unsubscribed",
      value: summary.newsletterRegisteredNotSubscribed,
      helper: "Members without newsletter access",
    },
    {
      label: "Newsletter-only contacts",
      value: summary.newsletterUnregisteredSubscribers,
      helper: "Emails without Shipyard accounts",
    },
  ]

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

  const hasOutcomeData = intentOutcomeSections.some((section) => section.items.length)

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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Newsletter engagement</CardTitle>
          <CardDescription>
            Opt-in preferences from onboarded members and overall coverage.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            {newsletterAudienceStats.map((item) => (
              <div key={item.label} className="space-y-1">
                <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  {item.label}
                </div>
                <div className="text-lg font-semibold text-foreground">
                  {formatNumber(item.value)}
                </div>
                {item.helper ? (
                  <p className="text-xs text-muted-foreground">{item.helper}</p>
                ) : null}
              </div>
            ))}
          </div>

          {hasNewsletterCompositionData ? (
            <AnalyticsBarChart
              data={newsletterCompositionData}
              config={newsletterCompositionConfig}
              bars={[
                {
                  dataKey: "subscribed",
                  barProps: { stackId: "newsletter-composition", radius: [4, 4, 0, 0] },
                },
                {
                  dataKey: "unsubscribed",
                  barProps: { stackId: "newsletter-composition", radius: [4, 4, 0, 0] },
                },
              ]}
              showLegend
              className="border border-slate-200/70 bg-white/95"
              xAxis={{ dataKey: "segment" }}
              tooltip={{
                labelFormatter: (label) => String(label),
              }}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              No newsletter audience data available yet.
            </p>
          )}

          <ChartContainer
            config={newsletterConfig}
            showLegend
            className="min-h-[260px] border border-slate-200/70 bg-white/95"
          >
            {newsletterTotal === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No onboarded members have set newsletter preferences yet.
              </p>
            ) : (
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
                <div className="h-48 w-full lg:h-[220px] lg:w-1/2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <RechartsTooltip
                        content={
                          <ChartTooltip
                            valueFormatter={(value) => {
                              const base = formatNumber(value)
                              if (!newsletterTotal) return base
                              const percent =
                                (value / Math.max(newsletterTotal, 1)) * 100
                              return `${base} (${formatPercent(percent)})`
                            }}
                          />
                        }
                      />
                      <Pie
                        data={newsletterChartData}
                        dataKey="value"
                        nameKey="label"
                        innerRadius={60}
                        strokeWidth={2}
                      >
                        {newsletterChartData.map((item) => (
                          <Cell
                            key={item.key}
                            fill={`var(--chart-${item.key})`}
                            name={item.label}
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-3">
                  {newsletterChartData.map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center gap-3 rounded-lg border border-slate-200/70 bg-white px-3 py-2"
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{
                          backgroundColor:
                            newsletterConfig[item.key]?.color ?? "#94a3b8",
                        }}
                      />
                      <div className="flex flex-1 flex-col">
                        <span className="text-sm font-medium text-foreground">
                          {item.label}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatNumber(item.value)} members
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-foreground">
                        {formatPercent(item.percentage)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </ChartContainer>

          <NewsletterIntentBreakdown
            items={summary.newsletterIntentBreakdown}
          />
        </CardContent>
      </Card>

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
                <th className="py-2 pr-3 text-right font-semibold">Product owners</th>
                <th className="py-2 pr-3 text-right font-semibold">Upvoters</th>
                <th className="py-2 text-right font-semibold">Purchasers</th>
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
                  <td className="py-3 text-right align-top tabular-nums text-foreground">
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

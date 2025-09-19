import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"
import type { OnboardingAnswersSummary } from "@/types/analytics"
import { formatDistanceToNow } from "date-fns"

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value)
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) return "—"
  return `${value.toFixed(1)}%`
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
      helper: summary.lastResponseAt
        ? "Most recent completion"
        : undefined,
    },
  ]

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
    </div>
  )
}

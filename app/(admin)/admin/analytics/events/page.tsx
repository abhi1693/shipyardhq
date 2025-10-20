import {
  getEventQueueSummary,
  getEventStatusTrend,
  getEventTypeTrend,
} from "@/actions/admin/events/actions"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"
import { Heading } from "@/components/atoms/heading"
import RangeSelector from "@/components/molecules/RangeSelector"
import { AnalyticsLineChart } from "@/components/molecules/AnalyticsLineChart"
import type { ChartConfig } from "@/components/atoms/chart"
import { EVENT_STATUS_KEYS } from "@/lib/server/events/constants"

export const dynamic = "force-dynamic"

type SummaryMetric = {
  label: string
  value: number
  helper?: string
}

function formatRelativeForHelper(value?: Date | null) {
  if (!value) return "No pending envelopes"
  const diff = Date.now() - value.getTime()
  if (diff < 60_000) return "Less than 1 minute"
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days === 1 ? "" : "s"} ago`
}

const statusChartConfig: ChartConfig = {
  pending: { label: "Pending", color: "#f97316" },
  processing: { label: "Processing", color: "#3b82f6" },
  retrying: { label: "Retrying", color: "#eab308" },
  completed: { label: "Completed", color: "#10b981" },
  dead_letter: { label: "Dead letter", color: "#f43f5e" },
}

const eventLinePalette = ["#6366f1", "#0ea5e9", "#f97316", "#10b981", "#ec4899"]

type SearchParams = {
  range?: string | string[]
}

function rangeToDays(range?: string): number {
  switch (range) {
    case "7d":
      return 7
    case "14d":
      return 14
    case "90d":
      return 90
    case "30d":
    default:
      return 30
  }
}

export default async function EventAnalyticsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const requestedRange = resolvedSearchParams?.range
  const rangeValue = Array.isArray(requestedRange)
    ? requestedRange[0]
    : requestedRange
  const days = rangeToDays(rangeValue)

  const [summary, statusTrend, typeTrend] = await Promise.all([
    getEventQueueSummary(),
    getEventStatusTrend(days),
    getEventTypeTrend(days, 5),
  ])

  const metrics: SummaryMetric[] = [
    {
      label: "Pending",
      value: summary.pending,
      helper: "Awaiting worker execution",
    },
    {
      label: "Retrying",
      value: summary.retrying,
      helper: "Scheduled for another attempt",
    },
    {
      label: "Processing",
      value: summary.processing,
      helper: "Currently being handled",
    },
    {
      label: "Completed",
      value: summary.completed,
      helper: "Finished envelopes",
    },
    {
      label: "Dead letter",
      value: summary.deadLetter,
      helper: "Require manual intervention",
    },
  ]

  const eventChartConfig: ChartConfig = Object.fromEntries(
    typeTrend.series.map((eventName, index) => [
      eventName,
      {
        label: eventName,
        color: eventLinePalette[index % eventLinePalette.length],
      },
    ]),
  )

  const eventLines = typeTrend.series.map((eventName) => ({
    dataKey: eventName,
    type: "monotone" as const,
  }))

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <Heading
          title="Event analytics"
          description="Monitor queue health and understand which handlers drive workload."
        />
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:gap-4">
          <RangeSelector className="self-start" />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold text-slate-900">
            Queue health
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
            {metrics.map((metric) => (
              <div
                key={metric.label}
                className="rounded-xl border border-slate-200/70 bg-white/80 p-4 shadow-sm"
              >
                <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {metric.label}
                </div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">
                  {metric.value.toLocaleString()}
                </div>
                {metric.helper ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {metric.helper}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Oldest pending event: {formatRelativeForHelper(summary.oldestPendingAt)}
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-900">
              Status trend (30 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AnalyticsLineChart
              data={statusTrend}
              config={statusChartConfig}
              lines={EVENT_STATUS_KEYS.map((status) => ({
                dataKey: status,
              }))}
              xKey="label"
              height={280}
            />
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-900">
              Event distribution (30 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {typeTrend.series.length ? (
              <AnalyticsLineChart
                data={typeTrend.points}
                config={eventChartConfig}
                lines={eventLines}
                xKey="label"
                height={280}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                No event activity recorded in the selected window.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

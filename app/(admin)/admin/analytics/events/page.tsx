import {
  getEventQueueSummary,
  getEventStatusTrend,
  getEventTypeTrend,
  getQueueLatencyStats,
  getTopEventVolumes,
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
import { AnalyticsPieChart } from "@/components/molecules/AnalyticsPieChart"
import { AnalyticsBarChart } from "@/components/molecules/AnalyticsBarChart"
import type { ChartConfig } from "@/components/atoms/chart"
import { EVENT_STATUS_KEYS } from "@/lib/server/events/constants"
import {
  EVENT_QUEUE_DEFINITIONS,
  EVENT_QUEUE_NAMES,
} from "@/lib/server/events/queues"

export const dynamic = "force-dynamic"

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

type RangeValue = "7d" | "14d" | "30d" | "90d"

const EVENT_RANGE_OPTIONS: Array<{ label: string; value: RangeValue }> = [
  { label: "7d", value: "7d" },
  { label: "14d", value: "14d" },
  { label: "30d", value: "30d" },
  { label: "90d", value: "90d" },
]

const RANGE_TO_DAYS: Record<RangeValue, number> = {
  "7d": 7,
  "14d": 14,
  "30d": 30,
  "90d": 90,
}

const DEFAULT_RANGE: RangeValue = "7d"

type SearchParams = {
  range?: string | string[]
}

function isRangeValue(value?: string | null): value is RangeValue {
  return (
    value === "7d" ||
    value === "14d" ||
    value === "30d" ||
    value === "90d"
  )
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
  const selectedRange = isRangeValue(rangeValue)
    ? rangeValue
    : DEFAULT_RANGE
  const days = RANGE_TO_DAYS[selectedRange]

  const [summary, statusTrend, typeTrend, queueLatencyStats, topEventVolumes] =
    await Promise.all([
      getEventQueueSummary(days),
      getEventStatusTrend(days),
      getEventTypeTrend(days, 5),
      getQueueLatencyStats(days),
      getTopEventVolumes(days, 8),
    ])

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

  const queueBreakdown = EVENT_QUEUE_NAMES.map((queue) => {
    const definition = EVENT_QUEUE_DEFINITIONS[queue]
    const breakdown = summary.queues[queue]
    const pendingTotal = breakdown.pending + breakdown.retrying
    return {
      id: queue,
      label: definition.label,
      intervalMinutes: definition.intervalMinutes,
      pending: pendingTotal,
      processing: breakdown.processing,
      oldestPendingAt: breakdown.oldestPendingAt,
    }
  })

  const totalPendingAcrossQueues = queueBreakdown.reduce(
    (sum, queue) => sum + queue.pending,
    0,
  )

  const queueColors: Record<(typeof EVENT_QUEUE_NAMES)[number], string> = {
    high: "#f97316",
    default: "#2563eb",
    low: "#14b8a6",
  }

  const queueChartConfig: ChartConfig = Object.fromEntries(
    queueBreakdown.map((queue) => [
      queue.id,
      {
        label: queue.label,
        color: queueColors[queue.id] ?? "#1f2937",
      },
    ]),
  )

  type QueuePieDatum = {
    id: (typeof EVENT_QUEUE_NAMES)[number]
    label: string
    value: number
  }

  const queuePieData: QueuePieDatum[] = queueBreakdown.map((queue) => ({
    id: queue.id,
    label: queue.label,
    value: queue.pending,
  }))

  const queuePieCells = queuePieData.map((datum) => ({
    fill: queueChartConfig[datum.id]?.color,
  }))

  const queueLatencyData = EVENT_QUEUE_NAMES.map((queue) => {
    const stat = queueLatencyStats[queue]
    return {
      queue,
      label: EVENT_QUEUE_DEFINITIONS[queue].label,
      p50Minutes: stat?.p50Minutes ?? 0,
      p95Minutes: stat?.p95Minutes ?? 0,
      averageMinutes: stat?.averageMinutes ?? 0,
      sampleCount: stat?.sampleCount ?? 0,
    }
  })

  const hasLatencySamples = queueLatencyData.some(
    (item) => item.sampleCount > 0,
  )

  const totalLatencySamples = queueLatencyData.reduce(
    (total, item) => total + item.sampleCount,
    0,
  )

  const queueLatencyConfig: ChartConfig = {
    p50Minutes: { label: "P50 wait (min)", color: "#2563eb" },
    p95Minutes: { label: "P95 wait (min)", color: "#f97316" },
  }

  const topEventData = topEventVolumes.map((item) => ({
    event: item.event,
    label: item.event,
    total: item.total,
  }))

  const topEventConfig: ChartConfig = {
    total: { label: "Envelopes", color: "#7c3aed" },
  }

  const hasTopEvents = topEventData.length > 0

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <Heading
          title="Event analytics"
          description="Monitor queue health and understand which handlers drive workload."
        />
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:gap-4">
          <RangeSelector
            className="self-start"
            ranges={EVENT_RANGE_OPTIONS}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-900">
              Queue distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {totalPendingAcrossQueues > 0 ? (
              <AnalyticsPieChart<QueuePieDatum>
                data={queuePieData}
                dataKey="value"
                nameKey="label"
                config={queueChartConfig}
                height={280}
                innerRadius={60}
                cells={queuePieCells}
                legend={
                  <dl className="grid grid-cols-1 gap-2 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-3">
                    {queueBreakdown.map((queue) => (
                      <div key={queue.id} className="flex items-center gap-2">
                        <span
                          className="inline-block h-2 w-2 rounded-full"
                          style={{
                            backgroundColor:
                              queueChartConfig[queue.id]?.color ?? "#0f172a",
                          }}
                        />
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-900">
                            {queue.label}
                          </span>
                          <span className="text-xs">
                            {queue.pending.toLocaleString()} pending /{" "}
                            {queue.processing.toLocaleString()} processing (interval{" "}
                            {queue.intervalMinutes} min)
                          </span>
                        </div>
                      </div>
                    ))}
                  </dl>
                }
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                No pending envelopes across high, default, or low queues.
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Oldest pending event in range:{" "}
              {formatRelativeForHelper(summary.oldestPendingAt)}
            </p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-900">
              Top event volume
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hasTopEvents ? (
              <AnalyticsBarChart
                data={topEventData}
                config={topEventConfig}
                bars={[{ dataKey: "total" }]}
                height={320}
                layout="vertical"
                xAxis={{ type: "number" }}
                yAxis={{ type: "category", dataKey: "label", width: 180 }}
                grid={{ strokeDasharray: "4 4" }}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                No event activity recorded in the selected window.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-900">
              Status trend
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
              Event distribution
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

        <Card className="overflow-hidden lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-900">
              Queue SLA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {hasLatencySamples ? (
              <AnalyticsBarChart
                data={queueLatencyData}
                config={queueLatencyConfig}
                bars={[
                  { dataKey: "p50Minutes" },
                  { dataKey: "p95Minutes" },
                ]}
                showLegend
                height={320}
                xAxis={{ dataKey: "label", interval: 0 }}
                grid={{ strokeDasharray: "4 4" }}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                No processed envelopes available for this window yet.
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Metrics represent minutes between enqueue and completion. Sample
              size: {totalLatencySamples.toLocaleString()} envelopes.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

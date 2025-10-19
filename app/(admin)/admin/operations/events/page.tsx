import { formatDistanceToNow } from "date-fns"

import {
  drainEventQueueAction,
  getEventQueueSummary,
  getEventStatusTrend,
  getEventTypeTrend,
  getRecentEventEnvelopes,
  requeueEnvelopeAction,
} from "@/actions/admin/events/actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/atoms/card"
import { Badge } from "@/components/atoms/badge"
import { Button } from "@/components/atoms/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/atoms/table"
import { Separator } from "@/components/atoms/separator"
import type {
  EventAttemptStatus,
  EventEnvelopeStatus,
} from "@/lib/vendor/prisma/client"
import { AnalyticsLineChart } from "@/components/molecules/AnalyticsLineChart"
import type { ChartConfig } from "@/components/atoms/chart"
import { EVENT_STATUS_KEYS } from "@/lib/server/events/constants"

export const dynamic = "force-dynamic"

const statusVariantMap: Record<EventEnvelopeStatus, "default" | "secondary" | "outline" | "destructive" | "success"> = {
  pending: "secondary",
  processing: "outline",
  retrying: "default",
  completed: "success",
  dead_letter: "destructive",
}

const attemptVariantMap: Record<EventAttemptStatus, "success" | "destructive" | "secondary"> = {
  succeeded: "success",
  failed: "destructive",
  timed_out: "secondary",
}

type SummaryMetric = {
  label: string
  value: number
  helper?: string
}

function formatRelativeDate(value?: Date | null) {
  if (!value) return "—"
  return `${formatDistanceToNow(value, { addSuffix: true })}`
}

function pluralize(count: number, noun: string) {
  return `${count} ${count === 1 ? noun : `${noun}s`}`
}

export default async function EventQueuePage() {
  const [summary, envelopes, statusTrend, typeTrend] = await Promise.all([
    getEventQueueSummary(),
    getRecentEventEnvelopes(50),
    getEventStatusTrend(30),
    getEventTypeTrend(30, 5),
  ])

  const statusChartConfig: ChartConfig = {
    pending: { label: "Pending", color: "#f97316" },
    processing: { label: "Processing", color: "#3b82f6" },
    retrying: { label: "Retrying", color: "#eab308" },
    completed: { label: "Completed", color: "#10b981" },
    dead_letter: { label: "Dead letter", color: "#f43f5e" },
  }

  const eventPalette = ["#6366f1", "#0ea5e9", "#f97316", "#10b981", "#ec4899"]
  const eventChartConfig: ChartConfig = Object.fromEntries(
    typeTrend.series.map((eventName, index) => [
      eventName,
      {
        label: eventName,
        color: eventPalette[index % eventPalette.length],
      },
    ]),
  )

  const eventLines = typeTrend.series.map((eventName) => ({
    dataKey: eventName,
    type: "monotone" as const,
  }))

  const metrics: SummaryMetric[] = [
    {
      label: "Redis backlog",
      value: summary.queueDepth,
      helper: "Queued jobs waiting to be picked up",
    },
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

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Event queue
          </h1>
          <p className="text-sm text-muted-foreground">
            Monitor asynchronous handlers, inspect recent envelopes, and trigger
            manual retries.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <form action={drainEventQueueAction}>
            <Button type="submit" variant="default">
              Drain queue (25)
            </Button>
          </form>
          <p className="text-xs text-muted-foreground">
            Oldest pending event: {formatRelativeDate(summary.oldestPendingAt)}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold text-slate-900">
            Queue health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold text-slate-900">
            Recent envelopes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {envelopes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No envelopes have been recorded yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Handlers</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>Last error</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {envelopes.map((envelope) => {
                  const totalHandlers = envelope.asyncHandlers.length
                  const pendingHandlers = envelope.pendingHandlers.length
                  const lastAttempt = envelope.attemptsLog[0]
                  return (
                    <TableRow key={envelope.id}>
                      <TableCell className="max-w-xs">
                        <div className="flex flex-col gap-1">
                          <div className="text-sm font-semibold text-slate-900">
                            {envelope.event}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span className="font-mono text-[11px] text-slate-500">
                              {envelope.id}
                            </span>
                            <Separator orientation="vertical" className="h-3" />
                            <span>Enqueued {formatRelativeDate(envelope.enqueuedAt)}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariantMap[envelope.status]}>
                          {envelope.status.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="space-y-1">
                        <div className="text-sm text-slate-900">
                          {pendingHandlers}/{totalHandlers} pending
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {envelope.asyncHandlers.map((handler) => {
                            const isPending = envelope.pendingHandlers.includes(
                              handler,
                            )
                            return (
                              <Badge
                                key={handler}
                                variant={isPending ? "secondary" : "outline"}
                                className="font-mono text-[11px]"
                              >
                                {handler}
                              </Badge>
                            )
                          })}
                        </div>
                      </TableCell>
                      <TableCell className="space-y-1">
                        <div className="text-sm text-slate-900">
                          {pluralize(envelope.attempts, "attempt")}
                        </div>
                        {lastAttempt ? (
                          <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                            <Badge
                              variant={attemptVariantMap[lastAttempt.status]}
                            >
                              {lastAttempt.status.replace(/_/g, " ")}
                            </Badge>
                            <span>{lastAttempt.handler}</span>
                            <Separator orientation="vertical" className="h-3" />
                            <span>
                              {formatRelativeDate(lastAttempt.createdAt)}
                            </span>
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground">
                            Not yet attempted
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="max-w-sm text-xs text-rose-600">
                        {envelope.lastError ? (
                          <div className="line-clamp-3 break-words">
                            {envelope.lastError}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <form action={requeueEnvelopeAction} className="inline">
                          <input
                            type="hidden"
                            name="envelopeId"
                            value={envelope.id}
                          />
                          <Button
                            type="submit"
                            size="sm"
                            variant="outline"
                            disabled={envelope.status === "processing"}
                          >
                            Requeue
                          </Button>
                        </form>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

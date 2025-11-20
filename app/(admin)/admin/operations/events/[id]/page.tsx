import { redirect } from "next/navigation"
import { formatDistanceToNow } from "date-fns"

import { getEventEnvelopeDetail } from "@/actions/admin/events/actions"
import { adminPath } from "@/lib/routes"
import { ObjectPageLayout } from "@/components/layout/object-view/page-layout"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"
import { Badge } from "@/components/atoms/badge"
import { JsonPreview } from "@/components/molecules/JsonPreview"
import { formatDate, placeholder } from "@/lib/ui/formatters"
import type {
  EventAttemptStatus,
  EventEnvelopeStatus,
} from "@/lib/vendor/prisma/client"

export const dynamic = "force-dynamic"

const statusVariantMap: Record<
  EventEnvelopeStatus,
  "default" | "secondary" | "outline" | "destructive" | "success"
> = {
  pending: "secondary",
  processing: "outline",
  retrying: "default",
  completed: "success",
  dead_letter: "destructive",
}

const attemptVariantMap: Record<
  EventAttemptStatus,
  "success" | "destructive" | "secondary"
> = {
  succeeded: "success",
  failed: "destructive",
  timed_out: "secondary",
}

function formatRelative(value: Date | string | null | undefined) {
  if (!value) return placeholder()
  const date = typeof value === "string" ? new Date(value) : value
  return (
    <span className="text-sm text-muted-foreground">
      {formatDistanceToNow(date, { addSuffix: true })}
    </span>
  )
}

function formatDuration(ms?: number | null) {
  if (!ms || ms <= 0) return "—"
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

export default async function EventEnvelopePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  if (!id) {
    redirect(adminPath("operations", "events"))
  }

  const envelope = await getEventEnvelopeDetail(id)
  if (!envelope) {
    redirect(adminPath("operations", "events"))
  }

  const pendingHandlers = envelope.pendingHandlers.length
  const totalHandlers = envelope.asyncHandlers.length

  const overview = [
    {
      label: "Status",
      value: (
        <Badge
          variant={
            statusVariantMap[envelope.status as EventEnvelopeStatus]
          }
        >
          {envelope.status.replace(/_/g, " ")}
        </Badge>
      ),
    },
    {
      label: "Queue",
      value: (
        <Badge variant="outline" className="font-mono text-[11px] uppercase">
          {envelope.queue}
        </Badge>
      ),
    },
    {
      label: "Attempts",
      value: (
        <span className="text-sm text-foreground">{envelope.attempts}</span>
      ),
    },
    {
      label: "Pending handlers",
      value: (
        <span className="text-sm text-muted-foreground">
          {pendingHandlers}/{totalHandlers}
        </span>
      ),
    },
    {
      label: "Enqueued",
      value: formatDate(envelope.enqueuedAt),
    },
    {
      label: "Processing started",
      value: envelope.processingStarted
        ? formatDate(envelope.processingStarted)
        : placeholder(),
    },
    {
      label: "Processed",
      value: envelope.processedAt
        ? formatDate(envelope.processedAt)
        : placeholder(),
    },
    {
      label: "Last updated",
      value: formatDate(envelope.updatedAt),
    },
    {
      label: "Last error",
      value: envelope.lastError ? (
        <span className="break-words text-xs text-rose-500">
          {envelope.lastError}
        </span>
      ) : (
        placeholder()
      ),
    },
  ]

  const relationships = (
    <>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-muted-foreground">
              Handlers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="flex flex-wrap gap-2">
              {envelope.asyncHandlers.map((handler: string) => {
                const isPending = envelope.pendingHandlers.includes(handler)
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
            <div className="text-xs text-muted-foreground">
              Pending handlers: {pendingHandlers} / {totalHandlers}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-muted-foreground">
              Payload
            </CardTitle>
          </CardHeader>
          <CardContent>
            <JsonPreview value={envelope.payload ?? {}} maxHeight={360} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-muted-foreground">
            Recent attempts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {envelope.attemptsLog.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No attempts recorded.
            </p>
          ) : (
            <div className="space-y-3 text-sm">
              {envelope.attemptsLog.map((attempt: AttemptLogEntry) => (
                <div
                  key={attempt.id}
                  className="rounded-lg border border-slate-200/70 bg-white/80 p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Badge variant={attemptVariantMap[attempt.status]}>
                      {attempt.status.replace(/_/g, " ")}
                    </Badge>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      Attempt #{attempt.attempt}
                    </span>
                    {formatRelative(attempt.createdAt)}
                  </div>
                  <div className="mt-2 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                    <p>
                      <span className="font-medium text-slate-900">
                        Handler:
                      </span>{" "}
                      {attempt.handler}
                    </p>
                    <p>
                      <span className="font-medium text-slate-900">
                        Duration:
                      </span>{" "}
                      {formatDuration(attempt.durationMs)}
                    </p>
                    <p>
                      <span className="font-medium text-slate-900">Error:</span>{" "}
                      {attempt.error || "—"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )

  return (
    <ObjectPageLayout
      heading={{
        id: envelope.id,
        title: envelope.event,
        createdAt: envelope.enqueuedAt,
        updatedAt: envelope.updatedAt,
      }}
      overview={overview}
      basePath="admin/operations/events"
      deletable
      relationships={relationships}
    />
  )
}
type AttemptLogEntry = {
  id: string
  handler: string
  status: EventAttemptStatus
  durationMs: number | null
  error: string | null
  createdAt: Date
  attempt: number
}

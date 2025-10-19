import { notFound } from "next/navigation"
import { formatDistanceToNow } from "date-fns"

import {
  getEventEnvelopeDetail,
  requeueEnvelopeAction,
  deleteEnvelopeAction,
} from "@/actions/admin/events/actions"
import { Badge } from "@/components/atoms/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/atoms/card"
import { Separator } from "@/components/atoms/separator"
import { Button } from "@/components/atoms/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/atoms/table"
import type {
  EventAttemptStatus,
  EventEnvelopeStatus,
} from "@/lib/vendor/prisma/client"

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

function formatRelative(date?: Date | null) {
  if (!date) return "—"
  return formatDistanceToNow(date, { addSuffix: true })
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const envelope = await getEventEnvelopeDetail(id)

  if (!envelope) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          {envelope.event}
        </h1>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span className="font-mono text-[11px] text-slate-500">{envelope.id}</span>
          <Separator orientation="vertical" className="h-3" />
          <span>Enqueued {formatRelative(envelope.enqueuedAt)}</span>
          <Separator orientation="vertical" className="h-3" />
          <Badge variant={statusVariantMap[envelope.status]}>
            {envelope.status.replace(/_/g, " ")}
          </Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold text-slate-900">
            Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Attempts
              </div>
              <div className="text-lg font-semibold text-slate-900">
                {envelope.attempts}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Pending handlers
              </div>
              <div className="text-lg font-semibold text-slate-900">
                {envelope.pendingHandlers.length}/{envelope.asyncHandlers.length}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Processing started
              </div>
              <div className="text-sm text-muted-foreground">
                {formatRelative(envelope.processingStarted)}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Processed at
              </div>
              <div className="text-sm text-muted-foreground">
                {formatRelative(envelope.processedAt)}
              </div>
            </div>
          </div>

          {envelope.lastError ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50/70 p-4 text-sm text-rose-700">
              <div className="text-xs font-semibold uppercase tracking-wide text-rose-600/80">
                Last error
              </div>
              <p className="mt-1 whitespace-pre-wrap break-words">
                {envelope.lastError}
              </p>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <form action={requeueEnvelopeAction}>
              <input type="hidden" name="envelopeId" value={envelope.id} />
              <Button variant="outline">Requeue</Button>
            </form>
            <form action={deleteEnvelopeAction}>
              <input type="hidden" name="envelopeId" value={envelope.id} />
              <Button variant="destructive">Delete</Button>
            </form>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold text-slate-900">
            Payload
          </CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto rounded-lg border bg-slate-950/80 p-4 text-[12px] leading-relaxed text-slate-100">
            {JSON.stringify(envelope.payload, null, 2)}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold text-slate-900">
            Attempt log
          </CardTitle>
        </CardHeader>
        <CardContent>
          {envelope.attemptsLog.length === 0 ? (
            <p className="text-sm text-muted-foreground">No attempts recorded yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Attempt</TableHead>
                  <TableHead>Handler</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Recorded</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {envelope.attemptsLog.map((attempt) => (
                  <TableRow key={attempt.id}>
                    <TableCell>{attempt.attempt}</TableCell>
                    <TableCell className="font-mono text-[12px]">
                      {attempt.handler}
                    </TableCell>
                    <TableCell>
                      <Badge variant={attemptVariantMap[attempt.status]}>
                        {attempt.status.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {typeof attempt.durationMs === "number"
                        ? `${attempt.durationMs} ms`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatRelative(attempt.createdAt)}
                    </TableCell>
                    <TableCell className="text-xs text-rose-600">
                      {attempt.error ? (
                        <span className="line-clamp-3 break-words">
                          {attempt.error}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

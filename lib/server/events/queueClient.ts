import prisma from "@/lib/prisma"
import {
  coerceEventQueue,
  DEFAULT_EVENT_QUEUE,
  type EventQueueName,
} from "@/lib/server/events/queues"
import {
  enqueueEventEnvelopeJob,
  type EnqueueEventEnvelopeJobOptions,
} from "@/lib/server/jobs/eventQueue"
import { EVENT_ENVELOPE_PROCESSING_STALE_MS } from "@/lib/server/events/timing"

const CLAIMABLE_STATUSES = ["pending", "retrying"] as const

export async function enqueueEvent(
  envelopeId: string,
  queue: EventQueueName,
  options: EnqueueEventEnvelopeJobOptions = {},
): Promise<void> {
  const now = new Date()
  await prisma.$executeRaw`
    UPDATE "EventEnvelope"
    SET "nextRunAt" = ${now},
        "updatedAt" = ${now}
    WHERE "id" = ${envelopeId}
      AND "status" = ${"pending"}::"EventEnvelopeStatus"
  `

  await enqueueEventEnvelopeJob({ envelopeId, queue }, options)
}

export type ReconcileDueEventEnvelopeJobsResult = {
  attempted: number
  enqueued: number
  failed: number
}

export async function reconcileDueEventEnvelopeJobs(
  batchSize: number = 100,
): Promise<ReconcileDueEventEnvelopeJobsResult> {
  const now = new Date()
  const staleProcessingBefore = new Date(
    now.getTime() - EVENT_ENVELOPE_PROCESSING_STALE_MS,
  )
  const rows = await prisma.$queryRaw<Array<{ id: string; queue: string }>>`
    SELECT "id", "queue"
    FROM "EventEnvelope"
    WHERE (
        "status" = ANY (${CLAIMABLE_STATUSES}::"EventEnvelopeStatus"[])
        AND ("nextRunAt" IS NULL OR "nextRunAt" <= ${now})
      )
      OR (
        "status" = ${"processing"}::"EventEnvelopeStatus"
        AND (
          "processingStarted" IS NULL
          OR "processingStarted" <= ${staleProcessingBefore}
        )
      )
    ORDER BY "nextRunAt" NULLS FIRST, "createdAt"
    LIMIT ${batchSize}
  `

  let enqueued = 0
  let failed = 0

  for (const row of rows) {
    try {
      await enqueueEventEnvelopeJob(
        {
          envelopeId: row.id,
          queue: coerceEventQueue(row.queue) ?? DEFAULT_EVENT_QUEUE,
        },
        { replaceExisting: true },
      )
      enqueued += 1
    } catch (error) {
      failed += 1
      console.error("[events] failed to reconcile envelope job", {
        envelopeId: row.id,
        error,
      })
    }
  }

  return {
    attempted: rows.length,
    enqueued,
    failed,
  }
}

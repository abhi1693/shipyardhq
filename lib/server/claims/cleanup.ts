import { addMinutes } from "date-fns"

import prisma from "@/lib/prisma"
import { APP_EVENTS } from "@/lib/server/events/constants"
import { registerEventHandler } from "@/lib/server/events"
import type { EventQueueName } from "@/lib/server/events/queues"
import { enqueueEventEnvelopeJob } from "@/lib/server/jobs/eventQueue"
import type { EventEnvelopeStatus } from "@/lib/vendor/prisma/client"

const HANDLER_ID = "claims.cleanup-attempts"
const QUEUE: EventQueueName = "low"
const RUN_INTERVAL_MINUTES = 30
const ACTIVE_CLEANUP_STATUSES: EventEnvelopeStatus[] = [
  "pending",
  "processing",
  "retrying",
]

type CleanupPayloadMetadata = {
  readonly __envelopeId?: string
}

async function scheduleNextRun(notBefore: Date, currentEnvelopeId?: string) {
  const existing = await prisma.eventEnvelope.findFirst({
    where: {
      event: APP_EVENTS.CLAIM_ATTEMPTS_CLEANUP,
      queue: QUEUE,
      // If any envelope is still pending/processing/retrying (even overdue), don't enqueue another.
      status: { in: ACTIVE_CLEANUP_STATUSES },
      ...(currentEnvelopeId ? { NOT: { id: currentEnvelopeId } } : {}),
    },
  })
  if (existing) return

  const envelope = await prisma.eventEnvelope.create({
    data: {
      event: APP_EVENTS.CLAIM_ATTEMPTS_CLEANUP,
      payload: {},
      asyncHandlers: [HANDLER_ID],
      pendingHandlers: [HANDLER_ID],
      queue: QUEUE,
      nextRunAt: notBefore,
    },
    select: {
      id: true,
    },
  })

  try {
    await enqueueEventEnvelopeJob(
      {
        envelopeId: envelope.id,
        queue: QUEUE,
      },
      {
        delayMs: Math.max(0, notBefore.getTime() - Date.now()),
      },
    )
  } catch (error) {
    await prisma.eventEnvelope
      .delete({ where: { id: envelope.id } })
      .catch((deleteError) => {
        console.error(
          "[claims.cleanup] failed to remove unscheduled envelope",
          {
            envelopeId: envelope.id,
            error: deleteError,
          },
        )
      })
    throw error
  }
}

async function scheduleNextRunSafely(
  notBefore: Date,
  currentEnvelopeId?: string,
) {
  try {
    await scheduleNextRun(notBefore, currentEnvelopeId)
  } catch (error) {
    console.error("[claims.cleanup] failed to schedule next run", { error })
  }
}

async function scheduleInitialRun() {
  try {
    await scheduleNextRun(new Date())
  } catch (error) {
    console.error("[claims.cleanup] failed to schedule initial run", { error })
  }
}

async function rescheduleAfterCleanup(now: Date, currentEnvelopeId?: string) {
  await scheduleNextRunSafely(
    addMinutes(now, RUN_INTERVAL_MINUTES),
    currentEnvelopeId,
  )
}

registerEventHandler({
  event: APP_EVENTS.CLAIM_ATTEMPTS_CLEANUP,
  id: HANDLER_ID,
  mode: "async",
  queue: QUEUE,
  handler: async (payload) => {
    const now = new Date()
    const cutoff = now
    const currentEnvelopeId = (payload as CleanupPayloadMetadata).__envelopeId

    const result = await prisma.productClaimAttempt.deleteMany({
      where: {
        OR: [
          { status: { in: ["expired", "fulfilled"] } },
          { otpExpiresAt: { lt: cutoff } },
        ],
      },
    })

    console.info("[claims.cleanup] deleted claim attempts", {
      count: result.count,
    })

    await rescheduleAfterCleanup(now, currentEnvelopeId)
  },
})

if (
  process.env.NEXT_PHASE !== "phase-production-build" &&
  process.env.SHIPYARD_DISABLE_STARTUP_JOBS !== "1"
) {
  // Kick off the first scheduled run if none exists.
  void scheduleInitialRun()
}

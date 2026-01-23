import {
  dequeueEnvelopeBatch,
  MAX_BATCH_SIZE,
  requeueEnvelope,
} from "@/lib/server/events/queueClient"
import { processEnvelope } from "@/lib/server/events/worker"
import {
  DEFAULT_EVENT_QUEUE,
  type EventQueueName,
} from "@/lib/server/events/queues"

export type DrainEventQueueOptions = {
  maxEvents?: number
  maxDurationMs?: number
  gracePeriodMs?: number
  now?: () => number
  queue?: EventQueueName
}

export type DrainEventQueueResult = {
  processed: number
  failed: number
  attempted: number
  pulled: number
  batches: number
  durationMs: number
  queue: EventQueueName
  limitHit: {
    events: boolean
    duration: boolean
  }
}

const DEFAULT_MAX_EVENTS = 500
const DEFAULT_MAX_DURATION_MS = 15 * 60 * 1000
const DEFAULT_DURATION_GRACE_MS = 30 * 1000

async function requeueRemaining(
  envelopeIds: string[],
  startIndex: number,
): Promise<number> {
  let requeued = 0

  for (let index = envelopeIds.length - 1; index >= startIndex; index -= 1) {
    const envelopeId = envelopeIds[index]
    try {
      await requeueEnvelope(envelopeId)
      requeued += 1
    } catch (error) {
      console.error("[events] drain requeue leftover failed", {
        envelopeId,
        error,
      })
    }
  }

  return requeued
}

export async function drainEventQueue(
  options: DrainEventQueueOptions = {},
): Promise<DrainEventQueueResult> {
  const isVercel = Boolean(process.env.VERCEL)
  const maxEvents = options.maxEvents ?? DEFAULT_MAX_EVENTS
  const configuredMaxDurationMs =
    options.maxDurationMs ?? DEFAULT_MAX_DURATION_MS
  const gracePeriodMs = options.gracePeriodMs ?? DEFAULT_DURATION_GRACE_MS
  // Cap duration/events on Vercel to stay under the 60s execution window.
  const effectiveMaxDurationMs = isVercel
    ? Math.min(configuredMaxDurationMs, 50_000)
    : configuredMaxDurationMs
  const effectiveMaxEvents = isVercel ? Math.min(maxEvents, 200) : maxEvents
  const maxDurationMs = Math.max(0, effectiveMaxDurationMs - gracePeriodMs)
  const getNow = options.now ?? Date.now
  const queue = options.queue ?? DEFAULT_EVENT_QUEUE
  const startedAt = getNow()

  let processed = 0
  let failed = 0
  let attempted = 0
  let pulled = 0
  let batches = 0
  let durationExceeded = false
  let eventLimitReached = false

  while (true) {
    if (attempted >= effectiveMaxEvents) {
      eventLimitReached = true
      break
    }

    const elapsedBeforeBatch = getNow() - startedAt
    if (elapsedBeforeBatch >= maxDurationMs) {
      durationExceeded = true
      break
    }

    const remainingEvents = Math.max(0, effectiveMaxEvents - attempted)
    if (remainingEvents <= 0) {
      eventLimitReached = true
      break
    }

    const batchSize = Math.min(MAX_BATCH_SIZE, remainingEvents)
    const envelopeIds = await dequeueEnvelopeBatch(queue, batchSize)
    if (envelopeIds.length === 0) break

    batches += 1
    pulled += envelopeIds.length

    for (let index = 0; index < envelopeIds.length; index += 1) {
      const envelopeId = envelopeIds[index]
      try {
        await processEnvelope(envelopeId)
        processed += 1
      } catch (error) {
        failed += 1
        console.error("[events] drain failure", { envelopeId, error })
        await requeueEnvelope(envelopeId)
      }

      attempted += 1

      const elapsed = getNow() - startedAt
      const hitDurationLimit = elapsed >= maxDurationMs
      const hitEventLimit = attempted >= effectiveMaxEvents

      if (hitDurationLimit || hitEventLimit) {
        if (hitDurationLimit) durationExceeded = true
        if (hitEventLimit) eventLimitReached = true

        const nextIndex = index + 1
        if (nextIndex < envelopeIds.length) {
          const requeued = await requeueRemaining(envelopeIds, nextIndex)
          pulled -= requeued
        }
        break
      }
    }

    if (durationExceeded || eventLimitReached) {
      break
    }
  }

  const durationMs = getNow() - startedAt

  return {
    processed,
    failed,
    attempted,
    pulled,
    batches,
    durationMs,
    queue,
    limitHit: {
      events: eventLimitReached || attempted >= effectiveMaxEvents,
      duration: durationExceeded || durationMs >= maxDurationMs,
    },
  }
}

import {
  dequeueEnvelopeBatch,
  MAX_BATCH_SIZE,
  requeueEnvelope,
} from "@/lib/server/events/queueClient"
import { processEnvelope } from "@/lib/server/events/worker"

export type DrainEventQueueOptions = {
  maxEvents?: number
  maxDurationMs?: number
  gracePeriodMs?: number
  now?: () => number
}

export type DrainEventQueueResult = {
  processed: number
  failed: number
  attempted: number
  pulled: number
  batches: number
  durationMs: number
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
  const maxEvents = options.maxEvents ?? DEFAULT_MAX_EVENTS
  const configuredMaxDurationMs =
    options.maxDurationMs ?? DEFAULT_MAX_DURATION_MS
  const gracePeriodMs = options.gracePeriodMs ?? DEFAULT_DURATION_GRACE_MS
  const maxDurationMs = Math.max(0, configuredMaxDurationMs - gracePeriodMs)
  const getNow = options.now ?? Date.now
  const startedAt = getNow()

  let processed = 0
  let failed = 0
  let attempted = 0
  let pulled = 0
  let batches = 0
  let durationExceeded = false
  let eventLimitReached = false

  while (true) {
    if (attempted >= maxEvents) {
      eventLimitReached = true
      break
    }

    const elapsedBeforeBatch = getNow() - startedAt
    if (elapsedBeforeBatch >= maxDurationMs) {
      durationExceeded = true
      break
    }

    const remainingEvents = Math.max(0, maxEvents - attempted)
    if (remainingEvents <= 0) {
      eventLimitReached = true
      break
    }

    const batchSize = Math.min(MAX_BATCH_SIZE, remainingEvents)
    const envelopeIds = await dequeueEnvelopeBatch(batchSize)
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
      const hitEventLimit = attempted >= maxEvents

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
    limitHit: {
      events: eventLimitReached || attempted >= maxEvents,
      duration: durationExceeded || durationMs >= maxDurationMs,
    },
  }
}

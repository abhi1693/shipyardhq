import { Queue, type JobsOptions } from "bullmq"

import type { EventQueueName } from "@/lib/server/events/queues"
import {
  createBullMqConnection,
  getBullMqPrefix,
} from "@/lib/server/jobs/connection"

export const EVENT_ENVELOPE_QUEUE_NAME = "shipyardhq-events"
export const EVENT_ENVELOPE_JOB_NAME = "event-envelope"

export type EventEnvelopeJobData = {
  envelopeId: string
  queue: EventQueueName
}

export type EnqueueEventEnvelopeJobOptions = {
  delayMs?: number
  replaceExisting?: boolean
}

const EVENT_JOB_ATTEMPTS = 5
const EVENT_JOB_RETRY_DELAY_MS = 30 * 1000

const globalForEventQueue = globalThis as unknown as {
  __shipyardEventEnvelopeQueue?: Queue<
    EventEnvelopeJobData,
    void,
    typeof EVENT_ENVELOPE_JOB_NAME
  >
}

const EVENT_QUEUE_PRIORITIES: Record<EventQueueName, number> = {
  high: 1,
  default: 5,
  low: 10,
}

export function getEventEnvelopeQueue(): Queue<
  EventEnvelopeJobData,
  void,
  typeof EVENT_ENVELOPE_JOB_NAME
> {
  if (!globalForEventQueue.__shipyardEventEnvelopeQueue) {
    globalForEventQueue.__shipyardEventEnvelopeQueue = new Queue(
      EVENT_ENVELOPE_QUEUE_NAME,
      {
        connection: createBullMqConnection("producer"),
        defaultJobOptions: {
          attempts: EVENT_JOB_ATTEMPTS,
          backoff: {
            type: "fixed",
            delay: EVENT_JOB_RETRY_DELAY_MS,
          },
          removeOnComplete: {
            age: 24 * 60 * 60,
            count: 1_000,
          },
          removeOnFail: {
            age: 7 * 24 * 60 * 60,
            count: 5_000,
          },
        },
        prefix: getBullMqPrefix(),
      },
    )
  }

  return globalForEventQueue.__shipyardEventEnvelopeQueue
}

export async function enqueueEventEnvelopeJob(
  data: EventEnvelopeJobData,
  options: EnqueueEventEnvelopeJobOptions = {},
): Promise<void> {
  const queue = getEventEnvelopeQueue()
  const jobId = getEventEnvelopeJobId(data.envelopeId)
  if (options.replaceExisting) {
    await removeExistingEventEnvelopeJob(queue, jobId)
  }

  await queue.add(EVENT_ENVELOPE_JOB_NAME, data, {
    delay: options.delayMs,
    jobId,
    priority: EVENT_QUEUE_PRIORITIES[data.queue],
  } satisfies JobsOptions)
}

function getEventEnvelopeJobId(envelopeId: string): string {
  return `event-envelope-${envelopeId}`
}

async function removeExistingEventEnvelopeJob(
  queue: Queue<EventEnvelopeJobData, void, typeof EVENT_ENVELOPE_JOB_NAME>,
  jobId: string,
): Promise<void> {
  const existingJob = await queue.getJob(jobId)
  if (!existingJob) return

  const state = await existingJob.getState()
  if (state === "active") {
    throw new Error(`Cannot replace active BullMQ event job "${jobId}"`)
  }

  await existingJob.remove()
}

export async function closeEventEnvelopeQueue(): Promise<void> {
  const queue = globalForEventQueue.__shipyardEventEnvelopeQueue
  if (!queue) return
  globalForEventQueue.__shipyardEventEnvelopeQueue = undefined
  await queue.close()
}

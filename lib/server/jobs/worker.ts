import { Job, Worker } from "bullmq"

import { ensureEventHandlersRegistered } from "@/lib/server/events"
import { processEnvelope } from "@/lib/server/events/worker"
import { reconcileDueEventEnvelopeJobs } from "@/lib/server/events/queueClient"
import { EVENT_ENVELOPE_PROCESSING_STALE_MS } from "@/lib/server/events/timing"
import {
  createBullMqConnection,
  getBullMqPrefix,
} from "@/lib/server/jobs/connection"
import { runScheduledCronJob } from "@/lib/server/jobs/cronRunner"
import {
  EVENT_ENVELOPE_JOB_NAME,
  EVENT_ENVELOPE_QUEUE_NAME,
  closeEventEnvelopeQueue,
  type EventEnvelopeJobData,
} from "@/lib/server/jobs/eventQueue"
import {
  SCHEDULED_JOB_NAME,
  SCHEDULED_JOB_QUEUE_NAME,
  closeScheduledJobQueue,
  isScheduledJobName,
  upsertScheduledJobs,
  type ScheduledJobData,
} from "@/lib/server/jobs/scheduled"

export type ShipyardWorkerHandle = {
  close: () => Promise<void>
}

export type StartShipyardWorkerOptions = {
  upsertSchedulers?: boolean
}

const DEFAULT_EVENT_CONCURRENCY = 4
const DEFAULT_SCHEDULED_CONCURRENCY = 1
const DEFAULT_RECONCILE_INTERVAL_MS = 60 * 1000
const WORKER_LOCK_DURATION_MS = EVENT_ENVELOPE_PROCESSING_STALE_MS

export async function startShipyardWorker(
  options: StartShipyardWorkerOptions = {},
): Promise<ShipyardWorkerHandle> {
  const shouldUpsertSchedulers = options.upsertSchedulers ?? true
  await ensureEventHandlersRegistered()

  if (shouldUpsertSchedulers) {
    await upsertScheduledJobs()
  }

  const reconcileTimer = startEventEnvelopeReconciler()

  const eventWorker = new Worker<
    EventEnvelopeJobData,
    void,
    typeof EVENT_ENVELOPE_JOB_NAME
  >(
    EVENT_ENVELOPE_QUEUE_NAME,
    async (job) => {
      assertJobName(job, EVENT_ENVELOPE_JOB_NAME)
      const envelopeId = job.data.envelopeId?.trim()
      if (!envelopeId) {
        throw new Error("Event envelope job is missing envelopeId")
      }

      await processEnvelope(envelopeId)
    },
    {
      concurrency: parsePositiveIntegerEnv(
        "SHIPYARD_EVENT_WORKER_CONCURRENCY",
        DEFAULT_EVENT_CONCURRENCY,
      ),
      connection: createBullMqConnection("worker"),
      lockDuration: WORKER_LOCK_DURATION_MS,
      maxStalledCount: 2,
      prefix: getBullMqPrefix(),
    },
  )

  const scheduledWorker = new Worker<
    ScheduledJobData,
    Awaited<ReturnType<typeof runScheduledCronJob>>,
    string
  >(
    SCHEDULED_JOB_QUEUE_NAME,
    async (job) => {
      assertJobName(job, SCHEDULED_JOB_NAME)
      const jobName = job.data.jobName
      if (!isScheduledJobName(jobName)) {
        throw new Error(`Unsupported scheduled job "${String(jobName)}"`)
      }

      return runScheduledCronJob(jobName)
    },
    {
      concurrency: parsePositiveIntegerEnv(
        "SHIPYARD_SCHEDULED_WORKER_CONCURRENCY",
        DEFAULT_SCHEDULED_CONCURRENCY,
      ),
      connection: createBullMqConnection("worker"),
      lockDuration: WORKER_LOCK_DURATION_MS,
      maxStalledCount: 2,
      prefix: getBullMqPrefix(),
    },
  )

  attachWorkerLogging("events", eventWorker)
  attachWorkerLogging("scheduled", scheduledWorker)

  console.info("[worker] ShipyardHQ BullMQ worker started", {
    eventQueue: EVENT_ENVELOPE_QUEUE_NAME,
    scheduledQueue: SCHEDULED_JOB_QUEUE_NAME,
    upsertSchedulers: shouldUpsertSchedulers,
  })

  return {
    async close() {
      clearInterval(reconcileTimer)
      await Promise.allSettled([
        eventWorker.close(),
        scheduledWorker.close(),
        closeEventEnvelopeQueue(),
        closeScheduledJobQueue(),
      ])
    },
  }
}

function startEventEnvelopeReconciler(): ReturnType<typeof setInterval> {
  const intervalMs = parsePositiveIntegerEnv(
    "SHIPYARD_EVENT_RECONCILE_INTERVAL_MS",
    DEFAULT_RECONCILE_INTERVAL_MS,
  )
  const reconcile = async () => {
    try {
      const result = await reconcileDueEventEnvelopeJobs()
      if (result.attempted > 0 || result.failed > 0) {
        console.info("[worker.events] reconciled due envelopes", result)
      }
    } catch (error) {
      console.error("[worker.events] reconcile failed", error)
    }
  }

  void reconcile()
  const timer = setInterval(() => {
    void reconcile()
  }, intervalMs)
  timer.unref?.()
  return timer
}

function assertJobName<TData, TResult, TName extends string>(
  job: Job<TData, TResult, TName>,
  expectedName: TName,
): void {
  if (job.name !== expectedName) {
    throw new Error(`Unsupported job "${job.name}" in queue "${job.queueName}"`)
  }
}

function attachWorkerLogging<TData, TResult, TName extends string>(
  label: string,
  worker: Worker<TData, TResult, TName>,
) {
  worker.on("completed", (job) => {
    console.info(`[worker.${label}] job completed`, {
      id: job.id,
      name: job.name,
    })
  })

  worker.on("failed", (job, error) => {
    console.error(`[worker.${label}] job failed`, {
      id: job?.id,
      name: job?.name,
      attemptsMade: job?.attemptsMade,
      error,
    })
  })

  worker.on("error", (error) => {
    console.error(`[worker.${label}] worker error`, error)
  })
}

function parsePositiveIntegerEnv(name: string, fallback: number): number {
  const rawValue = process.env[name]?.trim()
  if (!rawValue) return fallback

  const value = Number.parseInt(rawValue, 10)
  return Number.isInteger(value) && value > 0 ? value : fallback
}

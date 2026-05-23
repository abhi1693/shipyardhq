import { randomUUID } from "crypto"

import prisma from "@/lib/prisma"
import {
  ensureEventHandlersRegistered,
  resolveRegisteredHandler,
  type AppEvents,
} from "@/lib/server/events"
import type { Prisma } from "@/lib/vendor/prisma/client"
import type { EventQueueName } from "@/lib/server/events/queues"
import {
  EVENT_ENVELOPE_JOB_TIMEOUT_MS,
  EVENT_ENVELOPE_PROCESSING_STALE_MS,
} from "@/lib/server/events/timing"

const MAX_ATTEMPTS = 5
const RETRY_DELAY_MS = 30 * 1000
const CLAIMABLE_STATUSES = ["pending", "retrying"] as const

type EventEnvelopeRow = {
  id: string
  event: string
  payload: Prisma.JsonValue
  asyncHandlers: string[]
  pendingHandlers: string[]
  status: "pending" | "processing" | "retrying" | "completed" | "dead_letter"
  attempts: number
  lastError: string | null
  enqueuedAt: Date
  processingStarted: Date | null
  processedAt: Date | null
  nextRunAt: Date | null
  createdAt: Date
  updatedAt: Date
  queue: EventQueueName
}

type HandlerOutcome = "succeeded" | "failed" | "timed_out"

class HandlerTimeoutError extends Error {
  constructor(message = "Handler timed out") {
    super(message)
    this.name = "HandlerTimeoutError"
  }
}

export class EnvelopeAlreadyProcessingError extends Error {
  constructor(envelopeId: string) {
    super(`Event envelope "${envelopeId}" is already being processed`)
    this.name = "EnvelopeAlreadyProcessingError"
  }
}

export async function processEnvelope(envelopeId: string): Promise<void> {
  await ensureEventHandlersRegistered()

  const claimTimestamp = new Date()
  const staleProcessingBefore = new Date(
    claimTimestamp.getTime() - EVENT_ENVELOPE_PROCESSING_STALE_MS,
  )
  const envelope = await claimEnvelope(
    envelopeId,
    claimTimestamp,
    staleProcessingBefore,
  )

  if (!envelope) return

  if (envelope.status === "completed" || envelope.status === "dead_letter") {
    console.debug("[events] envelope already handled", {
      envelopeId,
      status: envelope.status,
    })
    return
  }

  const attemptNumber = envelope.attempts

  console.debug("[events] worker processing", {
    envelopeId,
    event: envelope.event,
    attemptNumber,
    pendingHandlers: envelope.pendingHandlers,
    queue: envelope.queue,
  })

  const startTime = Date.now()
  const deadline = startTime + EVENT_ENVELOPE_JOB_TIMEOUT_MS

  let pendingHandlers = [...envelope.pendingHandlers]
  const payload = hydratePayload(envelope.event, envelope.payload)
  attachEnvelopeMetadata(payload, envelope)

  for (const handlerId of pendingHandlers) {
    console.debug("[events] handler execution start", {
      envelopeId,
      event: envelope.event,
      handlerId,
      attemptNumber,
      queue: envelope.queue,
    })
    const remainingMs = deadline - Date.now()
    if (remainingMs <= 0) {
      await recordAttempt(
        envelopeId,
        handlerId,
        attemptNumber,
        "timed_out",
        EVENT_ENVELOPE_JOB_TIMEOUT_MS,
        "Job deadline exceeded before handler execution",
      )
      await scheduleRetry(
        envelopeId,
        attemptNumber,
        "Job deadline exceeded before handler execution",
      )
      console.warn("[events] envelope deadline exceeded", {
        envelopeId,
        event: envelope.event,
        handlerId,
      })
      throw new HandlerTimeoutError(
        "Job deadline exceeded before handler execution",
      )
    }

    const registration = resolveRegisteredHandler(envelope.event, handlerId)
    if (!registration) {
      const errorMessage = `Missing registered handler "${handlerId}" for event "${envelope.event}"`
      await recordAttempt(
        envelopeId,
        handlerId,
        attemptNumber,
        "failed",
        0,
        errorMessage,
      )
      await markDeadLetter(envelopeId, errorMessage)
      console.error("[events] missing handler registration", {
        envelopeId,
        event: envelope.event,
        handlerId,
      })
      return
    }

    const handlerStart = Date.now()
    try {
      await runWithTimeout(
        () => registration.handler(payload as never),
        remainingMs,
      )
      const durationMs = Date.now() - handlerStart
      await recordAttempt(
        envelopeId,
        handlerId,
        attemptNumber,
        "succeeded",
        durationMs,
      )
      console.debug("[events] handler execution success", {
        envelopeId,
        event: envelope.event,
        handlerId,
        durationMs,
        queue: envelope.queue,
      })

      pendingHandlers = pendingHandlers.slice(1)
      await prisma.$executeRaw`
        UPDATE "EventEnvelope"
        SET "pendingHandlers" = ${pendingHandlers},
            "updatedAt" = ${new Date()}
        WHERE "id" = ${envelopeId}
      `
    } catch (error) {
      const isTimeout = error instanceof HandlerTimeoutError
      const status: HandlerOutcome = isTimeout ? "timed_out" : "failed"
      const durationMs = Date.now() - handlerStart
      const errorMessage =
        error instanceof Error ? error.message : String(error)

      await recordAttempt(
        envelopeId,
        handlerId,
        attemptNumber,
        status,
        durationMs,
        errorMessage,
      )

      if (attemptNumber >= MAX_ATTEMPTS) {
        await markDeadLetter(envelopeId, errorMessage)
        return
      }

      await scheduleRetry(envelopeId, attemptNumber, errorMessage)
      console.warn("[events] handler execution failed", {
        envelopeId,
        event: envelope.event,
        handlerId,
        attemptNumber,
        error: errorMessage,
        queue: envelope.queue,
      })
      throw error
    }
  }

  await prisma.$executeRaw`
    UPDATE "EventEnvelope"
    SET "status" = ${"completed"}::"EventEnvelopeStatus",
        "processedAt" = ${new Date()},
        "pendingHandlers" = ${[] as string[]},
        "updatedAt" = ${new Date()}
    WHERE "id" = ${envelopeId}
  `
  console.info("[events] envelope completed", {
    envelopeId,
    event: envelope.event,
    attempts: attemptNumber,
    queue: envelope.queue,
  })
}

async function claimEnvelope(
  envelopeId: string,
  claimTimestamp: Date,
  staleProcessingBefore: Date,
): Promise<EventEnvelopeRow | null> {
  const rows = await prisma.$queryRaw<EventEnvelopeRow[]>`
    UPDATE "EventEnvelope"
    SET "status" = ${"processing"}::"EventEnvelopeStatus",
        "processingStarted" = ${claimTimestamp},
        "attempts" = "attempts" + 1,
        "lastError" = NULL,
        "nextRunAt" = NULL,
        "updatedAt" = ${claimTimestamp}
    WHERE "id" = ${envelopeId}
      AND (
        "status" = ANY (${CLAIMABLE_STATUSES}::"EventEnvelopeStatus"[])
        OR (
          "status" = ${"processing"}::"EventEnvelopeStatus"
          AND (
            "processingStarted" IS NULL
            OR "processingStarted" <= ${staleProcessingBefore}
          )
        )
      )
      AND "attempts" < ${MAX_ATTEMPTS}
    RETURNING
      "id",
      "event",
      "payload",
      "asyncHandlers",
      "pendingHandlers",
      "status",
      "attempts",
      "lastError",
      "enqueuedAt",
      "processingStarted",
      "processedAt",
      "nextRunAt",
      "createdAt",
      "updatedAt",
      "queue"
  `

  const claimed = rows[0]
  if (claimed) return claimed

  const current = await fetchEnvelope(envelopeId)
  if (!current) return null

  if (current.status === "completed" || current.status === "dead_letter") {
    console.debug("[events] envelope already handled", {
      envelopeId,
      status: current.status,
    })
    return null
  }

  if (current.attempts >= MAX_ATTEMPTS) {
    await markDeadLetter(
      envelopeId,
      "Maximum attempt threshold exceeded before processing",
    )
    return null
  }

  if (current.status === "processing") {
    throw new EnvelopeAlreadyProcessingError(envelopeId)
  }

  console.warn("[events] envelope was not claimable", {
    envelopeId,
    status: current.status,
    attempts: current.attempts,
  })
  return null
}

async function fetchEnvelope(
  envelopeId: string,
): Promise<EventEnvelopeRow | null> {
  const rows = await prisma.$queryRaw<EventEnvelopeRow[]>`
    SELECT
      "id",
      "event",
      "payload",
      "asyncHandlers",
      "pendingHandlers",
      "status",
      "attempts",
      "lastError",
      "enqueuedAt",
      "processingStarted",
      "processedAt",
      "nextRunAt",
      "createdAt",
      "updatedAt",
      "queue"
    FROM "EventEnvelope"
    WHERE "id" = ${envelopeId}
    LIMIT 1
  `
  return rows[0] ?? null
}

function attachEnvelopeMetadata(
  payload: AppEvents[keyof AppEvents],
  envelope: EventEnvelopeRow,
): void {
  if (!payload || typeof payload !== "object") return

  try {
    Object.defineProperties(payload as Record<string, unknown>, {
      __enqueuedAt: {
        value: envelope.enqueuedAt,
        enumerable: false,
        configurable: true,
      },
      __envelopeId: {
        value: envelope.id,
        enumerable: false,
        configurable: true,
      },
    })
  } catch (error) {
    console.warn("[events] failed to attach envelope metadata", {
      envelopeId: envelope.id,
      error,
    })
  }
}

async function recordAttempt(
  envelopeId: string,
  handlerId: string,
  attempt: number,
  status: HandlerOutcome,
  durationMs: number,
  errorMessage?: string,
) {
  await prisma.$executeRaw`
    INSERT INTO "EventAttempt" (
      "id",
      "envelopeId",
      "handler",
      "status",
      "durationMs",
      "error",
      "attempt",
      "createdAt"
    )
    VALUES (
      ${randomUUID()},
      ${envelopeId},
      ${handlerId},
      ${status}::"EventAttemptStatus",
      ${durationMs},
      ${errorMessage ?? null},
      ${attempt},
      ${new Date()}
    )
  `
}

async function scheduleRetry(
  envelopeId: string,
  attemptNumber: number,
  errorMessage: string,
) {
  await prisma.$executeRaw`
    UPDATE "EventEnvelope"
    SET "status" = ${"retrying"}::"EventEnvelopeStatus",
        "lastError" = ${errorMessage},
        "nextRunAt" = ${new Date(Date.now() + RETRY_DELAY_MS)},
        "updatedAt" = ${new Date()},
        "attempts" = ${attemptNumber}
    WHERE "id" = ${envelopeId}
  `
  console.info("[events] retry scheduled", {
    envelopeId,
    attemptNumber,
    error: errorMessage,
  })
}

async function markDeadLetter(
  envelopeId: string,
  errorMessage: string,
): Promise<void> {
  await prisma.$executeRaw`
    UPDATE "EventEnvelope"
    SET "status" = ${"dead_letter"}::"EventEnvelopeStatus",
        "lastError" = ${errorMessage},
        "nextRunAt" = NULL,
        "updatedAt" = ${new Date()}
    WHERE "id" = ${envelopeId}
  `
  console.error("[events] envelope dead-lettered", {
    envelopeId,
    error: errorMessage,
  })
}

async function runWithTimeout<T>(
  task: () => PromiseLike<T> | T,
  timeoutMs: number,
): Promise<T> {
  if (timeoutMs <= 0) {
    throw new HandlerTimeoutError("Handler execution timed out before start")
  }

  let timeout: NodeJS.Timeout | undefined

  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeout = setTimeout(() => {
        reject(new HandlerTimeoutError())
      }, timeoutMs).unref?.()
    })
    return await Promise.race([Promise.resolve(task()), timeoutPromise])
  } finally {
    if (timeout) clearTimeout(timeout)
  }
}

function hydratePayload(
  event: string,
  payload: Prisma.JsonValue,
): AppEvents[keyof AppEvents] {
  const data = clonePayload(payload) as Record<string, unknown>

  switch (event) {
    case "product.upvoted":
      return {
        ...data,
        occurredAt: reviveDate(data.occurredAt),
      } as AppEvents[keyof AppEvents]
    case "badge.assigned":
      return {
        ...data,
        expiresAt: data.expiresAt ? reviveDate(data.expiresAt) : null,
      } as AppEvents[keyof AppEvents]
    case "rewards.awarded":
    case "rewards.redeemed":
    case "rewards.adjusted":
    case "rewards.refunded":
      return {
        ...data,
        createdAt: reviveDate(data.createdAt),
      } as AppEvents[keyof AppEvents]
    default:
      return data as AppEvents[keyof AppEvents]
  }
}

function clonePayload(value: Prisma.JsonValue): unknown {
  if (typeof structuredClone === "function") {
    return structuredClone(value)
  }
  return JSON.parse(JSON.stringify(value))
}

function reviveDate(value: unknown): Date {
  if (typeof value === "string" || value instanceof Date) {
    return new Date(value)
  }
  throw new Error("Expected ISO date string when hydrating payload")
}

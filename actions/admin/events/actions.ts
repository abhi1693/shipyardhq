"use server"

import prisma from "@/lib/prisma"
import { checkRole } from "@/lib/roles"
import { adminPath } from "@/lib/routes"
import { revalidatePath } from "next/cache"
import { enqueueEvent } from "@/lib/server/events/queueClient"
import {
  DEFAULT_EVENT_QUEUE,
  EVENT_QUEUE_NAMES,
  isEventQueue,
  type EventQueueName,
} from "@/lib/server/events/queues"
import type { Prisma, EventEnvelopeStatus } from "@/lib/vendor/prisma/client"

const ADMIN_EVENTS_PATH = adminPath("operations", "events")
const ADMIN_EVENTS_ANALYTICS_PATH = adminPath("analytics", "events")

type EventQueueBreakdown = {
  pending: number
  processing: number
  retrying: number
  deadLetter: number
  completed: number
  oldestPendingAt?: Date | null
}

export type EventQueueSummary = {
  pending: number
  processing: number
  retrying: number
  deadLetter: number
  completed: number
  oldestPendingAt?: Date | null
  queues: Record<EventQueueName, EventQueueBreakdown>
}

export type EventStatusTrendPoint = {
  label: string
  pending: number
  processing: number
  retrying: number
  completed: number
  dead_letter: number
}

export type EventTypeTrendPoint = {
  label: string
  [eventName: string]: number | string
}

export type QueueLatencyStat = {
  queue: EventQueueName
  sampleCount: number
  averageMinutes: number
  p50Minutes: number
  p95Minutes: number
}

export type TopEventVolume = {
  event: string
  total: number
}

function startOfDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  )
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setUTCDate(result.getUTCDate() + days)
  return result
}

function formatDayLabel(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export async function getEventQueueSummary(
  days: number = 7,
): Promise<EventQueueSummary> {
  type StatusRow = {
    queue: string
    status: EventEnvelopeStatus
    count: bigint
  }

  type OldestRow = {
    queue: string
    oldest: Date | null
  }

  const nowUtc = new Date()
  const endDay = startOfDay(nowUtc)
  const startDay = addDays(endDay, -Math.max(days - 1, 0))
  const endExclusive = addDays(endDay, 1)

  const statusRowsPromise = prisma.$queryRaw<StatusRow[]>`
    SELECT "queue", "status", COUNT(*)::bigint AS count
    FROM "EventEnvelope"
    WHERE "enqueuedAt" >= ${startDay}
      AND "enqueuedAt" < ${endExclusive}
    GROUP BY "queue", "status"
  `

  const oldestRowsPromise = prisma.$queryRaw<OldestRow[]>`
    SELECT "queue", MIN("enqueuedAt") AS oldest
    FROM "EventEnvelope"
    WHERE "status" = ANY (${["pending", "retrying"]}::"EventEnvelopeStatus"[])
      AND "enqueuedAt" >= ${startDay}
      AND "enqueuedAt" < ${endExclusive}
    GROUP BY "queue"
  `

  const [statusRows, oldestRows] = await Promise.all([
    statusRowsPromise,
    oldestRowsPromise,
  ])

  const createEmptyBreakdown = (): EventQueueBreakdown => ({
    pending: 0,
    processing: 0,
    retrying: 0,
    deadLetter: 0,
    completed: 0,
    oldestPendingAt: null,
  })

  const totals = {
    pending: 0,
    processing: 0,
    retrying: 0,
    deadLetter: 0,
    completed: 0,
  }

  const perQueue = new Map<EventQueueName, EventQueueBreakdown>()
  for (const queue of EVENT_QUEUE_NAMES) {
    perQueue.set(queue, createEmptyBreakdown())
  }

  for (const row of statusRows) {
    if (!isEventQueue(row.queue)) continue
    const queue = row.queue as EventQueueName
    const breakdown = perQueue.get(queue)
    if (!breakdown) continue

    const count = Number(row.count)
    switch (row.status) {
      case "pending":
        breakdown.pending = count
        totals.pending += count
        break
      case "processing":
        breakdown.processing = count
        totals.processing += count
        break
      case "retrying":
        breakdown.retrying = count
        totals.retrying += count
        break
      case "completed":
        breakdown.completed = count
        totals.completed += count
        break
      case "dead_letter":
        breakdown.deadLetter = count
        totals.deadLetter += count
        break
      default:
        break
    }
  }

  let oldestPending: Date | null = null

  for (const row of oldestRows) {
    if (!isEventQueue(row.queue)) continue
    const queue = row.queue as EventQueueName
    const breakdown = perQueue.get(queue)
    if (!breakdown) continue

    const timestamp = row.oldest ? new Date(row.oldest) : null
    breakdown.oldestPendingAt = timestamp

    if (timestamp && (!oldestPending || timestamp < oldestPending)) {
      oldestPending = timestamp
    }
  }

  const queues = Object.fromEntries(
    Array.from(perQueue.entries()).map(([queue, breakdown]) => [
      queue,
      {
        ...breakdown,
        oldestPendingAt: breakdown.oldestPendingAt ?? null,
      },
    ]),
  ) as Record<EventQueueName, EventQueueBreakdown>

  return {
    pending: totals.pending,
    processing: totals.processing,
    retrying: totals.retrying,
    deadLetter: totals.deadLetter,
    completed: totals.completed,
    oldestPendingAt: oldestPending,
    queues,
  }
}

export async function getEventStatusTrend(
  days: number,
): Promise<EventStatusTrendPoint[]> {
  const nowUtc = new Date()
  const endDay = startOfDay(nowUtc)
  const startDay = addDays(endDay, -Math.max(days - 1, 0))
  const endExclusive = addDays(endDay, 1)

  type Row = {
    day: Date
    status: EventEnvelopeStatus
    count: bigint
  }

  const rows = await prisma.$queryRaw<Row[]>`
    SELECT
      date_trunc('day', "enqueuedAt")::date AS day,
      "status",
      COUNT(*)::bigint AS count
    FROM "EventEnvelope"
    WHERE "enqueuedAt" >= ${startDay}::timestamp
      AND "enqueuedAt" < ${endExclusive}::timestamp
    GROUP BY day, "status"
    ORDER BY day ASC
  `

  const byDay = new Map<string, EventStatusTrendPoint>()
  let cursor = new Date(startDay)
  while (cursor <= endDay) {
    const label = formatDayLabel(cursor)
    byDay.set(label, {
      label,
      pending: 0,
      processing: 0,
      retrying: 0,
      completed: 0,
      dead_letter: 0,
    })
    cursor = addDays(cursor, 1)
  }

  for (const row of rows) {
    const label = formatDayLabel(row.day)
    const entry = byDay.get(label)
    if (!entry) continue
    switch (row.status) {
      case "pending":
        entry.pending = Number(row.count)
        break
      case "processing":
        entry.processing = Number(row.count)
        break
      case "retrying":
        entry.retrying = Number(row.count)
        break
      case "completed":
        entry.completed = Number(row.count)
        break
      case "dead_letter":
        entry.dead_letter = Number(row.count)
        break
      default:
        break
    }
  }

  return Array.from(byDay.values())
}

export async function getEventTypeTrend(
  days: number,
  maxSeries = 5,
): Promise<{
  points: EventTypeTrendPoint[]
  series: string[]
}> {
  const nowUtc = new Date()
  const endDay = startOfDay(nowUtc)
  const startDay = addDays(endDay, -Math.max(days - 1, 0))
  const endExclusive = addDays(endDay, 1)

  type TotalRow = {
    event: string
    total: bigint
  }

  type Row = {
    day: Date
    event: string
    count: bigint
  }

  const [totals, rows] = await Promise.all([
    prisma.$queryRaw<TotalRow[]>`
      SELECT "event", COUNT(*)::bigint AS total
      FROM "EventEnvelope"
      WHERE "enqueuedAt" >= ${startDay}::timestamp
        AND "enqueuedAt" < ${endExclusive}::timestamp
      GROUP BY "event"
      ORDER BY total DESC
      LIMIT ${Math.max(maxSeries, 1)}
    `,
    prisma.$queryRaw<Row[]>`
      SELECT
        date_trunc('day', "enqueuedAt")::date AS day,
        "event",
        COUNT(*)::bigint AS count
      FROM "EventEnvelope"
      WHERE "enqueuedAt" >= ${startDay}::timestamp
        AND "enqueuedAt" < ${endExclusive}::timestamp
      GROUP BY day, "event"
      ORDER BY day ASC
    `,
  ])

  const trackedEvents = new Set(totals.map((row) => row.event))
  const series = Array.from(trackedEvents)

  const byDay = new Map<string, EventTypeTrendPoint>()
  let cursor = new Date(startDay)
  while (cursor <= endDay) {
    const label = formatDayLabel(cursor)
    const base: EventTypeTrendPoint = { label }
    for (const event of series) {
      base[event] = 0
    }
    byDay.set(label, base)
    cursor = addDays(cursor, 1)
  }

  for (const row of rows) {
    if (!trackedEvents.has(row.event)) continue
    const label = formatDayLabel(row.day)
    const entry = byDay.get(label)
    if (!entry) continue
    entry[row.event] = Number(row.count)
  }

  return {
    points: Array.from(byDay.values()),
    series,
  }
}

export async function getQueueLatencyStats(
  days: number,
): Promise<Record<EventQueueName, QueueLatencyStat>> {
  const nowUtc = new Date()
  const endDay = startOfDay(nowUtc)
  const startDay = addDays(endDay, -Math.max(days - 1, 0))
  const endExclusive = addDays(endDay, 1)

  type Row = {
    queue: string
    sample_count: bigint
    average_minutes: number | null
    p50_minutes: number | null
    p95_minutes: number | null
  }

  const rows = await prisma.$queryRaw<Row[]>`
    SELECT
      "queue",
      COUNT(*)::bigint AS sample_count,
      AVG(EXTRACT(EPOCH FROM ("processedAt" - "enqueuedAt")) / 60)::double precision AS average_minutes,
      percentile_disc(0.5) WITHIN GROUP (
        ORDER BY EXTRACT(EPOCH FROM ("processedAt" - "enqueuedAt")) / 60
      )::double precision AS p50_minutes,
      percentile_disc(0.95) WITHIN GROUP (
        ORDER BY EXTRACT(EPOCH FROM ("processedAt" - "enqueuedAt")) / 60
      )::double precision AS p95_minutes
    FROM "EventEnvelope"
    WHERE "processedAt" IS NOT NULL
      AND "enqueuedAt" >= ${startDay}::timestamp
      AND "enqueuedAt" < ${endExclusive}::timestamp
    GROUP BY "queue"
  `

  const result = Object.fromEntries(
    EVENT_QUEUE_NAMES.map((queue) => [
      queue,
      {
        queue,
        sampleCount: 0,
        averageMinutes: 0,
        p50Minutes: 0,
        p95Minutes: 0,
      } satisfies QueueLatencyStat,
    ]),
  ) as Record<EventQueueName, QueueLatencyStat>

  const roundMinutes = (value: number) => Math.round(value * 10) / 10

  for (const row of rows) {
    if (!isEventQueue(row.queue)) continue
    const queue = row.queue as EventQueueName
    result[queue] = {
      queue,
      sampleCount: Number(row.sample_count ?? 0),
      averageMinutes: roundMinutes(Number(row.average_minutes ?? 0)),
      p50Minutes: roundMinutes(Number(row.p50_minutes ?? 0)),
      p95Minutes: roundMinutes(Number(row.p95_minutes ?? 0)),
    }
  }

  return result
}

export async function getTopEventVolumes(
  days: number,
  limit = 8,
): Promise<TopEventVolume[]> {
  const nowUtc = new Date()
  const endDay = startOfDay(nowUtc)
  const startDay = addDays(endDay, -Math.max(days - 1, 0))
  const endExclusive = addDays(endDay, 1)

  type Row = {
    event: string
    total: bigint
  }

  const rows = await prisma.$queryRaw<Row[]>`
    SELECT "event", COUNT(*)::bigint AS total
    FROM "EventEnvelope"
    WHERE "enqueuedAt" >= ${startDay}::timestamp
      AND "enqueuedAt" < ${endExclusive}::timestamp
      AND "enqueuedAt" < ${endExclusive}::timestamp
    GROUP BY "event"
    ORDER BY total DESC
    LIMIT ${Math.max(1, limit)}
  `

  return rows.map((row) => ({
    event: row.event,
    total: Number(row.total),
  }))
}

export async function getEventEnvelopesPaginated({
  page = 1,
  pageSize = 25,
  status = "all",
  queue = "all",
}: {
  page?: number
  pageSize?: number
  status?: EventEnvelopeStatus | "all"
  queue?: EventQueueName | "all"
}) {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1
  const safePageSize =
    Number.isFinite(pageSize) && pageSize > 0
      ? Math.min(Math.floor(pageSize), 100)
      : 25
  const skip = (safePage - 1) * safePageSize
  const where: Prisma.EventEnvelopeWhereInput = {}
  if (status && status !== "all") {
    where.status = status
  }
  if (queue && queue !== "all") {
    where.queue = queue
  }

  const [items, total] = await Promise.all([
    prisma.eventEnvelope.findMany({
      where,
      orderBy: { enqueuedAt: "desc" },
      skip,
      take: safePageSize,
      select: {
        id: true,
        event: true,
        status: true,
        attempts: true,
        asyncHandlers: true,
        pendingHandlers: true,
        lastError: true,
        enqueuedAt: true,
        processedAt: true,
        updatedAt: true,
        queue: true,
      },
    }),
    prisma.eventEnvelope.count({ where }),
  ])

  const normalizedItems = items.map((item) => ({
    ...item,
    queue: isEventQueue(item.queue)
      ? (item.queue as EventQueueName)
      : DEFAULT_EVENT_QUEUE,
  }))

  return {
    items: normalizedItems,
    total,
    page: safePage,
    pageSize: safePageSize,
  }
}

export async function getEventEnvelopeDetail(id: string) {
  return prisma.eventEnvelope.findUnique({
    where: { id },
    select: {
      id: true,
      event: true,
      status: true,
      queue: true,
      attempts: true,
      asyncHandlers: true,
      pendingHandlers: true,
      lastError: true,
      payload: true,
      enqueuedAt: true,
      processingStarted: true,
      processedAt: true,
      updatedAt: true,
      attemptsLog: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          handler: true,
          status: true,
          durationMs: true,
          error: true,
          createdAt: true,
          attempt: true,
        },
      },
    },
  })
}

export async function requeueEnvelopeAction(formData: FormData): Promise<void> {
  try {
    const isAdmin = await checkRole("admin")
    if (!isAdmin) {
      throw new Error("Unauthorized")
    }

    const envelopeId = String(formData.get("envelopeId") ?? "").trim()
    if (!envelopeId) {
      throw new Error("Missing envelope id")
    }

    const envelope = await prisma.eventEnvelope.findUnique({
      where: { id: envelopeId },
      select: {
        id: true,
        asyncHandlers: true,
      },
    })

    if (!envelope) {
      throw new Error("Envelope not found")
    }

    await prisma.eventEnvelope.update({
      where: { id: envelopeId },
      data: {
        status: "pending",
        pendingHandlers: envelope.asyncHandlers,
        lastError: null,
        nextRunAt: null,
        processingStarted: null,
        updatedAt: new Date(),
      },
    })

    await enqueueEvent(envelopeId)
    revalidatePath(ADMIN_EVENTS_PATH)
    revalidatePath(ADMIN_EVENTS_ANALYTICS_PATH)
    revalidatePath(adminPath("operations", "events", envelopeId))
  } catch (error) {
    console.error("requeueEnvelopeAction failed", error)
    throw error
  }
}

export async function deleteEnvelopeAction(formData: FormData): Promise<void> {
  try {
    const isAdmin = await checkRole("admin")
    if (!isAdmin) {
      throw new Error("Unauthorized")
    }

    const envelopeId = String(formData.get("envelopeId") ?? "").trim()
    if (!envelopeId) {
      throw new Error("Missing envelope id")
    }

    await prisma.eventEnvelope.delete({ where: { id: envelopeId } })

    revalidatePath(ADMIN_EVENTS_PATH)
    revalidatePath(ADMIN_EVENTS_ANALYTICS_PATH)
    revalidatePath(adminPath("operations", "events", envelopeId))
  } catch (error) {
    console.error("deleteEnvelopeAction failed", error)
    throw error
  }
}

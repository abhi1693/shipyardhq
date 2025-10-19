"use server"

import prisma from "@/lib/prisma"
import { checkRole } from "@/lib/roles"
import { adminPath } from "@/lib/routes"
import { revalidatePath } from "next/cache"
import {
  dequeueEnvelopeBatch,
  enqueueEvent,
  EVENTS_QUEUE_KEY,
  requeueEnvelope,
} from "@/lib/server/events/queueClient"
import { getRedisClient } from "@/lib/server/redis"
import { processEnvelope } from "@/lib/server/events/worker"
import type { EventEnvelopeStatus } from "@/lib/vendor/prisma/client"

const ADMIN_EVENTS_PATH = adminPath("operations", "events")
const ADMIN_EVENTS_LIST_PATH = adminPath("operations", "events", "all")

export type EventQueueSummary = {
  pending: number
  processing: number
  retrying: number
  deadLetter: number
  completed: number
  queueDepth: number
  oldestPendingAt?: Date | null
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

function startOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setUTCDate(result.getUTCDate() + days)
  return result
}

function formatDayLabel(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export async function getEventQueueSummary(): Promise<EventQueueSummary> {
  const [pending, processing, retrying, deadLetter, completed] =
    await Promise.all([
      prisma.eventEnvelope.count({ where: { status: "pending" } }),
      prisma.eventEnvelope.count({ where: { status: "processing" } }),
      prisma.eventEnvelope.count({ where: { status: "retrying" } }),
      prisma.eventEnvelope.count({ where: { status: "dead_letter" } }),
      prisma.eventEnvelope.count({ where: { status: "completed" } }),
    ])

  const oldestPending = await prisma.eventEnvelope.findFirst({
    where: { status: { in: ["pending", "retrying"] } },
    orderBy: { enqueuedAt: "asc" },
    select: { enqueuedAt: true },
  })

  let queueDepth = 0
  try {
    const redis = await getRedisClient()
    queueDepth = redis ? await redis.lLen(EVENTS_QUEUE_KEY) : 0
  } catch (error) {
    console.error("getEventQueueSummary queue depth failed", error)
  }

  return {
    pending,
    processing,
    retrying,
    deadLetter,
    completed,
    queueDepth,
    oldestPendingAt: oldestPending?.enqueuedAt ?? null,
  }
}

export async function getEventStatusTrend(
  days = 30,
): Promise<EventStatusTrendPoint[]> {
  const nowUtc = new Date()
  const endDay = startOfDay(nowUtc)
  const startDay = addDays(endDay, -Math.max(days - 1, 0))

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
    const key = row.status as keyof EventStatusTrendPoint
    if (key in entry) {
      entry[key] = Number(row.count)
    }
  }

  return Array.from(byDay.values())
}

export async function getEventTypeTrend(
  days = 30,
  maxSeries = 5,
): Promise<{
  points: EventTypeTrendPoint[]
  series: string[]
}> {
  const nowUtc = new Date()
  const endDay = startOfDay(nowUtc)
  const startDay = addDays(endDay, -Math.max(days - 1, 0))

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

export async function getRecentEventEnvelopes(limit = 25) {
  return prisma.eventEnvelope.findMany({
    orderBy: { updatedAt: "desc" },
    take: limit,
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
      attemptsLog: {
        orderBy: { createdAt: "desc" },
        take: 5,
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

export async function getEventEnvelopesPaginated({
  page = 1,
  pageSize = 25,
}: {
  page?: number
  pageSize?: number
}) {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1
  const safePageSize = Number.isFinite(pageSize) && pageSize > 0 ? Math.min(Math.floor(pageSize), 100) : 25
  const skip = (safePage - 1) * safePageSize

  const [items, total] = await Promise.all([
    prisma.eventEnvelope.findMany({
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
      },
    }),
    prisma.eventEnvelope.count(),
  ])

  return {
    items,
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

export async function requeueEnvelopeAction(formData: FormData) {
  try {
    const isAdmin = await checkRole("admin")
    if (!isAdmin) {
      return { error: "Unauthorized" }
    }

    const envelopeId = String(formData.get("envelopeId") ?? "").trim()
    if (!envelopeId) {
      return { error: "Missing envelope id" }
    }

    const envelope = await prisma.eventEnvelope.findUnique({
      where: { id: envelopeId },
      select: {
        id: true,
        asyncHandlers: true,
      },
    })

    if (!envelope) {
      return { error: "Envelope not found" }
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
    revalidatePath(ADMIN_EVENTS_LIST_PATH)
    revalidatePath(adminPath("operations", "events", envelopeId))
    return { success: true }
  } catch (error) {
    console.error("requeueEnvelopeAction failed", error)
    return { error: "Unable to requeue envelope" }
  }
}

export async function drainEventQueueAction() {
  try {
    const isAdmin = await checkRole("admin")
    if (!isAdmin) {
      return { error: "Unauthorized" }
    }

    const envelopeIds = await dequeueEnvelopeBatch()
    let processed = 0
    let failed = 0

    for (const id of envelopeIds) {
      try {
        await processEnvelope(id)
        processed += 1
      } catch (error) {
        failed += 1
        console.error("drainEventQueueAction failure", { id, error })
        await requeueEnvelope(id)
      }
    }

    revalidatePath(ADMIN_EVENTS_PATH)
    return { success: true, processed, failed, pulled: envelopeIds.length }
  } catch (error) {
    console.error("drainEventQueueAction failed", error)
    return { error: "Unable to drain event queue" }
  }
}

export async function deleteEnvelopeAction(formData: FormData) {
  try {
    const isAdmin = await checkRole("admin")
    if (!isAdmin) {
      return { error: "Unauthorized" }
    }

    const envelopeId = String(formData.get("envelopeId") ?? "").trim()
    if (!envelopeId) {
      return { error: "Missing envelope id" }
    }

    await prisma.eventEnvelope.delete({ where: { id: envelopeId } })

    revalidatePath(ADMIN_EVENTS_PATH)
    revalidatePath(ADMIN_EVENTS_LIST_PATH)
    revalidatePath(adminPath("operations", "events", envelopeId))

    return { success: true }
  } catch (error) {
    console.error("deleteEnvelopeAction failed", error)
    return { error: "Unable to delete envelope" }
  }
}

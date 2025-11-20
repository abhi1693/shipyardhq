import prisma from "@/lib/prisma"
import type { EventQueueName } from "@/lib/server/events/queues"

export const MAX_BATCH_SIZE = 25

const CLAIMABLE_STATUSES = ["pending", "retrying"] as const

export async function enqueueEvent(envelopeId: string): Promise<void> {
  const now = new Date()
  await prisma.$executeRaw`
    UPDATE "EventEnvelope"
    SET "nextRunAt" = ${now},
        "updatedAt" = ${now}
    WHERE "id" = ${envelopeId}
      AND "status" = ${"pending"}::"EventEnvelopeStatus"
  `
}

export async function dequeueEnvelopeBatch(
  queue: EventQueueName,
  batchSize: number = MAX_BATCH_SIZE,
): Promise<string[]> {
  const now = new Date()
  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT "id"
    FROM "EventEnvelope"
    WHERE "status" = ANY (${CLAIMABLE_STATUSES}::"EventEnvelopeStatus"[])
      AND "queue" = ${queue}
      AND ("nextRunAt" IS NULL OR "nextRunAt" <= ${now})
    ORDER BY "nextRunAt" NULLS FIRST, "createdAt"
    LIMIT ${batchSize}
  `
  return rows.map((row: (typeof rows)[number]) => row.id)
}

export async function requeueEnvelope(envelopeId: string): Promise<void> {
  const now = new Date()
  await prisma.$executeRaw`
    UPDATE "EventEnvelope"
    SET "nextRunAt" = ${now},
        "updatedAt" = ${now}
    WHERE "id" = ${envelopeId}
      AND "status" = ANY (${CLAIMABLE_STATUSES}::"EventEnvelopeStatus"[])
  `
}

import { APP_EVENTS } from "@/lib/server/events/constants"
import { enqueueEventEnvelopeJob } from "@/lib/server/jobs/eventQueue"
import { EventEnvelopeStatus, type Prisma } from "@/lib/vendor/prisma/client"

export const PRODUCT_PLAN_GRANT_BOUNDARY_HANDLER_ID =
  "product-plan-grants.recompute-boundary"

// Give the half-open grant window time to cross even with small clock or queue
// timing differences. The listener also rejects genuinely early delivery.
const BOUNDARY_EXECUTION_GUARD_MS = 1000
const BOUNDARY_QUEUE = "high" as const

type ActiveGrantWindow = {
  startsAt: Date
  expiresAt: Date | null
}

export type ProductPlanGrantBoundaryJob = {
  id: string
  productId: string
  boundaryAt: Date
  scheduledFor: Date
}

export type ProductPlanGrantBoundaryScheduleResult = {
  persisted: number
  jobs: ProductPlanGrantBoundaryJob[]
}

export async function ensureProductPlanGrantBoundaryEvents(
  tx: Prisma.TransactionClient,
  args: {
    productId: string
    grants: readonly ActiveGrantWindow[]
    now: Date
  },
): Promise<ProductPlanGrantBoundaryScheduleResult> {
  const envelopes = collectBoundaryEnvelopes(args)
  if (!envelopes.length) {
    return { persisted: 0, jobs: [] }
  }

  const persisted = await tx.eventEnvelope.createMany({
    data: envelopes.map((envelope) => ({
      id: envelope.id,
      event: APP_EVENTS.PRODUCT_PLAN_GRANT_BOUNDARY,
      payload: {
        productId: args.productId,
        boundaryAt: envelope.boundaryAt.toISOString(),
      },
      asyncHandlers: [PRODUCT_PLAN_GRANT_BOUNDARY_HANDLER_ID],
      pendingHandlers: [PRODUCT_PLAN_GRANT_BOUNDARY_HANDLER_ID],
      status: EventEnvelopeStatus.pending,
      attempts: 0,
      enqueuedAt: args.now,
      queue: BOUNDARY_QUEUE,
      nextRunAt: envelope.scheduledFor,
    })),
    skipDuplicates: true,
  })

  // Queue delivery is deliberately not started here. This function runs in
  // the same transaction as the grant write, and Redis must never be able to
  // hold that transaction open or roll it back. Call
  // enqueueProductPlanGrantBoundaryJobs only after the transaction commits.
  return { persisted: persisted.count, jobs: envelopes }
}

/**
 * Starts best-effort delayed BullMQ delivery without making the committed
 * database write wait for Redis. The Postgres outbox reconciler remains the
 * durable recovery path for any queue failure or interrupted process.
 */
export function enqueueProductPlanGrantBoundaryJobs(
  jobs: readonly ProductPlanGrantBoundaryJob[],
): void {
  const uniqueJobs = [
    ...new Map(jobs.map((job) => [job.id, job] as const)).values(),
  ]
  if (!uniqueJobs.length) return

  void Promise.allSettled(
    uniqueJobs.map((job) =>
      enqueueEventEnvelopeJob(
        { envelopeId: job.id, queue: BOUNDARY_QUEUE },
        {
          delayMs: Math.max(
            BOUNDARY_EXECUTION_GUARD_MS,
            job.scheduledFor.getTime() - Date.now(),
          ),
          replaceExisting: true,
        },
      ),
    ),
  ).then((queueResults) => {
    queueResults.forEach((queueResult, index) => {
      if (queueResult.status !== "rejected") return
      const job = uniqueJobs[index]
      console.warn("[plan-grant.boundary] delayed enqueue failed", {
        productId: job?.productId,
        envelopeId: job?.id,
        error: queueResult.reason,
      })
    })
  })
}

function collectBoundaryEnvelopes(args: {
  productId: string
  grants: readonly ActiveGrantWindow[]
  now: Date
}): ProductPlanGrantBoundaryJob[] {
  const futureBoundaries = new Map<number, Date>()
  const nowTime = args.now.getTime()

  for (const grant of args.grants) {
    if (grant.startsAt.getTime() > nowTime) {
      futureBoundaries.set(grant.startsAt.getTime(), grant.startsAt)
    }
    if (grant.expiresAt && grant.expiresAt.getTime() > nowTime) {
      futureBoundaries.set(grant.expiresAt.getTime(), grant.expiresAt)
    }
  }

  return Array.from(futureBoundaries.values())
    .sort((left, right) => left.getTime() - right.getTime())
    .map((boundaryAt) => ({
      id: boundaryEnvelopeId(args.productId, boundaryAt),
      productId: args.productId,
      boundaryAt,
      scheduledFor: new Date(
        boundaryAt.getTime() + BOUNDARY_EXECUTION_GUARD_MS,
      ),
    }))
}

function boundaryEnvelopeId(productId: string, boundaryAt: Date): string {
  return `product-plan-grant-boundary-${productId}-${boundaryAt.getTime()}`
}

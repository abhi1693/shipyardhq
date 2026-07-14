import prisma from "@/lib/prisma"
import { dodoClient } from "@/lib/dodo"
import {
  PlanType,
  ProductPlanGrantSource,
  ProductPlanGrantStatus,
} from "@/lib/vendor/prisma/client"
import {
  projectEffectiveProductPlanGrant,
  syncDodoSubscriptionGrant,
  UNVERIFIED_SUBSCRIPTION_PLAN_CHANGE_REASON,
} from "@/lib/server/productPlanGrants"
import { refreshProductPlanGrantCachesFromWorker } from "@/lib/server/productPlanGrantCache"
import { enqueueProductPlanGrantBoundaryJobs } from "@/lib/server/productPlanGrantBoundarySchedule"
import { hasVerifiedDodoSubscriptionPlanChangePayment } from "@/lib/server/dodoSubscriptionPayments"
import { reconcileRecentDodoOneTimePayments } from "@/lib/server/dodoOneTimeReconciliation"
import { readMetadataString } from "@/lib/server/subscriptionMetadata"

const MS_PER_SECOND = 1000
const MS_PER_MINUTE = 60 * MS_PER_SECOND
const MS_PER_HOUR = 60 * MS_PER_MINUTE
const MS_PER_DAY = 24 * MS_PER_HOUR
const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active"])
const INACTIVE_SUBSCRIPTION_STATUSES = new Set([
  "pending",
  "cancelled",
  "canceled",
  "expired",
  "failed",
  "on_hold",
  "paused",
])

type DurationDisplay = {
  value: number
  unit: "days" | "hours" | "minutes" | "seconds"
}

function formatDuration(ms: number): DurationDisplay {
  const safeMs = Math.max(0, ms)
  if (safeMs >= MS_PER_DAY) {
    return { value: roundDuration(safeMs / MS_PER_DAY), unit: "days" }
  }
  if (safeMs >= MS_PER_HOUR) {
    return { value: roundDuration(safeMs / MS_PER_HOUR), unit: "hours" }
  }
  if (safeMs >= MS_PER_MINUTE) {
    return { value: roundDuration(safeMs / MS_PER_MINUTE), unit: "minutes" }
  }
  return { value: roundDuration(safeMs / MS_PER_SECOND), unit: "seconds" }
}

function roundDuration(value: number): number {
  return Math.round(value * 100) / 100
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000)
}

export function isPlanExpired(
  assignedAt: Date,
  boostForDays: number,
  now: Date = new Date(),
): boolean {
  if (boostForDays <= 0) return false
  const expiresAt = addDays(assignedAt, boostForDays)
  return expiresAt <= now
}

type ExpiredBoost = {
  productId: string
  productName: string
  planName: string
  boostForDays: number
}

type ExpiredSubscriptionPlan = {
  productId: string
  productName: string
  planName: string
  status: string
  subscriptionId?: string | null
}

type PaidPlanRemaining = {
  productId: string
  productName: string
  planName: string
  boostForDays: number
  priceCents: number
  expiresAt: string
  timeLeftLabel: string
}

function metadataRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

export async function expireBoostedPlans(now: Date = new Date()) {
  const startedAtMs = Date.now()
  const runAt =
    now instanceof Date && !Number.isNaN(now.valueOf())
      ? now.toISOString()
      : undefined
  const nowMs = runAt ? now.getTime() : Date.now()

  console.info("[cron] expire plans start", { runAt })

  const defaultPlan = await prisma.plan.findFirst({
    where: { isDefault: true },
    select: { id: true, boostForDays: true },
  })

  if (!defaultPlan) {
    console.error("[cron] expire plans missing default plan")
    throw new Error("No default plan configured; cannot expire boosts.")
  }

  console.info("[cron] expire plans resolved default plan", {
    defaultPlanId: defaultPlan.id,
    defaultBoostDays: defaultPlan.boostForDays ?? 0,
  })

  const grantSelect = {
    id: true,
    productId: true,
    expiresAt: true,
    product: { select: { name: true } },
    plan: {
      select: { name: true, boostForDays: true, price: true },
    },
  } as const
  const [expiredGrantCandidates, remainingGrantCandidates] = await Promise.all([
    prisma.productPlanGrant.findMany({
      where: {
        status: ProductPlanGrantStatus.active,
        expiresAt: { lte: now },
        plan: { type: PlanType.one_time_price, price: { gt: 0 } },
      },
      select: grantSelect,
    }),
    prisma.productPlanGrant.findMany({
      where: {
        status: ProductPlanGrantStatus.active,
        startsAt: { lte: now },
        expiresAt: { gt: now },
        plan: { type: PlanType.one_time_price, price: { gt: 0 } },
      },
      select: grantSelect,
    }),
  ])

  console.info("[cron] expire plans fetched candidates", {
    count: expiredGrantCandidates.length + remainingGrantCandidates.length,
  })

  const expired: ExpiredBoost[] = expiredGrantCandidates.map((grant) => ({
    productId: grant.productId,
    productName: grant.product.name,
    planName: grant.plan.name,
    boostForDays: grant.plan.boostForDays ?? 0,
  }))
  const paidPlanRemaining: PaidPlanRemaining[] = remainingGrantCandidates
    .filter(
      (grant): grant is typeof grant & { expiresAt: Date } =>
        grant.expiresAt !== null,
    )
    .map((grant) => {
      const timeLeft = formatDuration(
        Math.max(0, grant.expiresAt.getTime() - nowMs),
      )
      return {
        productId: grant.productId,
        productName: grant.product.name,
        planName: grant.plan.name,
        boostForDays: grant.plan.boostForDays ?? 0,
        priceCents: grant.plan.price,
        expiresAt: grant.expiresAt.toISOString(),
        timeLeftLabel: `${timeLeft.value} ${timeLeft.unit}`,
      }
    })
  const evaluation = {
    totalCandidates:
      expiredGrantCandidates.length + remainingGrantCandidates.length,
    expiredCount: expired.length,
    paidPlanRemainingCount: paidPlanRemaining.length,
  }

  console.info("[cron] expire plans evaluation summary", evaluation)
  if (paidPlanRemaining.length) {
    console.info("[cron] expire plans paid plan time left", {
      count: paidPlanRemaining.length,
      plans: paidPlanRemaining,
    })
  }

  if (!expired.length) {
    console.info("[cron] expire plans no boosts to expire", {
      durationMs: Date.now() - startedAtMs,
    })
  } else {
    const productIds = Array.from(
      new Set(expiredGrantCandidates.map((grant) => grant.productId)),
    )
    const updateResult = await prisma.$transaction(async (tx) => {
      const grants = await tx.productPlanGrant.updateMany({
        where: {
          id: { in: expiredGrantCandidates.map((grant) => grant.id) },
          status: ProductPlanGrantStatus.active,
          expiresAt: { lte: now },
        },
        data: { status: ProductPlanGrantStatus.expired },
      })
      const projections = await Promise.all(
        productIds.map((productId) =>
          projectEffectiveProductPlanGrant(tx, productId, now),
        ),
      )
      return {
        grantsExpired: grants.count,
        productsChanged: projections.filter((item) => item.changed).length,
        boundaryJobs: projections.flatMap((item) => item.boundaryJobs),
      }
    })
    enqueueProductPlanGrantBoundaryJobs(updateResult.boundaryJobs)

    console.info("[cron] expire plans reverted boosts", {
      expired: expired.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        planName: item.planName,
        boostForDays: item.boostForDays,
      })),
      grantsExpired: updateResult.grantsExpired,
      productsChanged: updateResult.productsChanged,
      durationMs: Date.now() - startedAtMs,
    })
    await refreshProductPlanGrantCachesFromWorker(productIds, "boosts.expired")
  }

  let recurringResult: Awaited<
    ReturnType<typeof expireInactiveRecurringPlans>
  > = { expired: [], count: 0 }
  const reconciliationErrors: unknown[] = []
  try {
    recurringResult = await expireInactiveRecurringPlans({
      now:
        now instanceof Date && !Number.isNaN(now.valueOf()) ? now : new Date(),
    })
  } catch (error) {
    console.error("[cron] expire plans recurring failed", error)
    reconciliationErrors.push(error)
  }

  let oneTimeReconciliation: Awaited<
    ReturnType<typeof reconcileRecentDodoOneTimePayments>
  > | null = null
  try {
    oneTimeReconciliation = await reconcileRecentDodoOneTimePayments(
      now instanceof Date && !Number.isNaN(now.valueOf()) ? now : new Date(),
    )
  } catch (error) {
    console.error("[cron] expire plans one-time reconciliation failed", error)
    reconciliationErrors.push(error)
  }

  if (recurringResult.count) {
    console.info("[cron] expire plans recurring expired", {
      count: recurringResult.count,
      expired: recurringResult.expired.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        planName: item.planName,
        status: item.status,
        subscriptionId: item.subscriptionId ?? undefined,
      })),
    })
  }

  if (reconciliationErrors.length) {
    throw new AggregateError(
      reconciliationErrors,
      `${reconciliationErrors.length} billing reconciliation operation(s) failed`,
    )
  }

  return {
    expired,
    count: expired.length,
    recurringExpired: recurringResult.expired,
    recurringCount: recurringResult.count,
    oneTimeReconciliation,
  }
}

async function expireInactiveRecurringPlans(args: { now: Date }) {
  const touchedProductIds = new Set<string>()
  const terminalChanges = new Map<
    string,
    { productId: string; status: string; subscriptionId: string }
  >()
  let reconciliationFailures = 0
  const activeSubscriptionGrants = await prisma.productPlanGrant.findMany({
    where: {
      source: ProductPlanGrantSource.dodo_subscription,
      status: ProductPlanGrantStatus.active,
      externalSubscriptionId: { not: null },
    },
    select: { externalSubscriptionId: true },
  })
  const activeSubscriptionIds = new Set(
    activeSubscriptionGrants.flatMap((grant) =>
      grant.externalSubscriptionId ? [grant.externalSubscriptionId] : [],
    ),
  )
  const subscriptionListParams = {
    page_size: 100,
  } satisfies Parameters<typeof dodoClient.subscriptions.list>[0]

  try {
    for await (const listedSubscription of dodoClient.subscriptions.list(
      subscriptionListParams,
    )) {
      const listedStatus = (listedSubscription?.status || "")
        .toString()
        .toLowerCase()
      const listedAsActive = ACTIVE_SUBSCRIPTION_STATUSES.has(listedStatus)
      const metadata = metadataRecord(listedSubscription.metadata)
      const hasProductPlanMetadata = Boolean(
        readMetadataString(metadata, "productId", "product_id") &&
        readMetadataString(metadata, "planId", "plan_id"),
      )
      if (
        !activeSubscriptionIds.has(listedSubscription.subscription_id) &&
        !(listedAsActive && hasProductPlanMetadata)
      ) {
        continue
      }

      try {
        const subscription = await dodoClient.subscriptions.retrieve(
          listedSubscription.subscription_id,
        )
        const providerObservedAt = new Date()
        const status = (subscription?.status || "").toString().toLowerCase()
        const isActive = ACTIVE_SUBSCRIPTION_STATUSES.has(status)
        const isInactive = INACTIVE_SUBSCRIPTION_STATUSES.has(status)
        if (!isActive && !isInactive) continue
        const planChangePaymentSucceeded =
          await hasVerifiedDodoSubscriptionPlanChangePayment({
            subscriptionId: subscription.subscription_id,
            productId: subscription.product_id,
            status: subscription.status,
            metadata: subscription.metadata,
          })
        const reconciliation = await syncDodoSubscriptionGrant(subscription, {
          now: args.now,
          providerObservedAt,
          planChangePaymentSucceeded,
        })
        if (
          reconciliation.outcome === "invalid" ||
          reconciliation.reason === UNVERIFIED_SUBSCRIPTION_PLAN_CHANGE_REASON
        ) {
          reconciliationFailures += 1
          console.error("[cron] subscription reconciliation invalid", {
            subscriptionId: subscription.subscription_id,
            status,
            productId: reconciliation.productId,
            reason: reconciliation.reason,
          })
          continue
        }
        if (reconciliation.productId && reconciliation.outcome !== "ignored") {
          touchedProductIds.add(reconciliation.productId)
        }
        if (
          reconciliation.productId &&
          (reconciliation.grantChanged || reconciliation.projectionChanged)
        ) {
          if (isInactive) {
            terminalChanges.set(subscription.subscription_id, {
              productId: reconciliation.productId,
              status,
              subscriptionId: subscription.subscription_id,
            })
          }
        }
      } catch (error) {
        reconciliationFailures += 1
        console.error("[cron] subscription reconciliation failed", {
          subscriptionId: listedSubscription.subscription_id,
          listedStatus,
          error,
        })
      }
    }
  } catch (error) {
    reconciliationFailures += 1
    console.error("[cron] subscription discovery failed", { error })
  }

  const staleLocalGrants = await prisma.productPlanGrant.findMany({
    where: {
      source: ProductPlanGrantSource.dodo_subscription,
      status: ProductPlanGrantStatus.active,
      expiresAt: { lte: args.now },
      externalSubscriptionId: { not: null },
    },
    select: { id: true, productId: true, externalSubscriptionId: true },
  })
  if (staleLocalGrants.length) {
    const staleProductIds = [
      ...new Set(staleLocalGrants.map((grant) => grant.productId)),
    ]
    const projections = await prisma.$transaction(async (tx) => {
      await tx.productPlanGrant.updateMany({
        where: {
          id: { in: staleLocalGrants.map((grant) => grant.id) },
          status: ProductPlanGrantStatus.active,
          expiresAt: { lte: args.now },
        },
        data: { status: ProductPlanGrantStatus.expired },
      })
      return Promise.all(
        staleProductIds.map((productId) =>
          projectEffectiveProductPlanGrant(tx, productId, args.now),
        ),
      )
    })
    enqueueProductPlanGrantBoundaryJobs(
      projections.flatMap((projection) => projection.boundaryJobs),
    )
    staleProductIds.forEach((productId) => {
      touchedProductIds.add(productId)
    })
    staleLocalGrants.forEach((grant) => {
      if (!grant.externalSubscriptionId) return
      terminalChanges.set(grant.externalSubscriptionId, {
        productId: grant.productId,
        status: "billing_window_expired",
        subscriptionId: grant.externalSubscriptionId,
      })
    })
  }

  if (touchedProductIds.size) {
    try {
      await refreshProductPlanGrantCachesFromWorker(
        [...touchedProductIds],
        "subscriptions.reconciled",
      )
    } catch (error) {
      reconciliationFailures += 1
      console.error("[cron] subscription cache refresh failed", { error })
    }
  }

  if (reconciliationFailures > 0) {
    throw new Error(
      `${reconciliationFailures} subscription reconciliation operation(s) failed`,
    )
  }

  if (!terminalChanges.size) {
    return { expired: [], count: 0 }
  }

  const changedSubscriptionIds = [...terminalChanges.keys()]
  const grants = await prisma.productPlanGrant.findMany({
    where: {
      externalSubscriptionId: { in: changedSubscriptionIds },
    },
    select: {
      externalSubscriptionId: true,
      product: { select: { id: true, name: true } },
      plan: { select: { name: true } },
    },
  })

  const expired: ExpiredSubscriptionPlan[] = grants.flatMap((grant) => {
    const subscriptionId = grant.externalSubscriptionId
    if (!subscriptionId) return []
    const change = terminalChanges.get(subscriptionId)
    if (!change) return []
    return [
      {
        productId: grant.product.id,
        productName: grant.product.name,
        planName: grant.plan.name,
        status: change.status,
        subscriptionId,
      },
    ]
  })

  return { expired, count: expired.length }
}

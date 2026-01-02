import prisma from "@/lib/prisma"
import { dodoClient } from "@/lib/dodo"
import { PlanType } from "@/lib/vendor/prisma/client"

const MS_PER_SECOND = 1000
const MS_PER_MINUTE = 60 * MS_PER_SECOND
const MS_PER_HOUR = 60 * MS_PER_MINUTE
const MS_PER_DAY = 24 * MS_PER_HOUR
const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active"])
const INACTIVE_SUBSCRIPTION_STATUSES = new Set([
  "pending",
  "cancelled",
  "expired",
  "failed",
  "on_hold",
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

function readMetadataString(
  metadata: Record<string, unknown> | null | undefined,
  ...keys: string[]
): string | undefined {
  if (!metadata) return undefined
  for (const key of keys) {
    const raw = metadata[key]
    if (typeof raw === "string" && raw.trim()) {
      return raw.trim()
    }
  }
  return undefined
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

  const defaultBoostDays = defaultPlan.boostForDays ?? 0

  console.info("[cron] expire plans resolved default plan", {
    defaultPlanId: defaultPlan.id,
    defaultBoostDays,
  })

  const candidates = await prisma.product.findMany({
    where: {
      planId: { not: null },
      planAssignedAt: { not: null },
      plan: {
        type: PlanType.one_time_price,
        boostForDays: { gt: defaultBoostDays },
        price: { gt: 0 },
      },
    },
    select: {
      id: true,
      name: true,
      planAssignedAt: true,
      plan: {
        select: {
          boostForDays: true,
          name: true,
          isDefault: true,
          price: true,
        },
      },
    },
  })

  console.info("[cron] expire plans fetched candidates", {
    count: candidates.length,
  })

  const expired: ExpiredBoost[] = []
  const paidPlanRemaining: PaidPlanRemaining[] = []
  const evaluation = {
    totalCandidates: candidates.length,
    expiredCount: 0,
    paidPlanRemainingCount: 0,
    skippedDefaultPlan: 0,
    skippedMissingPlan: 0,
    skippedMissingAssignedAt: 0,
    skippedNotExpired: 0,
  }

  for (const product of candidates) {
    const assignedAt = product.planAssignedAt
    const plan = product.plan
    if (!assignedAt) {
      evaluation.skippedMissingAssignedAt += 1
      continue
    }
    if (!plan) {
      evaluation.skippedMissingPlan += 1
      continue
    }
    if (plan.isDefault) {
      evaluation.skippedDefaultPlan += 1
      continue
    }
    const boostDays = plan.boostForDays ?? 0
    if (!isPlanExpired(assignedAt, boostDays, now)) {
      evaluation.skippedNotExpired += 1
      const priceCents = plan.price ?? 0
      if (priceCents > 0) {
        const expiresAt = addDays(assignedAt, boostDays)
        const timeLeftMs = Math.max(0, expiresAt.getTime() - nowMs)
        const timeLeft = formatDuration(timeLeftMs)
        paidPlanRemaining.push({
          productId: product.id,
          productName: product.name,
          planName: plan.name,
          boostForDays: boostDays,
          priceCents,
          expiresAt: expiresAt.toISOString(),
          timeLeftLabel: `${timeLeft.value} ${timeLeft.unit}`,
        })
        evaluation.paidPlanRemainingCount += 1
      }
      continue
    }
    evaluation.expiredCount += 1
    expired.push({
      productId: product.id,
      productName: product.name,
      planName: plan.name,
      boostForDays: boostDays,
    })
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
    const updateResult = await prisma.product.updateMany({
      where: { id: { in: expired.map((item) => item.productId) } },
      data: { planId: defaultPlan.id, planAssignedAt: null },
    })

    console.info("[cron] expire plans reverted boosts", {
      expired: expired.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        planName: item.planName,
        boostForDays: item.boostForDays,
      })),
      updatedCount: updateResult?.count ?? 0,
      durationMs: Date.now() - startedAtMs,
    })
  }

  let recurringResult: Awaited<ReturnType<typeof expireInactiveRecurringPlans>> =
    { expired: [], count: 0 }
  try {
    recurringResult = await expireInactiveRecurringPlans({
      defaultPlanId: defaultPlan.id,
    })
  } catch (error) {
    console.error("[cron] expire plans recurring failed", error)
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

  return {
    expired,
    count: expired.length,
    recurringExpired: recurringResult.expired,
    recurringCount: recurringResult.count,
  }
}

async function expireInactiveRecurringPlans(args: { defaultPlanId: string }) {
  const recurringPlans = await prisma.plan.findMany({
    where: { type: PlanType.recurring_price },
    select: {
      id: true,
      name: true,
      externalId: true,
      price: true,
      type: true,
      isDefault: true,
    },
  })
  if (!recurringPlans.length) {
    return { expired: [], count: 0 }
  }

  const planById = new Map(recurringPlans.map((plan) => [plan.id, plan]))
  const planIdByExternal: Record<string, string> = {}
  for (const plan of recurringPlans) {
    if (plan.externalId) {
      planIdByExternal[plan.externalId] = plan.id
    }
  }

  const activeByProductId = new Map<string, (typeof recurringPlans)[number]>()
  const inactiveByProductId = new Map<
    string,
    { planId: string; status: string; subscriptionId?: string | null }
  >()

  for await (const subscription of dodoClient.subscriptions.list({
    page_size: 100,
  } as any)) {
    const status = (subscription?.status || "").toString().toLowerCase()
    const isActive = ACTIVE_SUBSCRIPTION_STATUSES.has(status)
    const isInactive = INACTIVE_SUBSCRIPTION_STATUSES.has(status)
    if (!isActive && !isInactive) continue

    const metadata =
      typeof subscription?.metadata === "object" && subscription.metadata
        ? (subscription.metadata as Record<string, unknown>)
        : null
    const productId = readMetadataString(metadata, "productId", "product_id")
    if (!productId) continue

    const planIdFromMeta = readMetadataString(metadata, "planId", "plan_id")
    const productExternalId =
      typeof subscription?.product_id === "string"
        ? subscription.product_id
        : undefined
    const planId =
      planIdFromMeta ||
      (productExternalId ? planIdByExternal[productExternalId] : undefined)
    if (!planId) continue

    const plan = planById.get(planId)
    if (!plan || plan.type !== PlanType.recurring_price) continue

    if (isActive) {
      const existing = activeByProductId.get(productId)
      const planPrice = plan.price ?? 0
      const existingPrice = existing?.price ?? 0
      if (!existing || planPrice > existingPrice) {
        activeByProductId.set(productId, plan)
      }
      continue
    }

    if (!activeByProductId.has(productId)) {
      inactiveByProductId.set(productId, {
        planId,
        status,
        subscriptionId: (subscription as any)?.subscription_id ?? null,
      })
    }
  }

  if (!inactiveByProductId.size) {
    return { expired: [], count: 0 }
  }

  const productIds = Array.from(inactiveByProductId.keys())
  const products = await prisma.product.findMany({
    where: {
      id: { in: productIds },
      plan: { type: PlanType.recurring_price },
    },
    select: {
      id: true,
      name: true,
      planId: true,
      plan: {
        select: {
          id: true,
          name: true,
          type: true,
          isDefault: true,
        },
      },
    },
  })

  const expired: ExpiredSubscriptionPlan[] = []
  const updates: Array<ReturnType<typeof prisma.product.update>> = []

  for (const product of products) {
    if (activeByProductId.has(product.id)) continue
    const plan = product.plan
    const inactive = inactiveByProductId.get(product.id)
    if (!inactive || !plan || plan.isDefault) continue
    if (plan.id !== inactive.planId) continue

    expired.push({
      productId: product.id,
      productName: product.name,
      planName: plan.name,
      status: inactive.status,
      subscriptionId: inactive.subscriptionId,
    })

    updates.push(
      prisma.product.update({
        where: { id: product.id },
        data: { planId: args.defaultPlanId, planAssignedAt: null },
      }),
    )
  }

  if (updates.length) {
    await Promise.all(updates)
  }

  return { expired, count: expired.length }
}

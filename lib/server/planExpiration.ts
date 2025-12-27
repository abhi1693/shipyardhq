import prisma from "@/lib/prisma"

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

type PaidPlanRemaining = {
  productId: string
  productName: string
  planName: string
  boostForDays: number
  priceCents: number
  expiresAt: string
  timeLeftMs: number
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
        paidPlanRemaining.push({
          productId: product.id,
          productName: product.name,
          planName: plan.name,
          boostForDays: boostDays,
          priceCents,
          expiresAt: expiresAt.toISOString(),
          timeLeftMs,
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
    return { expired: [], count: 0 }
  }

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

  return { expired, count: expired.length }
}

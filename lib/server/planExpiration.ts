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

export async function expireBoostedPlans(now: Date = new Date()) {
  const defaultPlan = await prisma.plan.findFirst({
    where: { isDefault: true },
    select: { id: true },
  })

  if (!defaultPlan) {
    throw new Error("No default plan configured; cannot expire boosts.")
  }

  const candidates = await prisma.product.findMany({
    where: {
      planId: { not: null },
      planAssignedAt: { not: null },
      plan: { boostForDays: { gt: 0 } },
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
        },
      },
    },
  })

  const expired: ExpiredBoost[] = []

  for (const product of candidates) {
    const assignedAt = product.planAssignedAt
    const plan = product.plan
    if (!assignedAt || !plan || plan.isDefault) continue
    const boostDays = plan.boostForDays ?? 0
    if (!isPlanExpired(assignedAt, boostDays, now)) continue
    expired.push({
      productId: product.id,
      productName: product.name,
      planName: plan.name,
      boostForDays: boostDays,
    })
  }

  if (!expired.length) {
    return { expired: [], count: 0 }
  }

  await prisma.product.updateMany({
    where: { id: { in: expired.map((item) => item.productId) } },
    data: { planId: defaultPlan.id, planAssignedAt: null },
  })

  return { expired, count: expired.length }
}

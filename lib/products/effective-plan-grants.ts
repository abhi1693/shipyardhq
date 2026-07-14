import { ProductPlanGrantSource } from "@/lib/vendor/prisma/client"

const GRANT_SOURCE_PRIORITY: Record<ProductPlanGrantSource, number> = {
  [ProductPlanGrantSource.dodo_payment]: 4,
  [ProductPlanGrantSource.dodo_subscription]: 4,
  [ProductPlanGrantSource.migration]: 3,
  [ProductPlanGrantSource.admin]: 2,
  [ProductPlanGrantSource.leaderboard]: 1,
}

export type EffectivePlanGrantCandidate = {
  id: string
  source: ProductPlanGrantSource
  startsAt: Date
  createdAt: Date
  plan: { price: number }
}

export function compareEffectivePlanGrants(
  left: EffectivePlanGrantCandidate,
  right: EffectivePlanGrantCandidate,
) {
  const priorityDelta =
    GRANT_SOURCE_PRIORITY[right.source] - GRANT_SOURCE_PRIORITY[left.source]
  if (priorityDelta !== 0) return priorityDelta

  const priceDelta = right.plan.price - left.plan.price
  if (priceDelta !== 0) return priceDelta

  const startsAtDelta = right.startsAt.getTime() - left.startsAt.getTime()
  if (startsAtDelta !== 0) return startsAtDelta

  const createdAtDelta = right.createdAt.getTime() - left.createdAt.getTime()
  if (createdAtDelta !== 0) return createdAtDelta
  return right.id.localeCompare(left.id)
}

export function resolveEffectivePlanGrant<
  T extends EffectivePlanGrantCandidate,
>(grants: readonly T[]): T | undefined {
  return [...grants].sort(compareEffectivePlanGrants)[0]
}

import type { Prisma } from "@/lib/vendor/prisma/client"

export const PAID_PLACEMENT_GRANT_SOURCES = [
  "dodo_payment",
  "dodo_subscription",
] as const

const paidPlacementGrantSources = new Set<string>(PAID_PLACEMENT_GRANT_SOURCES)

export type ProductPlacementGrant = {
  planId: string
  source: string
  status: string
  startsAt: Date
  expiresAt: Date | null
}

export type ProductPlacementGrantRecord = {
  planId: string | null
  planGrants?: readonly ProductPlacementGrant[] | null
}

const buildActiveGrantWindowFilter = (
  planId: string,
  now: Date,
): Prisma.ProductPlanGrantWhereInput => ({
  planId,
  source: { in: [...PAID_PLACEMENT_GRANT_SOURCES] },
  status: "active",
  startsAt: { lte: now },
  OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
})

/**
 * A plan assignment is display metadata; an active grant is the entitlement.
 * Building one branch per plan keeps the product's current plan and the grant's
 * plan equal instead of allowing two different feature-capable plans to match.
 */
export function buildActivePlacementPlanFilter(
  planIds: readonly string[],
  now: Date,
): Prisma.ProductWhereInput {
  if (!planIds.length) {
    return { id: { in: [] } }
  }

  return {
    OR: planIds.map((planId) => ({
      AND: [
        { planId },
        {
          planGrants: {
            some: buildActiveGrantWindowFilter(planId, now),
          },
        },
      ],
    })),
  }
}

export function hasActivePlacementGrant(
  product: ProductPlacementGrantRecord,
  planIds: ReadonlySet<string> | readonly string[],
  now: Date,
): boolean {
  const currentPlanId = product.planId
  if (!currentPlanId) return false

  const planIsEligible =
    "has" in planIds
      ? planIds.has(currentPlanId)
      : planIds.includes(currentPlanId)

  if (!planIsEligible) return false

  const nowTime = now.getTime()
  return Boolean(
    product.planGrants?.some((grant) => {
      if (
        grant.planId !== currentPlanId ||
        !paidPlacementGrantSources.has(grant.source) ||
        grant.status !== "active"
      ) {
        return false
      }

      const startsAt = grant.startsAt.getTime()
      const expiresAt = grant.expiresAt?.getTime()

      return (
        startsAt <= nowTime &&
        (typeof expiresAt === "undefined" || expiresAt > nowTime)
      )
    }),
  )
}

export function buildRegularPlacementPlanFilter(
  planIds: readonly string[],
  now: Date,
): Prisma.ProductWhereInput {
  return planIds.length
    ? { NOT: buildActivePlacementPlanFilter(planIds, now) }
    : {}
}

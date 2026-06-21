import prisma from "@/lib/prisma"
import { applyCache, DEFAULT_TTL, TAGS } from "@/lib/cache"
import { Prisma } from "@/lib/vendor/prisma/client"
import { PRIORITY_FEATURE_KEY } from "@/lib/products/selects"

export const SPONSORED_PLACEMENT_FEATURE_KEYS = [
  PRIORITY_FEATURE_KEY,
  "sponsoredProducts",
] as const

async function getEnabledPlanIdsForFeatureKeys(featureKeys: readonly string[]) {
  const assignments = await prisma.planFeatureAssignment.findMany({
    where: {
      enabled: true,
      feature: { key: { in: [...featureKeys] } },
    },
    select: { planId: true },
  })

  return Array.from(new Set(assignments.map((assignment) => assignment.planId)))
}

export async function getPriorityPlacementPlanIds() {
  "use cache"
  applyCache(
    [
      "products:priority-placement-plan-ids",
      TAGS.plans,
      TAGS.planFeature(PRIORITY_FEATURE_KEY),
    ],
    DEFAULT_TTL.slow,
  )

  return getEnabledPlanIdsForFeatureKeys([PRIORITY_FEATURE_KEY])
}

export async function getSponsoredPlacementPlanIds() {
  "use cache"
  applyCache(
    [
      "products:sponsored-placement-plan-ids",
      TAGS.plans,
      ...SPONSORED_PLACEMENT_FEATURE_KEYS.map((key) => TAGS.planFeature(key)),
    ],
    DEFAULT_TTL.slow,
  )

  return getEnabledPlanIdsForFeatureKeys(SPONSORED_PLACEMENT_FEATURE_KEYS)
}

export function buildPriorityPlanFilter(
  priorityPlanIds: string[],
): Prisma.ProductWhereInput {
  return priorityPlanIds.length
    ? { planId: { in: priorityPlanIds } }
    : { id: { in: [] } }
}

export function buildRegularPlanFilter(
  priorityPlanIds: string[],
): Prisma.ProductWhereInput {
  return priorityPlanIds.length
    ? {
        OR: [{ planId: null }, { planId: { notIn: priorityPlanIds } }],
      }
    : {}
}

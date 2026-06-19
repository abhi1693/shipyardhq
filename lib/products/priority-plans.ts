import prisma from "@/lib/prisma"
import { cached, DEFAULT_TTL, TAGS } from "@/lib/cache"
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

export const getPriorityPlacementPlanIds = cached(
  async () => {
    return getEnabledPlanIdsForFeatureKeys([PRIORITY_FEATURE_KEY])
  },
  "products:priority-placement-plan-ids",
  {
    ttl: DEFAULT_TTL.slow,
    tags: () => [TAGS.plans, TAGS.planFeature(PRIORITY_FEATURE_KEY)],
  },
)

export const getSponsoredPlacementPlanIds = cached(
  async () => {
    return getEnabledPlanIdsForFeatureKeys(SPONSORED_PLACEMENT_FEATURE_KEYS)
  },
  "products:sponsored-placement-plan-ids",
  {
    ttl: DEFAULT_TTL.slow,
    tags: () => [
      TAGS.plans,
      ...SPONSORED_PLACEMENT_FEATURE_KEYS.map((key) => TAGS.planFeature(key)),
    ],
  },
)

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

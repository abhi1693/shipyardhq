import prisma from "@/lib/prisma"
import { cached, DEFAULT_TTL, TAGS } from "@/lib/cache"
import { Prisma } from "@/lib/vendor/prisma/client"
import { PRIORITY_FEATURE_KEY } from "@/lib/products/selects"

export const getPriorityPlacementPlanIds = cached(
  async () => {
    const assignments = await prisma.planFeatureAssignment.findMany({
      where: {
        enabled: true,
        feature: { key: PRIORITY_FEATURE_KEY },
      },
      select: { planId: true },
    })

    return Array.from(
      new Set(assignments.map((assignment) => assignment.planId)),
    )
  },
  "products:priority-placement-plan-ids",
  {
    ttl: DEFAULT_TTL.slow,
    tags: () => [TAGS.plans, TAGS.planFeature(PRIORITY_FEATURE_KEY)],
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

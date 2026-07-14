import prisma from "@/lib/prisma"
import { applyCache, DEFAULT_TTL, TAGS } from "@/lib/cache"
import type { Prisma } from "@/lib/vendor/prisma/client"

const defaultPlanSelect = {
  id: true,
  name: true,
  price: true,
  type: true,
  boostForDays: true,
  isDefault: true,
  assignments: {
    include: {
      feature: true,
    },
  },
} satisfies Prisma.PlanSelect

type PlanFeatureSummary = Prisma.PlanGetPayload<{
  select: typeof defaultPlanSelect
}>

async function getCachedDefaultPlanWithFeatures(): Promise<PlanFeatureSummary | null> {
  "use cache"
  applyCache([TAGS.plans], DEFAULT_TTL.slow)

  return prisma.plan.findFirst({
    where: { isDefault: true },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: defaultPlanSelect,
  })
}

/**
 * Fetch the default plan with feature assignments.
 * Cache the shared fallback independently from product records so free-product
 * metadata and detail reads do not repeat the same plan query.
 */
export async function getDefaultPlanWithFeatures(): Promise<PlanFeatureSummary | null> {
  try {
    return (await getCachedDefaultPlanWithFeatures()) ?? null
  } catch (error) {
    console.error("[plans] failed to load default plan with features", error)
    return null
  }
}

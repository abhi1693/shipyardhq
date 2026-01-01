import prisma from "@/lib/prisma"
import type { Prisma } from "@/lib/vendor/prisma/client"

const defaultPlanSelect = {
  id: true,
  name: true,
  price: true,
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

/**
 * Fetch the default plan with feature assignments.
 * We keep it small and sync to avoid bringing in full client types.
 */
export async function getDefaultPlanWithFeatures(): Promise<PlanFeatureSummary | null> {
  try {
    const plan = await prisma.plan.findFirst({
      where: { isDefault: true },
      select: defaultPlanSelect,
    })
    return plan ?? null
  } catch (error) {
    console.error("[plans] failed to load default plan with features", error)
    return null
  }
}

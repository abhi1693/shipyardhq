import prisma from "@/lib/prisma"

type PlanFeatureSummary = {
  id: string
  name: string
  price: unknown
  isDefault: boolean
  assignments: { enabled: boolean; feature: { key: string | null } | null }[]
}

/**
 * Fetch the default plan with feature assignments.
 * We keep it small and sync to avoid bringing in full client types.
 */
export async function getDefaultPlanWithFeatures(): Promise<
  PlanFeatureSummary | null
> {
  try {
    const plan = await prisma.plan.findFirst({
      where: { isDefault: true },
      select: {
        id: true,
        name: true,
        price: true,
        isDefault: true,
        assignments: {
          select: {
            enabled: true,
            feature: { select: { key: true } },
          },
        },
      },
    })
    return plan ?? null
  } catch (error) {
    console.error("[plans] failed to load default plan with features", error)
    return null
  }
}

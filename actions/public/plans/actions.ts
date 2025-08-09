import prisma from "@/lib/prisma"

export type PublicPlan = Awaited<ReturnType<typeof getPublicPlans>>[number]

export async function getPublicPlans() {
  const [plans, allFeatures] = await Promise.all([
    prisma.plan.findMany({
      orderBy: [{ price: "asc" }],
      include: {
        assignments: {
          include: {
            feature: true,
          },
        },
        _count: { select: { products: true } },
      },
    }),
    prisma.planFeature.findMany({ orderBy: { name: "asc" } }),
  ])

  return plans.map((p) => {
    const assigned = new Map(
      p.assignments.map((a) => [
        a.featureId,
        { enabled: a.enabled, isExperimental: a.isExperimental },
      ]),
    )

    const features = allFeatures.map((f) => {
      const a = assigned.get(f.id)
      return {
        id: f.id,
        name: f.name,
        key: f.key,
        description: f.description,
        enabled: a ? a.enabled : false,
        isExperimental: a ? a.isExperimental : false,
      }
    })

    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      type: p.type,
      price: p.price,
      interval: p.interval,
      frequency: p.frequency,
      discount: p.discount,
      trialDays: p.trialDays,
      isDefault: p.isDefault,
      externalId: p.externalId,
      productCount: p._count.products,
      features,
    }
  })
}

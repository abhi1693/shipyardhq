import prisma from "@/lib/prisma"
import { PlanType } from "@/lib/vendor/prisma/client"

export type PublicPlan = Awaited<ReturnType<typeof getPublicPlans>>[number]

export async function getPublicPlans(opts?: { type?: PlanType }) {
  const [plans, allFeatures] = await Promise.all([
    prisma.plan.findMany({
      where: opts?.type ? { type: opts.type } : undefined,
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
      discount: p.discount,
      boostForDays: (p as any).boostForDays ?? 1,
      isDefault: p.isDefault,
      externalId: p.externalId,
      paymentFrequencyCount: (p as any).paymentFrequencyCount ?? undefined,
      paymentFrequencyInterval: (p as any).paymentFrequencyInterval ?? undefined,
      subscriptionPeriodCount: (p as any).subscriptionPeriodCount ?? undefined,
      subscriptionPeriodInterval: (p as any).subscriptionPeriodInterval ?? undefined,
      priceSuffix:
        (p as any).type === "recurring_price" && (p as any).paymentFrequencyInterval
          ? (() => {
              const c = (p as any).paymentFrequencyCount ?? 1
              const i = String((p as any).paymentFrequencyInterval)
              const human = c === 1 ? i : `${c} ${i}s`
              return `per ${human}`
            })()
          : undefined,
      productCount: p._count.products,
      features,
    }
  })
}

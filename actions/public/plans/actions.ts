import prisma from "@/lib/prisma"
import { PlanType, type PlanFeature } from "@/lib/vendor/prisma/client"
import type { Prisma } from "@/lib/vendor/prisma/client"
import { accelerateTags, DEFAULT_TTL, DEFAULT_SWR, TAGS } from "@/lib/cache"

export type PublicPlan = Awaited<ReturnType<typeof getPublicPlans>>[number]

type PlanWithAssignments = Prisma.PlanGetPayload<{
  include: {
    assignments: {
      include: {
        feature: true
      }
    }
    _count: { select: { products: true } }
  }
}>

type PlanFeatureRecord = PlanFeature

export async function getPublicPlans(opts?: { type?: PlanType }) {
  const [planRecords, allFeatures] = (await Promise.all([
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
      cacheStrategy: {
        ttl: DEFAULT_TTL.slow,
        swr: DEFAULT_SWR.slow,
        tags: accelerateTags([
          TAGS.plans,
          opts?.type ? `plan-type:${opts.type}` : "plan-type:all",
        ]),
      },
    }),
    prisma.planFeature.findMany({
      orderBy: { name: "asc" },
      cacheStrategy: {
        ttl: DEFAULT_TTL.slow,
        swr: DEFAULT_SWR.slow,
        tags: accelerateTags([TAGS.plans]),
      },
    }),
  ])) as [PlanWithAssignments[], PlanFeatureRecord[]]

  return planRecords.map((p) => {
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
      paymentFrequencyInterval:
        (p as any).paymentFrequencyInterval ?? undefined,
      subscriptionPeriodCount: (p as any).subscriptionPeriodCount ?? undefined,
      subscriptionPeriodInterval:
        (p as any).subscriptionPeriodInterval ?? undefined,
      priceSuffix:
        (p as any).type === "recurring_price" &&
        (p as any).paymentFrequencyInterval
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

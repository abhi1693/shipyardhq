import prisma from "@/lib/prisma"
import { PlanType } from "@/lib/vendor/prisma/client"
import type { Prisma } from "@/lib/vendor/prisma/client"
import { accelerateTags, DEFAULT_TTL, DEFAULT_SWR, TAGS } from "@/lib/cache"

export type PublicPlan = Awaited<ReturnType<typeof getPublicPlans>>[number]

const planSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  type: true,
  price: true,
  discount: true,
  boostForDays: true,
  isDefault: true,
  externalId: true,
  paymentFrequencyCount: true,
  paymentFrequencyInterval: true,
  subscriptionPeriodCount: true,
  subscriptionPeriodInterval: true,
  assignments: {
    select: {
      featureId: true,
      enabled: true,
      isExperimental: true,
    },
  },
  _count: { select: { products: true } },
} satisfies Prisma.PlanSelect

type PlanWithAssignments = Prisma.PlanGetPayload<{
  select: typeof planSelect
}>

const planFeatureSelect = {
  id: true,
  name: true,
  key: true,
  description: true,
} satisfies Prisma.PlanFeatureSelect

type PlanFeatureRecord = Prisma.PlanFeatureGetPayload<{
  select: typeof planFeatureSelect
}>
const MAX_PUBLIC_PLANS = 5

export async function getPublicPlans(opts?: { type?: PlanType }) {
  const planRecordsRaw = await prisma.plan.findMany({
    where: opts?.type ? { type: opts.type } : undefined,
    orderBy: [{ price: "asc" }],
    take: MAX_PUBLIC_PLANS,
    select: planSelect,
    cacheStrategy: {
      ttl: DEFAULT_TTL.slow,
      swr: DEFAULT_SWR.slow,
      tags: accelerateTags([
        TAGS.plans,
        opts?.type ? `plan-type:${opts.type}` : "plan-type:all",
      ]),
    },
  })

  const allFeaturesRaw = await prisma.planFeature.findMany({
    select: planFeatureSelect,
    orderBy: { name: "asc" },
    cacheStrategy: {
      ttl: DEFAULT_TTL.slow,
      swr: DEFAULT_SWR.slow,
      tags: accelerateTags([TAGS.plans]),
    },
  })

  const planRecords = planRecordsRaw as unknown as PlanWithAssignments[]
  const allFeatures = allFeaturesRaw as unknown as PlanFeatureRecord[]

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
      boostForDays: p.boostForDays ?? 1,
      isDefault: p.isDefault,
      externalId: p.externalId,
      paymentFrequencyCount: p.paymentFrequencyCount ?? undefined,
      paymentFrequencyInterval: p.paymentFrequencyInterval ?? undefined,
      subscriptionPeriodCount: p.subscriptionPeriodCount ?? undefined,
      subscriptionPeriodInterval: p.subscriptionPeriodInterval ?? undefined,
      priceSuffix:
        p.type === "recurring_price" && p.paymentFrequencyInterval
          ? (() => {
              const c = p.paymentFrequencyCount ?? 1
              const i = String(p.paymentFrequencyInterval)
              const human = c === 1 ? i : `${c} ${i}s`
              return `per ${human}`
            })()
          : undefined,
      productCount: p._count.products,
      features,
    }
  })
}

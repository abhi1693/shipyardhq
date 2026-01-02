import path from "node:path"
import { pathToFileURL } from "node:url"

import { PlanType, Prisma, TimeInterval } from "@/lib/vendor/prisma/client"
import type { PrismaClient } from "@/lib/vendor/prisma/client"

const prismaPromise = import("@/lib/prisma").then(
  (module) => module.default as PrismaClient,
)

type PlanSeed = {
  name: string
  slug: string
  description?: string
  type: PlanType
  price: number
  externalId?: string
  isDefault?: boolean
  boostForDays?: number
  features: PlanFeatureAssignmentSeed[]
  paymentFrequencyCount?: number
  paymentFrequencyInterval?: TimeInterval
  subscriptionPeriodCount?: number
  subscriptionPeriodInterval?: TimeInterval
}

type PlanFeatureAssignmentSeed = {
  key: string
  enabled?: boolean
  config?: Prisma.JsonValue
}

// Prod-safe plans with additive feature assignments; uses upsert and compound unique
const PLANS: PlanSeed[] = [
  {
    name: "Free",
    slug: "free",
    description: "Basic listing",
    type: PlanType.one_time_price,
    price: 0,
    isDefault: true,
    boostForDays: 1,
    features: [
      { key: "analytics.basic" },
      { key: "product.sitemap" },
      { key: "backlink" },
    ],
  },
  {
    name: "Featured",
    slug: "featured",
    description: "Boosted listing",
    type: PlanType.one_time_price,
    price: 1900,
    externalId: "pdt_0NUDyZ7zmuNGcCruDKM6a",
    isDefault: false,
    boostForDays: 14,
    features: [
      { key: "analytics.basic" },
      { key: "product.sitemap" },
      { key: "featured" },
      { key: "priorityPlacement" },
      { key: "sponsoredProducts" },
    ],
  },
  {
    name: "Featured",
    slug: "featured-recurring",
    description: "Boosted listing",
    type: PlanType.recurring_price,
    price: 1900,
    externalId: "pdt_0NVQ7OAqJn9wt030hEVp7",
    isDefault: false,
    boostForDays: 14,
    paymentFrequencyCount: 2,
    paymentFrequencyInterval: TimeInterval.week,
    subscriptionPeriodCount: 10,
    subscriptionPeriodInterval: TimeInterval.year,
    features: [
      { key: "analytics.basic" },
      { key: "product.sitemap" },
      { key: "featured" },
      { key: "priorityPlacement" },
      { key: "sponsoredProducts" },
    ],
  },
  {
    name: "Pro",
    slug: "pro",
    description: "Maximum visibility",
    type: PlanType.one_time_price,
    price: 4900,
    externalId: "pdt_4svcVbrQbzOwQipWmygBQ",
    isDefault: false,
    boostForDays: 30,
    features: [
      { key: "analytics.basic" },
      { key: "analytics.advanced" },
      { key: "product.sitemap" },
      { key: "featured" },
      { key: "priorityPlacement" },
      { key: "sponsoredProducts" },
      { key: "stickyBanner" },
      { key: "newsletterPromotion" },
      { key: "backlink" },
    ],
  },
  {
    name: "Pro",
    slug: "pro-recurring",
    description: "Maximum visibility",
    type: PlanType.recurring_price,
    price: 4900,
    externalId: "pdt_0NVQ7lPEVJssOEA1FFy8R",
    isDefault: false,
    boostForDays: 30,
    paymentFrequencyCount: 1,
    paymentFrequencyInterval: TimeInterval.month,
    subscriptionPeriodCount: 10,
    subscriptionPeriodInterval: TimeInterval.year,
    features: [
      { key: "analytics.basic" },
      { key: "analytics.advanced" },
      { key: "product.sitemap" },
      { key: "featured" },
      { key: "priorityPlacement" },
      { key: "sponsoredProducts" },
      { key: "stickyBanner" },
      { key: "newsletterPromotion" },
      { key: "backlink" },
    ],
  },
]

export async function seedPlans(prisma: PrismaClient) {
  const rows: { slug: string; action: "create" | "update" }[] = []

  // Resolve features once
  const allFeatures = await prisma.planFeature.findMany({
    select: { id: true, key: true },
  })
  const featureByKey = new Map(allFeatures.map((f) => [f.key, f.id]))

  for (const p of PLANS) {
    const exists = await prisma.plan.findUnique({ where: { slug: p.slug } })
    const action = exists ? ("update" as const) : ("create" as const)

    const plan = await prisma.plan.upsert({
      where: { slug: p.slug },
      update: {
        name: p.name,
        description: p.description,
        type: p.type,
        price: p.price,
        externalId: p.externalId,
        isDefault: !!p.isDefault,
        boostForDays: p.boostForDays ?? 1,
        paymentFrequencyCount: p.paymentFrequencyCount,
        paymentFrequencyInterval: p.paymentFrequencyInterval,
        subscriptionPeriodCount: p.subscriptionPeriodCount,
        subscriptionPeriodInterval: p.subscriptionPeriodInterval,
      },
      create: {
        name: p.name,
        slug: p.slug,
        description: p.description,
        type: p.type,
        price: p.price,
        externalId: p.externalId,
        isDefault: !!p.isDefault,
        boostForDays: p.boostForDays ?? 1,
        paymentFrequencyCount: p.paymentFrequencyCount,
        paymentFrequencyInterval: p.paymentFrequencyInterval,
        subscriptionPeriodCount: p.subscriptionPeriodCount,
        subscriptionPeriodInterval: p.subscriptionPeriodInterval,
      },
    })

    for (const assignment of p.features) {
      const featureId = featureByKey.get(assignment.key)
      if (!featureId) {
        console.warn(
          `Plan ${p.slug}: missing feature '${assignment.key}', skip assignment`,
        )
        continue
      }
      await prisma.planFeatureAssignment.upsert({
        where: { planId_featureId: { planId: plan.id, featureId } },
        update: {
          enabled: assignment.enabled ?? true,
          config: assignment.config ?? Prisma.JsonNull,
        },
        create: {
          planId: plan.id,
          featureId,
          enabled: assignment.enabled ?? true,
          config: assignment.config ?? Prisma.JsonNull,
        },
      })
    }

    rows.push({ slug: p.slug, action })
  }

  console.table(rows)
  return rows
}

const invokedDirectly = (() => {
  if (!process.argv[1]) return false
  const cliUrl = pathToFileURL(path.resolve(process.argv[1])).href
  return import.meta.url === cliUrl
})()

if (invokedDirectly) {
  prismaPromise
    .then((prisma) => seedPlans(prisma))
    .catch((e) => {
      console.error(e)
      process.exit(1)
    })
    .finally(async () => {
      const prisma = await prismaPromise
      await prisma.$disconnect()
    })
}

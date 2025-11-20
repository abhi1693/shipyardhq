import path from "node:path"
import { pathToFileURL } from "node:url"

import {
  PlanType,
  Prisma,
  TimeInterval,
} from "@/lib/vendor/prisma/client"
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
      {
        key: "insights.pipeline",
        config: { usageLimit: 1, usageInterval: "week" },
      },
    ],
  },
  {
    name: "Featured",
    slug: "featured",
    description: "Boosted listing",
    type: PlanType.one_time_price,
    price: 1900,
    isDefault: false,
    boostForDays: 14,
    features: [
      { key: "analytics.basic" },
      { key: "product.sitemap" },
      { key: "featured" },
      { key: "priorityPlacement" },
      { key: "sponsoredProducts" },
      {
        key: "insights.pipeline",
        config: { usageLimit: 1, usageInterval: "day" },
      },
    ],
  },
  {
    name: "Pro",
    slug: "pro",
    description: "Maximum visibility",
    type: PlanType.one_time_price,
    price: 4900,
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
      { key: "customCTA" },
      { key: "newsletterPromotion" },
      { key: "backlink" },
      {
        key: "insights.pipeline",
        config: { usageLimit: null },
      },
    ],
  },
  {
    name: "Crew",
    slug: "crew",
    description: "Unlock organizations and collaboration tools",
    type: PlanType.recurring_price,
    price: 9900,
    isDefault: false,
    boostForDays: 30,
    features: [
      { key: "analytics.basic" },
      { key: "analytics.advanced" },
      { key: "product.sitemap" },
      { key: "priorityPlacement" },
      { key: "sponsoredProducts" },
      { key: "organization" },
      {
        key: "insights.pipeline",
        config: { usageLimit: null },
      },
    ],
    paymentFrequencyCount: 1,
    paymentFrequencyInterval: TimeInterval.month,
    subscriptionPeriodCount: 1,
    subscriptionPeriodInterval: TimeInterval.month,
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

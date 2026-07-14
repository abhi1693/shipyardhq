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
  discount?: number | null
  externalId?: string | null
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
  isExperimental?: boolean
  config?: Prisma.JsonValue
}

// Catalog external IDs mirror the active Dodo test-mode products.
const PLANS: PlanSeed[] = [
  {
    name: "Free",
    slug: "free",
    description: "Basic listing",
    type: PlanType.one_time_price,
    price: 0,
    discount: null,
    externalId: null,
    isDefault: true,
    boostForDays: 1,
    features: [{ key: "analytics.basic" }, { key: "product.sitemap" }],
  },
  {
    name: "Spotlight",
    slug: "spotlight",
    description: "Front and Center",
    type: PlanType.one_time_price,
    price: 499,
    discount: null,
    externalId: null,
    isDefault: false,
    boostForDays: 7,
    features: [
      { key: "analytics.basic" },
      { key: "backlink" },
      { key: "featured" },
      { key: "product.sitemap" },
      { key: "sponsoredProducts" },
    ],
  },
  {
    name: "Featured",
    slug: "featured",
    description: "Boosted listing",
    type: PlanType.one_time_price,
    price: 999,
    discount: 0,
    externalId: "pdt_0Nh18siTMjG0nm64hnhF3",
    isDefault: false,
    boostForDays: 14,
    features: [
      { key: "analytics.basic" },
      { key: "analytics.advanced" },
      { key: "backlink" },
      { key: "product.sitemap" },
      { key: "featured" },
      { key: "priorityPlacement" },
      { key: "product.aiSearchReady" },
      { key: "sponsoredProducts" },
    ],
  },
  {
    name: "Featured",
    slug: "featured-recurring",
    description: "Boosted listing",
    type: PlanType.recurring_price,
    price: 899,
    discount: 0,
    externalId: "pdt_0Nh1A7b0Tw1qKTqVfjQBg",
    isDefault: false,
    boostForDays: 14,
    paymentFrequencyCount: 14,
    paymentFrequencyInterval: TimeInterval.day,
    subscriptionPeriodCount: 10,
    subscriptionPeriodInterval: TimeInterval.year,
    features: [
      { key: "analytics.basic" },
      { key: "analytics.advanced" },
      { key: "backlink" },
      { key: "product.sitemap" },
      { key: "featured" },
      { key: "priorityPlacement" },
      { key: "product.aiSearchReady" },
      { key: "sponsoredProducts" },
    ],
  },
  {
    name: "Pro",
    slug: "pro",
    description: "Maximum visibility",
    type: PlanType.one_time_price,
    price: 2499,
    discount: 0,
    externalId: "pdt_0Nh1ABFqHjSwvJsQVyWH0",
    isDefault: false,
    boostForDays: 30,
    features: [
      { key: "analytics.basic" },
      { key: "analytics.advanced" },
      { key: "backlink" },
      { key: "product.sitemap" },
      { key: "product.aiSearchReady" },
      { key: "featured" },
      { key: "priorityPlacement" },
      { key: "sponsoredProducts" },
      { key: "partnerSpotlight" },
    ],
  },
  {
    name: "Pro",
    slug: "pro-recurring",
    description: "Maximum visibility",
    type: PlanType.recurring_price,
    price: 2499,
    discount: 0,
    externalId: "pdt_0Nh1ABzqD2ZM6Gqveuzj9",
    isDefault: false,
    boostForDays: 30,
    paymentFrequencyCount: 1,
    paymentFrequencyInterval: TimeInterval.month,
    subscriptionPeriodCount: 10,
    subscriptionPeriodInterval: TimeInterval.year,
    features: [
      { key: "analytics.basic" },
      { key: "analytics.advanced" },
      { key: "backlink" },
      { key: "product.sitemap" },
      { key: "product.aiSearchReady" },
      { key: "featured" },
      { key: "priorityPlacement" },
      { key: "sponsoredProducts" },
      { key: "partnerSpotlight" },
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
  const managedFeatureIds = Array.from(
    new Set(
      PLANS.flatMap((plan) => plan.features)
        .map((assignment) => featureByKey.get(assignment.key))
        .filter((featureId): featureId is string => Boolean(featureId)),
    ),
  )

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
        discount: p.discount,
        externalId: p.externalId,
        isDefault: !!p.isDefault,
        boostForDays: p.boostForDays ?? 1,
        paymentFrequencyCount: p.paymentFrequencyCount ?? null,
        paymentFrequencyInterval: p.paymentFrequencyInterval ?? null,
        subscriptionPeriodCount: p.subscriptionPeriodCount ?? null,
        subscriptionPeriodInterval: p.subscriptionPeriodInterval ?? null,
      },
      create: {
        name: p.name,
        slug: p.slug,
        description: p.description,
        type: p.type,
        price: p.price,
        discount: p.discount,
        externalId: p.externalId,
        isDefault: !!p.isDefault,
        boostForDays: p.boostForDays ?? 1,
        paymentFrequencyCount: p.paymentFrequencyCount,
        paymentFrequencyInterval: p.paymentFrequencyInterval,
        subscriptionPeriodCount: p.subscriptionPeriodCount,
        subscriptionPeriodInterval: p.subscriptionPeriodInterval,
      },
    })

    const configuredFeatureIds = new Set(
      p.features
        .map((assignment) => featureByKey.get(assignment.key))
        .filter((featureId): featureId is string => Boolean(featureId)),
    )
    const staleManagedFeatureIds = managedFeatureIds.filter(
      (featureId) => !configuredFeatureIds.has(featureId),
    )
    if (staleManagedFeatureIds.length) {
      await prisma.planFeatureAssignment.deleteMany({
        where: {
          planId: plan.id,
          featureId: { in: staleManagedFeatureIds },
        },
      })
    }

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
          isExperimental: assignment.isExperimental ?? false,
          config: assignment.config ?? Prisma.JsonNull,
        },
        create: {
          planId: plan.id,
          featureId,
          enabled: assignment.enabled ?? true,
          isExperimental: assignment.isExperimental ?? false,
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

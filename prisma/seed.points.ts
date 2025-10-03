import path from "node:path"
import { pathToFileURL } from "node:url"

import {
  Prisma,
  PrismaClient,
  RewardFeatureCategory,
  RewardRuleCategory,
} from "@/lib/vendor/prisma/client"

const prisma = new PrismaClient()

const DAY = 86_400

type RuleSeed = {
  key: string
  name: string
  description: string
  category: RewardRuleCategory
  basePoints: number
  isActive?: boolean
  dailyCap?: number | null
  lifetimeCap?: number | null
  globalCooldownSeconds?: number | null
  perTargetCooldownSeconds?: number | null
  metadata?: Record<string, unknown> | null
  tierConfig?: Record<string, unknown> | null
  adminNotes?: string | null
}

type CatalogSeed = {
  featureKey: string
  planFeatureKey?: string | null
  name: string
  description: string
  category: RewardFeatureCategory
  baseCost: number
  durationSeconds?: number | null
  isActive?: boolean
  maxActivePerUser?: number | null
  maxPendingPerUser?: number | null
  requiresProduct?: boolean
  metadata?: Record<string, unknown> | null
}

const RULES: RuleSeed[] = [
  {
    key: "points.login.daily",
    name: "Daily login",
    description: "Awarded once per day when the member signs in.",
    category: RewardRuleCategory.engagement,
    basePoints: 5,
    dailyCap: 5,
    globalCooldownSeconds: DAY,
    metadata: { event: "login" },
  },
  {
    key: "points.upvote.give",
    name: "Product upvote",
    description: "Earned for upvoting a different member's product.",
    category: RewardRuleCategory.engagement,
    basePoints: 2,
    dailyCap: 10,
    perTargetCooldownSeconds: DAY,
    metadata: { event: "productUpvote", perProduct: 1 },
  },
  {
    key: "points.review.publish",
    name: "Publish review",
    description: "Granted when leaving a verified product review.",
    category: RewardRuleCategory.engagement,
    basePoints: 10,
    dailyCap: 30,
    perTargetCooldownSeconds: DAY,
    metadata: { event: "productReview", minimumLength: 40 },
  },
  {
    key: "points.review.depth",
    name: "Detailed review bonus",
    description: "Bonus for reviews over 200 characters.",
    category: RewardRuleCategory.bonus,
    basePoints: 5,
    dailyCap: 20,
    perTargetCooldownSeconds: DAY,
    metadata: { event: "productReview", minimumLength: 200 },
  },
  {
    key: "points.backlink.verify",
    name: "Backlink verification",
    description: "One-time award when a backlink is verified.",
    category: RewardRuleCategory.engagement,
    basePoints: 30,
    lifetimeCap: 30,
    metadata: { event: "backlinkVerification" },
  },
  {
    key: "points.streak.maintain",
    name: "Streak maintenance",
    description: "Issued by the nightly job when a streak tier is maintained.",
    category: RewardRuleCategory.streak,
    basePoints: 8,
    dailyCap: 16,
    metadata: { event: "streak", tiers: ["bronze", "silver", "gold"] },
  },
]

const CATALOG: CatalogSeed[] = [
  {
    featureKey: "priorityPlacement",
    planFeatureKey: "priorityPlacement",
    name: "Priority placement",
    description: "Boost to the top of browse results for 24 hours.",
    category: RewardFeatureCategory.placement,
    baseCost: 150,
    durationSeconds: DAY,
    requiresProduct: true,
    maxActivePerUser: 1,
    maxPendingPerUser: 2,
    metadata: { surface: "priority" },
  },
  {
    featureKey: "featured",
    planFeatureKey: "featured",
    name: "Featured badge",
    description: "Highlight the product across Shipyard for seven days.",
    category: RewardFeatureCategory.placement,
    baseCost: 500,
    durationSeconds: 7 * DAY,
    requiresProduct: true,
    maxActivePerUser: 1,
    metadata: { surface: "featured" },
  },
  {
    featureKey: "homepage",
    planFeatureKey: "homepage",
    name: "Homepage placement",
    description: "Showcase on the homepage hero carousel for three days.",
    category: RewardFeatureCategory.exposure,
    baseCost: 300,
    durationSeconds: 3 * DAY,
    requiresProduct: true,
    maxPendingPerUser: 2,
    metadata: { surface: "homepage" },
  },
  {
    featureKey: "stickyBanner",
    planFeatureKey: "stickyBanner",
    name: "Sticky banner",
    description: "Reserve a persistent ribbon across browse and product pages for two days.",
    category: RewardFeatureCategory.placement,
    baseCost: 200,
    durationSeconds: 2 * DAY,
    requiresProduct: true,
    metadata: { surface: "sticky-banner" },
  },
  {
    featureKey: "newsletterPromotion",
    planFeatureKey: "newsletterPromotion",
    name: "Newsletter promotion",
    description: "Reserve a slot in the next weekly newsletter.",
    category: RewardFeatureCategory.exposure,
    baseCost: 350,
    durationSeconds: 7 * DAY,
    requiresProduct: true,
    maxPendingPerUser: 1,
    metadata: { channel: "newsletter" },
  },
  {
    featureKey: "analytics.advanced",
    planFeatureKey: "analytics.advanced",
    name: "Advanced analytics",
    description: "Unlock conversion and cohort dashboards for 30 days.",
    category: RewardFeatureCategory.analytics,
    baseCost: 120,
    durationSeconds: 30 * DAY,
    requiresProduct: true,
    metadata: { capabilities: ["funnels", "geo", "utm"] },
  },
  {
    featureKey: "insights.pipeline",
    planFeatureKey: "insights.pipeline",
    name: "Insights pipeline",
    description: "Run a full competitive and sentiment insights refresh.",
    category: RewardFeatureCategory.insights,
    baseCost: 80,
    durationSeconds: 14 * DAY,
    requiresProduct: true,
    metadata: { includes: ["community", "threads", "aiSummary"] },
  },
  {
    featureKey: "customCTA",
    planFeatureKey: "customCTA",
    name: "Custom call-to-action",
    description: "Swap the default CTA with a bespoke message for 14 days.",
    category: RewardFeatureCategory.utility,
    baseCost: 60,
    durationSeconds: 14 * DAY,
    requiresProduct: true,
    metadata: { surface: "productPage" },
  },
]

function toJson(value: Record<string, unknown> | null | undefined) {
  return value == null ? Prisma.JsonNull : (value as Prisma.InputJsonValue)
}

function ensurePlanFeatureKey(
  key: string | null | undefined,
  existing: Set<string>,
): string | null {
  if (!key) return null
  if (existing.has(key)) return key
  console.warn(`⚠️  Plan feature '${key}' not found. Seeding catalog item without linkage.`)
  return null
}

export async function seedPoints(prismaClient: PrismaClient) {
  const planFeatures = await prismaClient.planFeature.findMany({ select: { key: true } })
  const planFeatureKeys = new Set(planFeatures.map((item) => item.key))

  const ruleResults: { key: string; action: "created" | "updated" }[] = []
  for (const rule of RULES) {
    const { key, ...rest } = rule
    const data = {
      ...rest,
      isActive: rest.isActive ?? true,
      dailyCap: rest.dailyCap ?? null,
      lifetimeCap: rest.lifetimeCap ?? null,
      globalCooldownSeconds: rest.globalCooldownSeconds ?? null,
      perTargetCooldownSeconds: rest.perTargetCooldownSeconds ?? null,
      metadata: toJson(rest.metadata),
      tierConfig: toJson(rest.tierConfig),
      adminNotes: rest.adminNotes ?? null,
    }

    const existing = await prismaClient.rewardRule.findUnique({ where: { key } })
    const action = existing ? "updated" : "created"

    await prismaClient.rewardRule.upsert({
      where: { key },
      update: data,
      create: { key, ...data },
    })

    ruleResults.push({ key, action })
  }

  const catalogResults: { featureKey: string; action: "created" | "updated" }[] = []
  for (const item of CATALOG) {
    const { featureKey } = item
    const data = {
      name: item.name,
      description: item.description,
      category: item.category,
      baseCost: item.baseCost,
      durationSeconds: item.durationSeconds ?? null,
      isActive: item.isActive ?? true,
      maxActivePerUser: item.maxActivePerUser ?? null,
      maxPendingPerUser: item.maxPendingPerUser ?? null,
      requiresProduct: item.requiresProduct ?? false,
      metadata: toJson(item.metadata),
      planFeatureKey: ensurePlanFeatureKey(item.planFeatureKey, planFeatureKeys),
    }

    const existing = await prismaClient.rewardCatalogItem.findUnique({
      where: { featureKey },
    })
    const action = existing ? "updated" : "created"

    await prismaClient.rewardCatalogItem.upsert({
      where: { featureKey },
      update: data,
      create: { featureKey, ...data },
    })

    catalogResults.push({ featureKey, action })
  }

  console.table(ruleResults)
  console.table(catalogResults)

  return { rules: ruleResults, catalog: catalogResults }
}

const invokedDirectly = (() => {
  if (!process.argv[1]) return false
  const cliUrl = pathToFileURL(path.resolve(process.argv[1])).href
  return import.meta.url === cliUrl
})()

if (invokedDirectly) {
  seedPoints(prisma)
    .catch((error) => {
      console.error("Failed to seed points data", error)
      process.exitCode = 1
    })
    .finally(async () => {
      await prisma.$disconnect()
    })
}

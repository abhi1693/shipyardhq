import path from "node:path"
import { pathToFileURL } from "node:url"

import {
  AnalyticsDataSource,
  AnalyticsIngestionJob,
  AnalyticsIngestionStatus,
  FeatureEntitlementStatus,
  FeatureSubjectType,
  LeaderboardRunStatus,
  PaymentConnectorProvider,
  PaymentConnectorStatus,
  PaymentCredentialStatus,
  PlacementStatus,
  Platform,
  Prisma,
  ProductStatus,
  ProductType,
  PricingModel,
  RedemptionStatus,
  RewardTransactionType,
  UserStatus,
} from "@/lib/vendor/prisma/client"
import type { PrismaClient } from "@/lib/vendor/prisma/client"
import { REWARD_FEATURE_KEY } from "@/lib/rewards/constants"
import { generateVerificationTxtFromWebsite } from "@/lib/products/verification"

import { seedAlternatives } from "./seed.alternatives"
import { seedCategories } from "./seed.categories"
import { seedPlanFeatures } from "./seed.plan-features"
import { seedPlans } from "./seed.plans"
import { seedRewards } from "./seed.rewards"
import { seedUseCases } from "./seed.use-cases"

const prismaPromise = import("@/lib/prisma").then(
  (module) => module.default as PrismaClient,
)

const MS_PER_DAY = 86_400_000
const DEV_SOURCE_TYPE = "dev-seed"

const DEV_SEED_DEFAULTS = {
  adminClerkId: "dev_clerk_admin",
  adminEmail: "dev.admin@shipyard.local",
  memberClerkId: "dev_clerk_member",
  memberEmail: "dev.member@shipyard.local",
} as const

type DevUserSeed = {
  clerkId: string
  email: string
  firstName: string
  lastName: string
  role: "admin" | "member"
  roleIntent: string
  heardFrom: string
  createdDaysAgo: number
}

type DevProductSeed = {
  slug: string
  name: string
  tagline: string
  description: string
  websiteUrl: string
  logo: string
  bannerImage: string
  type: ProductType
  pricingModel: PricingModel
  status: ProductStatus
  startingPriceCents: number | null
  currencyCode: string | null
  keywords: string[]
  platforms: Platform[]
  userEmail: string
  categorySlug: string
  planSlug: string | null
  createdDaysAgo: number
  publishedDaysAgo?: number
  upvoteBase: number
  verified: boolean
  backlinkVerified: boolean
  connector?: {
    provider: PaymentConnectorProvider
    allTimeRevenueCents: number
    latestPeriodRevenueCents: number
    currencyCode: string
  }
}

type SeedContext = {
  usersByEmail: Map<string, { id: string; clerkId: string; email: string }>
  categoryIdBySlug: Map<string, string>
  planIdBySlug: Map<string, string>
}

type SiteTrafficTotals = {
  pageViews: number
  uniqueVisitors: number
  sessions: number
  bounceRate: number
  averageSessionDuration: number
  newUsers: number
  returningVisitors: number
  engagementRate: number
  pagesPerSession: number
}

function utcStartOfDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  )
}

function addUtcDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY)
}

function daysAgo(today: Date, days: number): Date {
  return addUtcDays(today, -days)
}

function startOfUtcMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
}

function addUtcMonths(date: Date, months: number): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1),
  )
}

function round(value: number, precision = 2): number {
  const factor = 10 ** precision
  return Math.round(value * factor) / factor
}

function json(value: Record<string, unknown>): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue
}

const devUsers = (): DevUserSeed[] => [
  {
    clerkId:
      process.env.DEV_ADMIN_CLERK_ID?.trim() || DEV_SEED_DEFAULTS.adminClerkId,
    email: process.env.DEV_ADMIN_EMAIL?.trim() || DEV_SEED_DEFAULTS.adminEmail,
    firstName: "Dev",
    lastName: "Admin",
    role: "admin",
    roleIntent: "Operate the marketplace locally",
    heardFrom: "Local development seed",
    createdDaysAgo: 45,
  },
  {
    clerkId:
      process.env.DEV_MEMBER_CLERK_ID?.trim() ||
      DEV_SEED_DEFAULTS.memberClerkId,
    email:
      process.env.DEV_MEMBER_EMAIL?.trim() || DEV_SEED_DEFAULTS.memberEmail,
    firstName: "Maya",
    lastName: "Harbor",
    role: "member",
    roleIntent: "Launch a SaaS",
    heardFrom: "Founder community",
    createdDaysAgo: 31,
  },
  {
    clerkId: "dev_clerk_growth",
    email: "dev.growth@shipyard.local",
    firstName: "Nolan",
    lastName: "Growth",
    role: "member",
    roleIntent: "Find distribution channels",
    heardFrom: "Search",
    createdDaysAgo: 17,
  },
  {
    clerkId: "dev_clerk_suspended",
    email: "dev.suspended@shipyard.local",
    firstName: "Sam",
    lastName: "Paused",
    role: "member",
    roleIntent: "Test account states",
    heardFrom: "Support",
    createdDaysAgo: 9,
  },
]

const baseDevProducts: DevProductSeed[] = [
  {
    slug: "dev-dockpilot",
    name: "DockPilot",
    tagline: "A release ops dashboard for small SaaS teams.",
    description:
      "DockPilot keeps product launches, changelogs, beta cohorts, and follow-up tasks in one operational workspace.",
    websiteUrl: "https://dockpilot.localhost",
    logo: "/brand.png",
    bannerImage: "/analytics-1.png",
    type: ProductType.saas,
    pricingModel: PricingModel.subscription,
    status: ProductStatus.published,
    startingPriceCents: 2900,
    currencyCode: "USD",
    keywords: ["release ops", "changelog", "launch"],
    platforms: [Platform.web],
    userEmail:
      process.env.DEV_ADMIN_EMAIL?.trim() || DEV_SEED_DEFAULTS.adminEmail,
    categorySlug: "developer-tools",
    planSlug: "pro",
    createdDaysAgo: 4,
    publishedDaysAgo: 0,
    upvoteBase: 78,
    verified: true,
    backlinkVerified: true,
    connector: {
      provider: PaymentConnectorProvider.dodo,
      allTimeRevenueCents: 182_400,
      latestPeriodRevenueCents: 24_700,
      currencyCode: "USD",
    },
  },
  {
    slug: "dev-revenue-radar",
    name: "Revenue Radar",
    tagline: "Payment intelligence for bootstrapped software teams.",
    description:
      "Revenue Radar reconciles subscriptions, one-time purchases, refunds, and verified revenue milestones across payment providers.",
    websiteUrl: "https://revenue-radar.localhost",
    logo: "/providers/dodo.jpeg",
    bannerImage: "/opengraph-verified-revenue.png",
    type: ProductType.saas,
    pricingModel: PricingModel.freemium,
    status: ProductStatus.published,
    startingPriceCents: 0,
    currencyCode: "USD",
    keywords: ["revenue", "analytics", "billing"],
    platforms: [Platform.web],
    userEmail:
      process.env.DEV_ADMIN_EMAIL?.trim() || DEV_SEED_DEFAULTS.adminEmail,
    categorySlug: "analytics",
    planSlug: "featured",
    createdDaysAgo: 11,
    publishedDaysAgo: 0,
    upvoteBase: 54,
    verified: true,
    backlinkVerified: false,
    connector: {
      provider: PaymentConnectorProvider.stripe,
      allTimeRevenueCents: 96_900,
      latestPeriodRevenueCents: 13_800,
      currencyCode: "USD",
    },
  },
  {
    slug: "dev-support-tide",
    name: "Support Tide",
    tagline: "Turn inbound support into product feedback loops.",
    description:
      "Support Tide groups customer issues, flags churn risk, and routes actionable feedback into product planning.",
    websiteUrl: "https://support-tide.localhost",
    logo: "/analytics-2.png",
    bannerImage: "/insights-demo.png",
    type: ProductType.saas,
    pricingModel: PricingModel.subscription,
    status: ProductStatus.published,
    startingPriceCents: 1900,
    currencyCode: "USD",
    keywords: ["support", "feedback", "customer success"],
    platforms: [Platform.web],
    userEmail:
      process.env.DEV_MEMBER_EMAIL?.trim() || DEV_SEED_DEFAULTS.memberEmail,
    categorySlug: "customer-support",
    planSlug: "free",
    createdDaysAgo: 18,
    publishedDaysAgo: 4,
    upvoteBase: 42,
    verified: false,
    backlinkVerified: false,
  },
  {
    slug: "dev-checkout-beacon",
    name: "Checkout Beacon",
    tagline: "Monitor checkout drop-off and failed payment paths.",
    description:
      "Checkout Beacon watches checkout experiments, payment errors, and campaign-specific revenue outcomes.",
    websiteUrl: "https://checkout-beacon.localhost",
    logo: "/providers/paddle.png",
    bannerImage: "/analytics-3.png",
    type: ProductType.saas,
    pricingModel: PricingModel.subscription,
    status: ProductStatus.published,
    startingPriceCents: 4900,
    currencyCode: "USD",
    keywords: ["checkout", "payments", "conversion"],
    platforms: [Platform.web],
    userEmail:
      process.env.DEV_MEMBER_EMAIL?.trim() || DEV_SEED_DEFAULTS.memberEmail,
    categorySlug: "ecommerce",
    planSlug: "pro",
    createdDaysAgo: 29,
    publishedDaysAgo: 1,
    upvoteBase: 35,
    verified: true,
    backlinkVerified: true,
    connector: {
      provider: PaymentConnectorProvider.paddle,
      allTimeRevenueCents: 42_300,
      latestPeriodRevenueCents: 8_400,
      currencyCode: "USD",
    },
  },
  {
    slug: "dev-signal-deck",
    name: "Signal Deck",
    tagline: "A lightweight analytics console for founder-led growth.",
    description:
      "Signal Deck turns product events, attribution notes, and weekly growth experiments into a focused operating dashboard.",
    websiteUrl: "https://signal-deck.localhost",
    logo: "/analytics-1.png",
    bannerImage: "/analytics-1.png",
    type: ProductType.saas,
    pricingModel: PricingModel.freemium,
    status: ProductStatus.published,
    startingPriceCents: 0,
    currencyCode: "USD",
    keywords: ["analytics", "growth", "events"],
    platforms: [Platform.web],
    userEmail: "dev.growth@shipyard.local",
    categorySlug: "analytics",
    planSlug: null,
    createdDaysAgo: 5,
    publishedDaysAgo: 0,
    upvoteBase: 31,
    verified: true,
    backlinkVerified: false,
  },
  {
    slug: "dev-launch-notes",
    name: "Launch Notes",
    tagline: "Write, approve, and publish product updates faster.",
    description:
      "Launch Notes gives small teams a shared workflow for release copy, screenshots, approvals, and public changelogs.",
    websiteUrl: "https://launch-notes.localhost",
    logo: "/brand.svg",
    bannerImage: "/featured-on-light.png",
    type: ProductType.saas,
    pricingModel: PricingModel.subscription,
    status: ProductStatus.published,
    startingPriceCents: 1500,
    currencyCode: "USD",
    keywords: ["changelog", "release notes", "product updates"],
    platforms: [Platform.web],
    userEmail:
      process.env.DEV_ADMIN_EMAIL?.trim() || DEV_SEED_DEFAULTS.adminEmail,
    categorySlug: "developer-tools",
    planSlug: null,
    createdDaysAgo: 6,
    publishedDaysAgo: 1,
    upvoteBase: 29,
    verified: true,
    backlinkVerified: true,
  },
  {
    slug: "dev-feedback-forge",
    name: "Feedback Forge",
    tagline: "Turn scattered user feedback into clear product bets.",
    description:
      "Feedback Forge collects support notes, survey answers, and sales objections into prioritized customer insights.",
    websiteUrl: "https://feedback-forge.localhost",
    logo: "/analytics-2.png",
    bannerImage: "/insights-demo.png",
    type: ProductType.saas,
    pricingModel: PricingModel.subscription,
    status: ProductStatus.published,
    startingPriceCents: 2200,
    currencyCode: "USD",
    keywords: ["feedback", "roadmap", "customer research"],
    platforms: [Platform.web],
    userEmail:
      process.env.DEV_MEMBER_EMAIL?.trim() || DEV_SEED_DEFAULTS.memberEmail,
    categorySlug: "customer-support",
    planSlug: null,
    createdDaysAgo: 7,
    publishedDaysAgo: 1,
    upvoteBase: 27,
    verified: false,
    backlinkVerified: false,
  },
  {
    slug: "dev-prism-capture",
    name: "Prism Capture",
    tagline: "Record crisp product demos without a production studio.",
    description:
      "Prism Capture helps founders capture walkthroughs, annotate flows, and export short launch-ready product clips.",
    websiteUrl: "https://prism-capture.localhost",
    logo: "/opengraph.png",
    bannerImage: "/opengraph.png",
    type: ProductType.saas,
    pricingModel: PricingModel.one_time,
    status: ProductStatus.published,
    startingPriceCents: 5900,
    currencyCode: "USD",
    keywords: ["demo video", "screen recording", "launch"],
    platforms: [Platform.web, Platform.mac],
    userEmail: "dev.growth@shipyard.local",
    categorySlug: "marketing",
    planSlug: null,
    createdDaysAgo: 8,
    publishedDaysAgo: 2,
    upvoteBase: 25,
    verified: true,
    backlinkVerified: false,
  },
  {
    slug: "dev-api-compass",
    name: "API Compass",
    tagline: "Map third-party API changes before they break users.",
    description:
      "API Compass monitors vendor schemas, webhook payloads, and integration contracts for small platform teams.",
    websiteUrl: "https://api-compass.localhost",
    logo: "/brand-white.svg",
    bannerImage: "/featured-on-dark.png",
    type: ProductType.api,
    pricingModel: PricingModel.freemium,
    status: ProductStatus.published,
    startingPriceCents: 0,
    currencyCode: "USD",
    keywords: ["api", "integrations", "monitoring"],
    platforms: [Platform.web, Platform.linux],
    userEmail:
      process.env.DEV_ADMIN_EMAIL?.trim() || DEV_SEED_DEFAULTS.adminEmail,
    categorySlug: "apis-and-integrations",
    planSlug: null,
    createdDaysAgo: 9,
    publishedDaysAgo: 1,
    upvoteBase: 23,
    verified: true,
    backlinkVerified: true,
  },
  {
    slug: "dev-pipeline-pulse",
    name: "Pipeline Pulse",
    tagline: "A sales pipeline view built for technical founders.",
    description:
      "Pipeline Pulse tracks deals, onboarding risk, expansion notes, and founder follow-ups without a heavy CRM rollout.",
    websiteUrl: "https://pipeline-pulse.localhost",
    logo: "/analytics-3.png",
    bannerImage: "/analytics-3.png",
    type: ProductType.saas,
    pricingModel: PricingModel.subscription,
    status: ProductStatus.published,
    startingPriceCents: 2500,
    currencyCode: "USD",
    keywords: ["sales", "crm", "pipeline"],
    platforms: [Platform.web],
    userEmail:
      process.env.DEV_MEMBER_EMAIL?.trim() || DEV_SEED_DEFAULTS.memberEmail,
    categorySlug: "sales",
    planSlug: null,
    createdDaysAgo: 10,
    publishedDaysAgo: 3,
    upvoteBase: 22,
    verified: false,
    backlinkVerified: false,
  },
  {
    slug: "dev-docs-lantern",
    name: "Docs Lantern",
    tagline: "Find broken docs, stale examples, and missing guides.",
    description:
      "Docs Lantern crawls developer documentation, spots outdated examples, and turns gaps into actionable writing queues.",
    websiteUrl: "https://docs-lantern.localhost",
    logo: "/brand.png",
    bannerImage: "/analytics-1.png",
    type: ProductType.saas,
    pricingModel: PricingModel.subscription,
    status: ProductStatus.published,
    startingPriceCents: 1800,
    currencyCode: "USD",
    keywords: ["docs", "developer experience", "content"],
    platforms: [Platform.web],
    userEmail: "dev.growth@shipyard.local",
    categorySlug: "developer-tools",
    planSlug: null,
    createdDaysAgo: 12,
    publishedDaysAgo: 0,
    upvoteBase: 20,
    verified: true,
    backlinkVerified: false,
  },
  {
    slug: "dev-cart-current",
    name: "Cart Current",
    tagline: "Spot storefront revenue leaks before they compound.",
    description:
      "Cart Current highlights checkout friction, abandoned order patterns, and campaign-level storefront performance.",
    websiteUrl: "https://cart-current.localhost",
    logo: "/providers/paddle.png",
    bannerImage: "/opengraph-verified-revenue.png",
    type: ProductType.saas,
    pricingModel: PricingModel.freemium,
    status: ProductStatus.published,
    startingPriceCents: 0,
    currencyCode: "USD",
    keywords: ["ecommerce", "checkout", "analytics"],
    platforms: [Platform.web],
    userEmail:
      process.env.DEV_MEMBER_EMAIL?.trim() || DEV_SEED_DEFAULTS.memberEmail,
    categorySlug: "ecommerce",
    planSlug: null,
    createdDaysAgo: 13,
    publishedDaysAgo: 5,
    upvoteBase: 19,
    verified: true,
    backlinkVerified: true,
  },
  {
    slug: "dev-roadmap-river",
    name: "Roadmap River",
    tagline: "Connect feature bets to revenue and support pressure.",
    description:
      "Roadmap River keeps roadmap themes, user evidence, and business impact visible for tiny product teams.",
    websiteUrl: "https://roadmap-river.localhost",
    logo: "/featured-on-light.png",
    bannerImage: "/featured-on-light.png",
    type: ProductType.saas,
    pricingModel: PricingModel.free,
    status: ProductStatus.published,
    startingPriceCents: null,
    currencyCode: "USD",
    keywords: ["roadmap", "product management", "prioritization"],
    platforms: [Platform.web],
    userEmail:
      process.env.DEV_ADMIN_EMAIL?.trim() || DEV_SEED_DEFAULTS.adminEmail,
    categorySlug: "product-management",
    planSlug: null,
    createdDaysAgo: 14,
    publishedDaysAgo: 6,
    upvoteBase: 17,
    verified: false,
    backlinkVerified: false,
  },
  {
    slug: "dev-uptime-buoy",
    name: "Uptime Buoy",
    tagline: "Simple uptime checks with customer-facing incident notes.",
    description:
      "Uptime Buoy pairs monitor alerts, status updates, and post-incident notes for bootstrapped SaaS operators.",
    websiteUrl: "https://uptime-buoy.localhost",
    logo: "/brand-white.png",
    bannerImage: "/featured-on-dark.png",
    type: ProductType.saas,
    pricingModel: PricingModel.subscription,
    status: ProductStatus.published,
    startingPriceCents: 1200,
    currencyCode: "USD",
    keywords: ["uptime", "status page", "monitoring"],
    platforms: [Platform.web],
    userEmail: "dev.growth@shipyard.local",
    categorySlug: "monitoring-and-observability",
    planSlug: null,
    createdDaysAgo: 15,
    publishedDaysAgo: 2,
    upvoteBase: 16,
    verified: true,
    backlinkVerified: false,
  },
  {
    slug: "dev-design-crane",
    name: "Design Crane",
    tagline: "Generate polished product screens from rough specs.",
    description:
      "Design Crane converts product requirements into interface drafts, image prompts, and handoff notes.",
    websiteUrl: "https://design-crane.localhost",
    logo: "/brand-white.png",
    bannerImage: "/featured-on-light.png",
    type: ProductType.saas,
    pricingModel: PricingModel.one_time,
    status: ProductStatus.draft,
    startingPriceCents: 6900,
    currencyCode: "USD",
    keywords: ["design", "ui", "handoff"],
    platforms: [Platform.web, Platform.mac],
    userEmail: "dev.growth@shipyard.local",
    categorySlug: "design-and-ui",
    planSlug: null,
    createdDaysAgo: 2,
    upvoteBase: 0,
    verified: false,
    backlinkVerified: false,
  },
  {
    slug: "dev-api-harbor",
    name: "API Harbor",
    tagline: "A contract testing workspace for API-first products.",
    description:
      "API Harbor records mocks, schema drift, generated clients, and release readiness checks for partner APIs.",
    websiteUrl: "https://api-harbor.localhost",
    logo: "/brand.svg",
    bannerImage: "/opengraph.png",
    type: ProductType.api,
    pricingModel: PricingModel.freemium,
    status: ProductStatus.published,
    startingPriceCents: 0,
    currencyCode: "USD",
    keywords: ["api", "testing", "contracts"],
    platforms: [Platform.web, Platform.linux],
    userEmail: "dev.growth@shipyard.local",
    categorySlug: "apis-and-integrations",
    planSlug: "featured",
    createdDaysAgo: 37,
    publishedDaysAgo: 3,
    upvoteBase: 26,
    verified: true,
    backlinkVerified: false,
  },
]

const GENERATED_DEV_PRODUCT_MINIMUM = 500

function resolveGeneratedProductCount() {
  const configured = Number.parseInt(
    process.env.DEV_GENERATED_PRODUCT_COUNT ?? "",
    10,
  )

  if (!Number.isFinite(configured) || configured <= 0) {
    return GENERATED_DEV_PRODUCT_MINIMUM
  }

  return Math.max(GENERATED_DEV_PRODUCT_MINIMUM, configured)
}

function generatedPublishedDaysAgo(index: number) {
  if (index < 80) return 0
  if (index < 160) return 1
  return 2 + (index % 5)
}

function generatedDevProducts(): DevProductSeed[] {
  const categories = [
    "developer-tools",
    "analytics",
    "customer-support",
    "ecommerce",
    "marketing",
    "apis-and-integrations",
    "sales",
    "product-management",
    "monitoring-and-observability",
    "automation-and-workflow",
  ]
  const logos = [
    "/brand.png",
    "/brand.svg",
    "/analytics-1.png",
    "/analytics-2.png",
    "/analytics-3.png",
    "/opengraph.png",
    "/providers/dodo.jpeg",
    "/providers/paddle.png",
  ]
  const banners = [
    "/analytics-1.png",
    "/analytics-2.png",
    "/analytics-3.png",
    "/insights-demo.png",
    "/featured-on-light.png",
    "/featured-on-dark.png",
    "/opengraph.png",
    "/opengraph-verified-revenue.png",
  ]
  const users = [
    process.env.DEV_ADMIN_EMAIL?.trim() || DEV_SEED_DEFAULTS.adminEmail,
    process.env.DEV_MEMBER_EMAIL?.trim() || DEV_SEED_DEFAULTS.memberEmail,
    "dev.growth@shipyard.local",
  ]
  const productTypes = [
    ProductType.saas,
    ProductType.api,
    ProductType.mobile_app,
    ProductType.browser_extension,
  ]
  const pricingModels = [
    PricingModel.free,
    PricingModel.freemium,
    PricingModel.subscription,
    PricingModel.one_time,
  ]
  const descriptors = [
    "Harbor",
    "Beacon",
    "Current",
    "Forge",
    "Pilot",
    "Lens",
    "Signal",
    "Bridge",
    "Pulse",
    "Stack",
  ]
  const nouns = [
    "Launch",
    "Revenue",
    "Feedback",
    "Workflow",
    "Support",
    "Roadmap",
    "Insights",
    "Docs",
    "Pipeline",
    "Uptime",
  ]

  return Array.from({ length: resolveGeneratedProductCount() }, (_, index) => {
    const number = index + 1
    const paddedNumber = String(number).padStart(3, "0")
    const descriptor = descriptors[index % descriptors.length]
    const noun = nouns[Math.floor(index / descriptors.length) % nouns.length]
    const name = `${noun} ${descriptor} ${paddedNumber}`
    const publishedDaysAgo = generatedPublishedDaysAgo(index)
    const pricingModel = pricingModels[index % pricingModels.length]
    const isPaid =
      pricingModel === PricingModel.subscription ||
      pricingModel === PricingModel.one_time

    return {
      slug: `dev-launch-${paddedNumber}`,
      name,
      tagline: `A seeded ${noun.toLowerCase()} tool for testing large homepage launch feeds.`,
      description: `${name} is a generated development product used to exercise homepage pagination, launch sections, analytics, and cache behavior at realistic scale.`,
      websiteUrl: `https://dev-launch-${paddedNumber}.localhost`,
      logo: logos[index % logos.length],
      bannerImage: banners[index % banners.length],
      type: productTypes[index % productTypes.length],
      pricingModel,
      status: ProductStatus.published,
      startingPriceCents: isPaid ? 900 + (index % 12) * 500 : null,
      currencyCode: "USD",
      keywords: [
        noun.toLowerCase(),
        descriptor.toLowerCase(),
        "dev-seed",
        "homepage-scale",
      ],
      platforms:
        index % 7 === 0 ? [Platform.web, Platform.mac] : [Platform.web],
      userEmail: users[index % users.length],
      categorySlug: categories[index % categories.length],
      planSlug: null,
      createdDaysAgo: publishedDaysAgo + 7 + (index % 21),
      publishedDaysAgo,
      upvoteBase: 5 + ((index * 7) % 95),
      verified: index % 3 !== 0,
      backlinkVerified: index % 5 === 0,
    }
  })
}

const devProducts: DevProductSeed[] = [
  ...baseDevProducts,
  ...generatedDevProducts(),
]

async function seedReferenceData(prisma: PrismaClient) {
  await seedCategories(prisma)
  await seedUseCases(prisma)
  await seedPlanFeatures(prisma)
  await seedPlans(prisma)
  await seedRewards(prisma)
}

async function loadContext(prisma: PrismaClient): Promise<SeedContext> {
  const [users, categories, plans] = await Promise.all([
    prisma.user.findMany({
      where: {
        email: { in: devUsers().map((user) => user.email) },
      },
      select: { id: true, clerkId: true, email: true },
    }),
    prisma.category.findMany({ select: { id: true, slug: true } }),
    prisma.plan.findMany({ select: { id: true, slug: true } }),
  ])

  return {
    usersByEmail: new Map(users.map((user) => [user.email, user])),
    categoryIdBySlug: new Map(
      categories.map((category) => [category.slug, category.id]),
    ),
    planIdBySlug: new Map(plans.map((plan) => [plan.slug, plan.id])),
  }
}

async function upsertDevUsers(prisma: PrismaClient, today: Date) {
  const rows: Array<{ email: string; role: string; action: string }> = []

  for (const seed of devUsers()) {
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ clerkId: seed.clerkId }, { email: seed.email }],
      },
      select: { id: true },
    })
    const createdAt = daysAgo(today, seed.createdDaysAgo)
    const common = {
      clerkId: seed.clerkId,
      email: seed.email,
      firstName: seed.firstName,
      lastName: seed.lastName,
      role: seed.role,
      roleIntent: seed.roleIntent,
      heardFrom: seed.heardFrom,
      status:
        seed.clerkId === "dev_clerk_suspended"
          ? UserStatus.suspended
          : UserStatus.active,
      onboardedAt:
        seed.clerkId === "dev_clerk_suspended" ? null : daysAgo(today, 30),
      suspendedAt:
        seed.clerkId === "dev_clerk_suspended" ? daysAgo(today, 2) : null,
      terminatedAt: null,
      createdAt,
    }

    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: common,
      })
      rows.push({ email: seed.email, role: seed.role, action: "updated" })
    } else {
      await prisma.user.create({ data: common })
      rows.push({ email: seed.email, role: seed.role, action: "created" })
    }
  }

  if (rows.length > 50) {
    console.table(rows.slice(0, 25))
    console.info(`Seeded ${rows.length} products total.`)
  } else {
    console.table(rows)
  }
}

function buildProductData(
  seed: DevProductSeed,
  ctx: SeedContext,
  today: Date,
): Prisma.ProductUncheckedCreateInput {
  const user = ctx.usersByEmail.get(seed.userEmail)
  const categoryId = ctx.categoryIdBySlug.get(seed.categorySlug)
  const planId = seed.planSlug ? ctx.planIdBySlug.get(seed.planSlug) : null

  if (!user) throw new Error(`Missing dev user '${seed.userEmail}'`)
  if (!categoryId) throw new Error(`Missing category '${seed.categorySlug}'`)
  if (seed.planSlug && !planId)
    throw new Error(`Missing plan '${seed.planSlug}'`)

  const publishedDaysAgo =
    seed.status === ProductStatus.published
      ? (seed.publishedDaysAgo ?? 0)
      : null
  const createdDaysAgo =
    publishedDaysAgo === null
      ? seed.createdDaysAgo
      : Math.max(seed.createdDaysAgo, publishedDaysAgo + 1)
  const createdAt = daysAgo(today, createdDaysAgo)
  const publishedAt =
    publishedDaysAgo === null ? null : daysAgo(today, publishedDaysAgo)

  return {
    name: seed.name,
    slug: seed.slug,
    tagline: seed.tagline,
    description: seed.description,
    websiteUrl: seed.websiteUrl,
    logo: seed.logo,
    bannerImage: seed.bannerImage,
    userId: user.id,
    categoryId,
    planId,
    subscriptionId: seed.connector ? `sub_dev_${seed.slug}` : null,
    planAssignedAt: planId ? addUtcDays(createdAt, 1) : null,
    type: seed.type,
    pricingModel: seed.pricingModel,
    status: seed.status,
    publishedAt,
    startingPriceCents: seed.startingPriceCents,
    currencyCode: seed.currencyCode,
    keywords: seed.keywords,
    platforms: seed.platforms,
    createdAt,
    updatedAt:
      publishedAt && publishedAt > createdAt
        ? publishedAt
        : addUtcDays(createdAt, Math.min(createdDaysAgo, 3)),
  }
}

async function upsertDevProducts(
  prisma: PrismaClient,
  ctx: SeedContext,
  today: Date,
) {
  const rows: Array<{ slug: string; status: string; action: string }> = []

  for (const seed of devProducts) {
    const existing = await prisma.product.findUnique({
      where: { slug: seed.slug },
      select: { id: true },
    })
    const data = buildProductData(seed, ctx, today)

    const product = await prisma.product.upsert({
      where: { slug: seed.slug },
      create: data,
      update: {
        ...data,
        keywords: { set: seed.keywords },
        platforms: { set: seed.platforms },
      },
      select: { id: true },
    })

    await prisma.productMetadata.upsert({
      where: { productId: product.id },
      create: {
        productId: product.id,
        githubUrl: `https://github.com/shipyardhq/${seed.slug}`,
        twitterUrl: `https://x.com/${seed.slug.replaceAll("-", "")}`,
        videoUrl: `${seed.websiteUrl}/video`,
        contactEmail: `hello@${seed.slug}.local`,
        utmCampaign: `dev-${seed.slug}`,
      },
      update: {
        githubUrl: `https://github.com/shipyardhq/${seed.slug}`,
        twitterUrl: `https://x.com/${seed.slug.replaceAll("-", "")}`,
        videoUrl: `${seed.websiteUrl}/video`,
        contactEmail: `hello@${seed.slug}.local`,
        utmCampaign: `dev-${seed.slug}`,
      },
    })

    await prisma.productVerification.upsert({
      where: { productId: product.id },
      create: {
        productId: product.id,
        verificationTxt: generateVerificationTxtFromWebsite(seed.websiteUrl),
        isVerified: seed.verified,
        verifiedAt: seed.verified ? daysAgo(today, 1) : null,
        backlinkIsVerified: seed.backlinkVerified,
        backlinkVerifiedAt: seed.backlinkVerified ? daysAgo(today, 1) : null,
        backlinkLastCheckedAt: daysAgo(today, 1),
        backlinkFoundUrl: seed.backlinkVerified
          ? `${seed.websiteUrl}/shipyard`
          : null,
      },
      update: {
        verificationTxt: generateVerificationTxtFromWebsite(seed.websiteUrl),
        isVerified: seed.verified,
        verifiedAt: seed.verified ? daysAgo(today, 1) : null,
        backlinkIsVerified: seed.backlinkVerified,
        backlinkVerifiedAt: seed.backlinkVerified ? daysAgo(today, 1) : null,
        backlinkLastCheckedAt: daysAgo(today, 1),
        backlinkFoundUrl: seed.backlinkVerified
          ? `${seed.websiteUrl}/shipyard`
          : null,
        backlinkLastError: seed.backlinkVerified
          ? null
          : "Dev fixture: backlink not found",
      },
    })

    await prisma.productAnalytics.upsert({
      where: { productId: product.id },
      create: { productId: product.id, upvotes: seed.upvoteBase },
      update: { upvotes: seed.upvoteBase },
    })

    rows.push({
      slug: seed.slug,
      status: seed.status,
      action: existing ? "updated" : "created",
    })
  }

  if (rows.length > 50) {
    console.table(rows.slice(0, 25))
    console.info(`Seeded ${rows.length} products total.`)
  } else {
    console.table(rows)
  }
}

async function resetProductDecorations(
  prisma: PrismaClient,
  productIdBySlug: Map<string, string>,
  today: Date,
) {
  const productIds = Array.from(productIdBySlug.values())

  await Promise.all([
    prisma.productMedia.deleteMany({
      where: { productId: { in: productIds } },
    }),
    prisma.productBadge.deleteMany({
      where: { productId: { in: productIds } },
    }),
  ])

  await prisma.productMedia.createMany({
    data: devProducts.flatMap((product) => {
      const productId = productIdBySlug.get(product.slug)
      if (!productId) return []
      return [
        {
          productId,
          imageUrl: product.bannerImage,
          altText: `${product.name} dashboard preview`,
        },
        {
          productId,
          imageUrl: "/insights-demo.png",
          altText: `${product.name} analytics view`,
        },
      ]
    }),
  })

  await prisma.productBadge.createMany({
    data: devProducts.flatMap((product, index) => {
      const productId = productIdBySlug.get(product.slug)
      if (!productId || product.status !== ProductStatus.published) return []

      const badges: Prisma.ProductBadgeCreateManyInput[] = [
        {
          productId,
          badge: "new",
          expiresAt: addUtcDays(today, Math.max(1, 10 - index)),
        },
      ]
      if (index < 3) {
        badges.push({
          productId,
          badge: "featured",
          expiresAt: addUtcDays(today, 7 + index),
        })
      }
      if (index === 0) {
        badges.push({ productId, badge: "editor-pick", expiresAt: null })
      }
      if (index === 1) {
        badges.push({
          productId,
          badge: "trending",
          expiresAt: addUtcDays(today, 1),
        })
      }
      return badges
    }),
  })
}

async function seedUpvotes(
  prisma: PrismaClient,
  ctx: SeedContext,
  productIdBySlug: Map<string, string>,
  today: Date,
) {
  const devUserIds = Array.from(ctx.usersByEmail.values()).map(
    (user) => user.id,
  )
  const productIds = Array.from(productIdBySlug.values())

  await prisma.productUpvote.deleteMany({
    where: {
      productId: { in: productIds },
      userId: { in: devUserIds },
    },
  })

  const productSeeds = devProducts.filter(
    (product) => product.status === ProductStatus.published,
  )
  const upvotes = productSeeds.flatMap((product, productIndex) => {
    const productId = productIdBySlug.get(product.slug)
    if (!productId) return []
    return devUserIds
      .filter((_, userIndex) => (productIndex + userIndex) % 2 === 0)
      .map((userId, userIndex) => ({
        productId,
        userId,
        createdAt: daysAgo(today, (productIndex + userIndex) % 13),
      }))
  })

  if (upvotes.length) {
    await prisma.productUpvote.createMany({
      data: upvotes,
      skipDuplicates: true,
    })
  }

  for (const product of devProducts) {
    const productId = productIdBySlug.get(product.slug)
    if (!productId) continue
    const liveUpvotes = await prisma.productUpvote.count({
      where: { productId },
    })
    await prisma.productAnalytics.upsert({
      where: { productId },
      create: { productId, upvotes: product.upvoteBase + liveUpvotes },
      update: { upvotes: product.upvoteBase + liveUpvotes },
    })
  }
}

async function seedPaymentConnectors(
  prisma: PrismaClient,
  productIdBySlug: Map<string, string>,
  today: Date,
) {
  const monthStart = startOfUtcMonth(today)
  const connectorRows: Array<{ product: string; provider: string }> = []

  for (const product of devProducts) {
    if (!product.connector) continue
    const productId = productIdBySlug.get(product.slug)
    if (!productId) continue

    const connector = await prisma.paymentConnector.upsert({
      where: { productId },
      create: {
        productId,
        provider: product.connector.provider,
        status: PaymentConnectorStatus.active,
        config: json({ mode: "dev", seeded: true }),
        lastSyncedAt: daysAgo(today, 0),
        verifiedAt: daysAgo(today, 2),
        latestAllTimeRevenueCents: product.connector.allTimeRevenueCents,
        latestCurrencyCode: product.connector.currencyCode,
        latestPeriodStart: monthStart,
      },
      update: {
        provider: product.connector.provider,
        status: PaymentConnectorStatus.active,
        config: json({ mode: "dev", seeded: true }),
        lastSyncedAt: daysAgo(today, 0),
        lastSyncError: null,
        verifiedAt: daysAgo(today, 2),
        latestAllTimeRevenueCents: product.connector.allTimeRevenueCents,
        latestCurrencyCode: product.connector.currencyCode,
        latestPeriodStart: monthStart,
      },
      select: { id: true },
    })

    await Promise.all([
      prisma.paymentConnectorCredential.deleteMany({
        where: { connectorId: connector.id },
      }),
      prisma.paymentRevenueSnapshot.deleteMany({
        where: { connectorId: connector.id },
      }),
    ])

    await prisma.paymentConnectorCredential.create({
      data: {
        connectorId: connector.id,
        status: PaymentCredentialStatus.active,
        encryptionVersion: 1,
        encryptedKey: "dev-encrypted-key-placeholder",
        keyHint: "dev_****_seed",
      },
    })

    await prisma.paymentRevenueSnapshot.createMany({
      data: [2, 1, 0].map((monthsAgo, index) => ({
        connectorId: connector.id,
        currencyCode: product.connector!.currencyCode,
        periodStart: addUtcMonths(monthStart, -monthsAgo),
        periodRevenueCents:
          product.connector!.latestPeriodRevenueCents - (2 - index) * 2_100,
        allTimeRevenueCents:
          product.connector!.allTimeRevenueCents - monthsAgo * 11_200,
        data: json({
          seeded: true,
          subscriptions: 12 + index * 4,
          refunds: index,
        }),
      })),
    })

    connectorRows.push({
      product: product.slug,
      provider: product.connector.provider,
    })
  }

  console.table(connectorRows)
}

function productTrafficForDay(seed: DevProductSeed, index: number) {
  const base =
    seed.status === ProductStatus.published ? seed.upvoteBase + 60 : 8
  const wave = (index % 7) * 9
  const decay = Math.max(0, 60 - index)
  const pageViews = Math.max(3, base + wave + Math.floor(decay / 2))
  const uniqueVisitors = Math.max(2, Math.round(pageViews * 0.58))
  const sessions = Math.max(uniqueVisitors, Math.round(pageViews * 0.72))
  const newUsers = Math.round(uniqueVisitors * 0.64)

  return {
    pageViews,
    uniqueVisitors,
    sessions,
    bounceRate: round(0.28 + (index % 5) * 0.035),
    averageSessionDuration: 58 + (index % 6) * 11,
    newUsers,
    returningVisitors: Math.max(0, uniqueVisitors - newUsers),
    engagementRate: round(0.62 + (index % 4) * 0.04),
    pagesPerSession: round(pageViews / sessions),
  }
}

async function seedIngestionCoverage(
  prisma: PrismaClient,
  windowStart: Date,
  windowEnd: Date,
) {
  const jobs = [
    AnalyticsIngestionJob.product_traffic_daily,
    AnalyticsIngestionJob.product_traffic_breakdowns,
    AnalyticsIngestionJob.site_traffic_daily,
    AnalyticsIngestionJob.site_traffic_breakdowns,
  ]

  for (const job of jobs) {
    await prisma.analyticsIngestionRun.upsert({
      where: {
        source_job_windowStart_windowEnd: {
          source: AnalyticsDataSource.ga4,
          job,
          windowStart,
          windowEnd,
        },
      },
      create: {
        source: AnalyticsDataSource.ga4,
        job,
        status: AnalyticsIngestionStatus.completed,
        windowStart,
        windowEnd,
        startedAt: windowStart,
        finishedAt: new Date(),
        stats: json({ seeded: true, days: 60 }),
      },
      update: {
        status: AnalyticsIngestionStatus.completed,
        finishedAt: new Date(),
        stats: json({ seeded: true, days: 60 }),
        error: null,
      },
    })
  }
}

async function seedTraffic(
  prisma: PrismaClient,
  productIdBySlug: Map<string, string>,
  today: Date,
) {
  const windowStart = daysAgo(today, 59)
  const windowEnd = today
  const productIds = Array.from(productIdBySlug.values())

  await seedIngestionCoverage(prisma, windowStart, windowEnd)

  await Promise.all([
    prisma.productTrafficDaily.deleteMany({
      where: {
        productId: { in: productIds },
        date: { gte: windowStart, lte: windowEnd },
      },
    }),
    prisma.productTrafficReferrerDaily.deleteMany({
      where: {
        productId: { in: productIds },
        date: { gte: windowStart, lte: windowEnd },
      },
    }),
    prisma.productTrafficChannelDaily.deleteMany({
      where: {
        productId: { in: productIds },
        date: { gte: windowStart, lte: windowEnd },
      },
    }),
    prisma.productTrafficBrowserDaily.deleteMany({
      where: {
        productId: { in: productIds },
        date: { gte: windowStart, lte: windowEnd },
      },
    }),
    prisma.productTrafficOperatingSystemDaily.deleteMany({
      where: {
        productId: { in: productIds },
        date: { gte: windowStart, lte: windowEnd },
      },
    }),
    prisma.productTrafficDeviceDaily.deleteMany({
      where: {
        productId: { in: productIds },
        date: { gte: windowStart, lte: windowEnd },
      },
    }),
    prisma.productTrafficCountryDaily.deleteMany({
      where: {
        productId: { in: productIds },
        date: { gte: windowStart, lte: windowEnd },
      },
    }),
    prisma.productTrafficCityDaily.deleteMany({
      where: {
        productId: { in: productIds },
        date: { gte: windowStart, lte: windowEnd },
      },
    }),
    prisma.siteTrafficDaily.deleteMany({
      where: { date: { gte: windowStart, lte: windowEnd } },
    }),
    prisma.siteTrafficReferrerDaily.deleteMany({
      where: { date: { gte: windowStart, lte: windowEnd } },
    }),
    prisma.siteTrafficBrowserDaily.deleteMany({
      where: { date: { gte: windowStart, lte: windowEnd } },
    }),
    prisma.siteTrafficOperatingSystemDaily.deleteMany({
      where: { date: { gte: windowStart, lte: windowEnd } },
    }),
    prisma.siteTrafficDeviceDaily.deleteMany({
      where: { date: { gte: windowStart, lte: windowEnd } },
    }),
    prisma.siteTrafficCountryDaily.deleteMany({
      where: { date: { gte: windowStart, lte: windowEnd } },
    }),
    prisma.siteTrafficRegionDaily.deleteMany({
      where: { date: { gte: windowStart, lte: windowEnd } },
    }),
    prisma.siteTrafficCityDaily.deleteMany({
      where: { date: { gte: windowStart, lte: windowEnd } },
    }),
  ])

  const siteDailyByDate = new Map<string, SiteTrafficTotals>()
  const productEntries = devProducts.flatMap((product) => {
    const productId = productIdBySlug.get(product.slug)
    return productId ? [{ product, productId }] : []
  })
  const productChunkSize = 50

  for (
    let chunkStart = 0;
    chunkStart < productEntries.length;
    chunkStart += productChunkSize
  ) {
    const productDaily: Prisma.ProductTrafficDailyCreateManyInput[] = []
    const productReferrers: Prisma.ProductTrafficReferrerDailyCreateManyInput[] =
      []
    const productChannels: Prisma.ProductTrafficChannelDailyCreateManyInput[] =
      []
    const productBrowsers: Prisma.ProductTrafficBrowserDailyCreateManyInput[] =
      []
    const productOs: Prisma.ProductTrafficOperatingSystemDailyCreateManyInput[] =
      []
    const productDevices: Prisma.ProductTrafficDeviceDailyCreateManyInput[] = []
    const productCountries: Prisma.ProductTrafficCountryDailyCreateManyInput[] =
      []
    const productCities: Prisma.ProductTrafficCityDailyCreateManyInput[] = []
    const productChunk = productEntries.slice(
      chunkStart,
      chunkStart + productChunkSize,
    )

    for (let index = 0; index < 60; index += 1) {
      const date = addUtcDays(windowStart, index)
      const dateKey = date.toISOString()

      for (const { product, productId } of productChunk) {
        const metrics = productTrafficForDay(product, index)

        productDaily.push({
          productId,
          date,
          source: AnalyticsDataSource.ga4,
          ...metrics,
        })

        productReferrers.push(
          {
            productId,
            date,
            source: AnalyticsDataSource.ga4,
            referrer: "google.com",
            pageViews: Math.round(metrics.pageViews * 0.36),
          },
          {
            productId,
            date,
            source: AnalyticsDataSource.ga4,
            referrer: "x.com",
            pageViews: Math.round(metrics.pageViews * 0.18),
          },
          {
            productId,
            date,
            source: AnalyticsDataSource.ga4,
            referrer: "(direct)",
            pageViews: Math.round(metrics.pageViews * 0.24),
          },
        )

        productChannels.push(
          {
            productId,
            date,
            source: AnalyticsDataSource.ga4,
            channel: "Organic Search",
            pageViews: Math.round(metrics.pageViews * 0.42),
          },
          {
            productId,
            date,
            source: AnalyticsDataSource.ga4,
            channel: "Social",
            pageViews: Math.round(metrics.pageViews * 0.22),
          },
          {
            productId,
            date,
            source: AnalyticsDataSource.ga4,
            channel: "Direct",
            pageViews: Math.round(metrics.pageViews * 0.26),
          },
        )

        productBrowsers.push(
          {
            productId,
            date,
            source: AnalyticsDataSource.ga4,
            browser: "Chrome",
            visitors: Math.round(metrics.uniqueVisitors * 0.58),
          },
          {
            productId,
            date,
            source: AnalyticsDataSource.ga4,
            browser: "Safari",
            visitors: Math.round(metrics.uniqueVisitors * 0.27),
          },
          {
            productId,
            date,
            source: AnalyticsDataSource.ga4,
            browser: "Firefox",
            visitors: Math.round(metrics.uniqueVisitors * 0.11),
          },
        )

        productOs.push(
          {
            productId,
            date,
            source: AnalyticsDataSource.ga4,
            operatingSystem: "macOS",
            visitors: Math.round(metrics.uniqueVisitors * 0.43),
          },
          {
            productId,
            date,
            source: AnalyticsDataSource.ga4,
            operatingSystem: "Windows",
            visitors: Math.round(metrics.uniqueVisitors * 0.31),
          },
          {
            productId,
            date,
            source: AnalyticsDataSource.ga4,
            operatingSystem: "iOS",
            visitors: Math.round(metrics.uniqueVisitors * 0.16),
          },
        )

        productDevices.push(
          {
            productId,
            date,
            source: AnalyticsDataSource.ga4,
            deviceCategory: "desktop",
            visitors: Math.round(metrics.uniqueVisitors * 0.62),
          },
          {
            productId,
            date,
            source: AnalyticsDataSource.ga4,
            deviceCategory: "mobile",
            visitors: Math.round(metrics.uniqueVisitors * 0.32),
          },
          {
            productId,
            date,
            source: AnalyticsDataSource.ga4,
            deviceCategory: "tablet",
            visitors: Math.round(metrics.uniqueVisitors * 0.06),
          },
        )

        productCountries.push(
          {
            productId,
            date,
            source: AnalyticsDataSource.ga4,
            country: "United States",
            countryCode: "US",
            visitors: Math.round(metrics.uniqueVisitors * 0.45),
          },
          {
            productId,
            date,
            source: AnalyticsDataSource.ga4,
            country: "India",
            countryCode: "IN",
            visitors: Math.round(metrics.uniqueVisitors * 0.25),
          },
          {
            productId,
            date,
            source: AnalyticsDataSource.ga4,
            country: "United Kingdom",
            countryCode: "GB",
            visitors: Math.round(metrics.uniqueVisitors * 0.12),
          },
        )

        productCities.push(
          {
            productId,
            date,
            source: AnalyticsDataSource.ga4,
            city: "San Francisco",
            region: "California",
            country: "United States",
            countryCode: "US",
            visitors: Math.round(metrics.uniqueVisitors * 0.18),
          },
          {
            productId,
            date,
            source: AnalyticsDataSource.ga4,
            city: "Bengaluru",
            region: "Karnataka",
            country: "India",
            countryCode: "IN",
            visitors: Math.round(metrics.uniqueVisitors * 0.14),
          },
        )

        const siteMetrics = siteDailyByDate.get(dateKey) ?? {
          pageViews: 180,
          uniqueVisitors: 92,
          sessions: 120,
          bounceRate: 0,
          averageSessionDuration: 0,
          newUsers: 48,
          returningVisitors: 44,
          engagementRate: 0,
          pagesPerSession: 0,
        }
        siteMetrics.pageViews += metrics.pageViews
        siteMetrics.uniqueVisitors += metrics.uniqueVisitors
        siteMetrics.sessions += metrics.sessions
        siteMetrics.newUsers += metrics.newUsers
        siteMetrics.returningVisitors += metrics.returningVisitors
        siteMetrics.bounceRate += metrics.bounceRate * metrics.sessions
        siteMetrics.averageSessionDuration +=
          metrics.averageSessionDuration * metrics.sessions
        siteMetrics.engagementRate += metrics.engagementRate * metrics.sessions
        siteDailyByDate.set(dateKey, siteMetrics)
      }
    }

    await Promise.all([
      prisma.productTrafficDaily.createMany({ data: productDaily }),
      prisma.productTrafficReferrerDaily.createMany({ data: productReferrers }),
      prisma.productTrafficChannelDaily.createMany({ data: productChannels }),
      prisma.productTrafficBrowserDaily.createMany({ data: productBrowsers }),
      prisma.productTrafficOperatingSystemDaily.createMany({ data: productOs }),
      prisma.productTrafficDeviceDaily.createMany({ data: productDevices }),
      prisma.productTrafficCountryDaily.createMany({ data: productCountries }),
      prisma.productTrafficCityDaily.createMany({ data: productCities }),
    ])
  }

  const siteDaily = Array.from(siteDailyByDate.entries()).map(
    ([key, metrics]) => {
      const bounceRate = metrics.sessions
        ? round(metrics.bounceRate / metrics.sessions)
        : 0
      const averageSessionDuration = metrics.sessions
        ? round(metrics.averageSessionDuration / metrics.sessions)
        : 0
      const engagementRate = metrics.sessions
        ? round(metrics.engagementRate / metrics.sessions)
        : 0

      return {
        date: new Date(key),
        source: AnalyticsDataSource.ga4,
        pageViews: metrics.pageViews,
        uniqueVisitors: metrics.uniqueVisitors,
        sessions: metrics.sessions,
        bounceRate,
        averageSessionDuration,
        newUsers: metrics.newUsers,
        returningVisitors: metrics.returningVisitors,
        engagementRate,
        pagesPerSession: round(metrics.pageViews / metrics.sessions),
      } satisfies Prisma.SiteTrafficDailyCreateManyInput
    },
  )

  await prisma.siteTrafficDaily.createMany({ data: siteDaily })

  const siteBreakdownRows = siteDaily.flatMap((row) => [
    {
      date: row.date,
      source: AnalyticsDataSource.ga4,
      referrer: "google.com",
      pageViews: Math.round(row.pageViews * 0.34),
    },
    {
      date: row.date,
      source: AnalyticsDataSource.ga4,
      referrer: "x.com",
      pageViews: Math.round(row.pageViews * 0.19),
    },
    {
      date: row.date,
      source: AnalyticsDataSource.ga4,
      referrer: "(direct)",
      pageViews: Math.round(row.pageViews * 0.29),
    },
  ])

  await Promise.all([
    prisma.siteTrafficReferrerDaily.createMany({ data: siteBreakdownRows }),
    prisma.siteTrafficBrowserDaily.createMany({
      data: siteDaily.flatMap((row) => [
        {
          date: row.date,
          source: AnalyticsDataSource.ga4,
          browser: "Chrome",
          visitors: Math.round(row.uniqueVisitors * 0.59),
        },
        {
          date: row.date,
          source: AnalyticsDataSource.ga4,
          browser: "Safari",
          visitors: Math.round(row.uniqueVisitors * 0.26),
        },
      ]),
    }),
    prisma.siteTrafficOperatingSystemDaily.createMany({
      data: siteDaily.flatMap((row) => [
        {
          date: row.date,
          source: AnalyticsDataSource.ga4,
          operatingSystem: "macOS",
          visitors: Math.round(row.uniqueVisitors * 0.41),
        },
        {
          date: row.date,
          source: AnalyticsDataSource.ga4,
          operatingSystem: "Windows",
          visitors: Math.round(row.uniqueVisitors * 0.34),
        },
      ]),
    }),
    prisma.siteTrafficDeviceDaily.createMany({
      data: siteDaily.flatMap((row) => [
        {
          date: row.date,
          source: AnalyticsDataSource.ga4,
          deviceCategory: "desktop",
          visitors: Math.round(row.uniqueVisitors * 0.64),
        },
        {
          date: row.date,
          source: AnalyticsDataSource.ga4,
          deviceCategory: "mobile",
          visitors: Math.round(row.uniqueVisitors * 0.31),
        },
      ]),
    }),
    prisma.siteTrafficCountryDaily.createMany({
      data: siteDaily.flatMap((row) => [
        {
          date: row.date,
          source: AnalyticsDataSource.ga4,
          country: "United States",
          countryCode: "US",
          visitors: Math.round(row.uniqueVisitors * 0.43),
        },
        {
          date: row.date,
          source: AnalyticsDataSource.ga4,
          country: "India",
          countryCode: "IN",
          visitors: Math.round(row.uniqueVisitors * 0.24),
        },
      ]),
    }),
    prisma.siteTrafficRegionDaily.createMany({
      data: siteDaily.flatMap((row) => [
        {
          date: row.date,
          source: AnalyticsDataSource.ga4,
          region: "California",
          country: "United States",
          countryCode: "US",
          visitors: Math.round(row.uniqueVisitors * 0.18),
        },
        {
          date: row.date,
          source: AnalyticsDataSource.ga4,
          region: "Karnataka",
          country: "India",
          countryCode: "IN",
          visitors: Math.round(row.uniqueVisitors * 0.14),
        },
      ]),
    }),
    prisma.siteTrafficCityDaily.createMany({
      data: siteDaily.flatMap((row) => [
        {
          date: row.date,
          source: AnalyticsDataSource.ga4,
          city: "San Francisco",
          region: "California",
          country: "United States",
          countryCode: "US",
          visitors: Math.round(row.uniqueVisitors * 0.14),
        },
        {
          date: row.date,
          source: AnalyticsDataSource.ga4,
          city: "Bengaluru",
          region: "Karnataka",
          country: "India",
          countryCode: "IN",
          visitors: Math.round(row.uniqueVisitors * 0.11),
        },
      ]),
    }),
  ])

  console.table([{ metric: "traffic_days", count: siteDaily.length }])
}

async function seedRewardsState(
  prisma: PrismaClient,
  ctx: SeedContext,
  productIdBySlug: Map<string, string>,
  today: Date,
) {
  const devUserIds = Array.from(ctx.usersByEmail.values()).map(
    (user) => user.id,
  )
  const productIds = Array.from(productIdBySlug.values())

  await prisma.placementSchedule.deleteMany({
    where: { productId: { in: productIds } },
  })
  await prisma.featureEntitlement.deleteMany({
    where: { userId: { in: devUserIds } },
  })
  await prisma.redemption.deleteMany({
    where: { userId: { in: devUserIds } },
  })
  await prisma.rewardTransaction.deleteMany({
    where: { userId: { in: devUserIds }, sourceType: DEV_SOURCE_TYPE },
  })

  const catalog = await prisma.rewardCatalogItem.findMany({
    where: {
      featureKey: {
        in: [
          REWARD_FEATURE_KEY.priorityPlacement,
          REWARD_FEATURE_KEY.analyticsAdvanced,
          REWARD_FEATURE_KEY.partnerSpotlight,
        ],
      },
    },
    select: { featureKey: true, baseCost: true },
  })
  const catalogByKey = new Map(catalog.map((item) => [item.featureKey, item]))

  const admin = ctx.usersByEmail.get(
    process.env.DEV_ADMIN_EMAIL?.trim() || DEV_SEED_DEFAULTS.adminEmail,
  )
  const member = ctx.usersByEmail.get(
    process.env.DEV_MEMBER_EMAIL?.trim() || DEV_SEED_DEFAULTS.memberEmail,
  )
  const dockPilotId = productIdBySlug.get("dev-dockpilot")
  const supportTideId = productIdBySlug.get("dev-support-tide")

  if (!admin || !member || !dockPilotId || !supportTideId) return

  const activeFeature = catalogByKey.get(REWARD_FEATURE_KEY.priorityPlacement)
  const analyticsFeature = catalogByKey.get(
    REWARD_FEATURE_KEY.analyticsAdvanced,
  )
  const partnerSpotlightFeature = catalogByKey.get(
    REWARD_FEATURE_KEY.partnerSpotlight,
  )
  if (!activeFeature || !analyticsFeature || !partnerSpotlightFeature) return

  const activeRedemption = await prisma.redemption.create({
    data: {
      userId: member.id,
      featureKey: activeFeature.featureKey,
      productId: supportTideId,
      status: RedemptionStatus.active,
      cost: activeFeature.baseCost,
      originalCost: activeFeature.baseCost,
      startsAt: daysAgo(today, 1),
      activatedAt: daysAgo(today, 1),
      expiresAt: addUtcDays(today, 1),
      metadata: json({ seeded: true }),
    },
  })
  const activeEntitlement = await prisma.featureEntitlement.create({
    data: {
      userId: member.id,
      featureKey: activeFeature.featureKey,
      redemptionId: activeRedemption.id,
      productId: supportTideId,
      subjectType: FeatureSubjectType.product,
      subjectId: supportTideId,
      status: FeatureEntitlementStatus.active,
      startsAt: daysAgo(today, 1),
      activatedAt: daysAgo(today, 1),
      expiresAt: addUtcDays(today, 1),
      metadata: json({ seeded: true }),
    },
  })
  await prisma.placementSchedule.create({
    data: {
      entitlementId: activeEntitlement.id,
      redemptionId: activeRedemption.id,
      featureKey: activeFeature.featureKey,
      productId: supportTideId,
      slotKey: "priority:homepage",
      status: PlacementStatus.active,
      startsAt: daysAgo(today, 1),
      endsAt: addUtcDays(today, 1),
      inventoryToken: "dev-seed-priority-support-tide",
      metadata: json({ seeded: true }),
    },
  })

  const analyticsRedemption = await prisma.redemption.create({
    data: {
      userId: admin.id,
      featureKey: analyticsFeature.featureKey,
      productId: dockPilotId,
      status: RedemptionStatus.active,
      cost: analyticsFeature.baseCost,
      originalCost: analyticsFeature.baseCost,
      startsAt: daysAgo(today, 5),
      activatedAt: daysAgo(today, 5),
      expiresAt: addUtcDays(today, 25),
      metadata: json({ seeded: true }),
    },
  })
  await prisma.featureEntitlement.create({
    data: {
      userId: admin.id,
      featureKey: analyticsFeature.featureKey,
      redemptionId: analyticsRedemption.id,
      productId: dockPilotId,
      subjectType: FeatureSubjectType.product,
      subjectId: dockPilotId,
      status: FeatureEntitlementStatus.active,
      startsAt: daysAgo(today, 5),
      activatedAt: daysAgo(today, 5),
      expiresAt: addUtcDays(today, 25),
      metadata: json({ seeded: true }),
    },
  })

  const pendingRedemption = await prisma.redemption.create({
    data: {
      userId: member.id,
      featureKey: partnerSpotlightFeature.featureKey,
      productId: supportTideId,
      status: RedemptionStatus.pending,
      cost: partnerSpotlightFeature.baseCost,
      originalCost: partnerSpotlightFeature.baseCost,
      startsAt: addUtcDays(today, 2),
      expiresAt: addUtcDays(today, 4),
      metadata: json({ seeded: true }),
    },
  })
  const pendingEntitlement = await prisma.featureEntitlement.create({
    data: {
      userId: member.id,
      featureKey: partnerSpotlightFeature.featureKey,
      redemptionId: pendingRedemption.id,
      productId: supportTideId,
      subjectType: FeatureSubjectType.product,
      subjectId: supportTideId,
      status: FeatureEntitlementStatus.pending,
      startsAt: addUtcDays(today, 2),
      expiresAt: addUtcDays(today, 4),
      metadata: json({ seeded: true }),
    },
  })
  await prisma.placementSchedule.create({
    data: {
      entitlementId: pendingEntitlement.id,
      redemptionId: pendingRedemption.id,
      featureKey: partnerSpotlightFeature.featureKey,
      productId: supportTideId,
      slotKey: "partner-spotlight:global",
      status: PlacementStatus.scheduled,
      startsAt: addUtcDays(today, 2),
      endsAt: addUtcDays(today, 4),
      inventoryToken: "dev-seed-partner-spotlight-support-tide",
      metadata: json({ seeded: true }),
    },
  })

  const balances = [
    {
      userId: admin.id,
      balance: 720,
      lifetimeEarned: 980,
      lifetimeSpent: analyticsFeature.baseCost,
      currentStreakCount: 6,
      longestStreakCount: 9,
      currentStreakTier: "silver",
    },
    {
      userId: member.id,
      balance: 430,
      lifetimeEarned: 780,
      lifetimeSpent: activeFeature.baseCost + partnerSpotlightFeature.baseCost,
      currentStreakCount: 4,
      longestStreakCount: 4,
      currentStreakTier: "bronze",
    },
  ]

  for (const balance of balances) {
    await prisma.rewardBalance.upsert({
      where: { userId: balance.userId },
      create: {
        ...balance,
        lifetimeAdjusted: 0,
        lifetimeRefunded: 0,
        streakActiveThrough: addUtcDays(today, 1),
        lastEarnedAt: daysAgo(today, 0),
        lastRedeemedAt: daysAgo(today, 1),
        lastEvaluatedAt: daysAgo(today, 0),
      },
      update: {
        ...balance,
        lifetimeAdjusted: 0,
        lifetimeRefunded: 0,
        streakActiveThrough: addUtcDays(today, 1),
        lastEarnedAt: daysAgo(today, 0),
        lastRedeemedAt: daysAgo(today, 1),
        lastEvaluatedAt: daysAgo(today, 0),
      },
    })
  }

  await prisma.rewardTransaction.createMany({
    data: [
      {
        userId: admin.id,
        type: RewardTransactionType.earn,
        rewardAmount: 980,
        balanceAfter: 980,
        ruleKey: "rewards.product.create",
        eventHash: "dev-seed:admin:earn",
        sourceType: DEV_SOURCE_TYPE,
        sourceId: "admin-earn",
        notes: "Seeded admin rewards",
        createdAt: daysAgo(today, 6),
      },
      {
        userId: admin.id,
        type: RewardTransactionType.spend,
        rewardAmount: -analyticsFeature.baseCost,
        balanceAfter: 720,
        rewardKey: analyticsFeature.featureKey,
        redemptionId: analyticsRedemption.id,
        productId: dockPilotId,
        eventHash: "dev-seed:admin:spend:analytics",
        sourceType: DEV_SOURCE_TYPE,
        sourceId: analyticsRedemption.id,
        notes: "Seeded advanced analytics redemption",
        createdAt: daysAgo(today, 5),
      },
      {
        userId: member.id,
        type: RewardTransactionType.spend,
        rewardAmount: -activeFeature.baseCost,
        balanceAfter: 630,
        rewardKey: activeFeature.featureKey,
        redemptionId: activeRedemption.id,
        productId: supportTideId,
        eventHash: "dev-seed:member:spend:priority",
        sourceType: DEV_SOURCE_TYPE,
        sourceId: activeRedemption.id,
        notes: "Seeded priority placement redemption",
        createdAt: daysAgo(today, 1),
      },
      {
        userId: member.id,
        type: RewardTransactionType.spend,
        rewardAmount: -partnerSpotlightFeature.baseCost,
        balanceAfter: 430,
        rewardKey: partnerSpotlightFeature.featureKey,
        redemptionId: pendingRedemption.id,
        productId: supportTideId,
        eventHash: "dev-seed:member:spend:partner-spotlight",
        sourceType: DEV_SOURCE_TYPE,
        sourceId: pendingRedemption.id,
        notes: "Seeded partner spotlight redemption",
        createdAt: daysAgo(today, 0),
      },
    ],
    skipDuplicates: true,
  })
}

async function seedLeaderboard(
  prisma: PrismaClient,
  productIdBySlug: Map<string, string>,
  today: Date,
) {
  const periodStart = startOfUtcMonth(today)
  const periodEnd = addUtcMonths(periodStart, 1)

  const run = await prisma.leaderboardRun.upsert({
    where: {
      periodStart_periodEnd: { periodStart, periodEnd },
    },
    create: {
      periodStart,
      periodEnd,
      status: LeaderboardRunStatus.finalized,
    },
    update: { status: LeaderboardRunStatus.finalized },
    select: { id: true },
  })

  const productIds = Array.from(productIdBySlug.values())
  const [traffic, upvotes] = await Promise.all([
    prisma.productTrafficDaily.groupBy({
      by: ["productId"],
      where: {
        productId: { in: productIds },
        date: { gte: periodStart, lt: periodEnd },
      },
      _sum: { pageViews: true, uniqueVisitors: true },
    }),
    prisma.productUpvote.groupBy({
      by: ["productId"],
      where: {
        productId: { in: productIds },
        createdAt: { gte: periodStart, lt: periodEnd },
      },
      _count: { productId: true },
    }),
  ])

  const upvotesByProduct = new Map(
    upvotes.map((row) => [row.productId, row._count.productId]),
  )
  const scores = traffic
    .map((row) => {
      const views = row._sum.pageViews ?? 0
      const uniqueVisitors = row._sum.uniqueVisitors ?? 0
      const productUpvotes = upvotesByProduct.get(row.productId) ?? 0
      return {
        productId: row.productId,
        views,
        uniqueVisitors,
        upvotes: productUpvotes,
        score: views + uniqueVisitors * 3 + productUpvotes * 10,
      }
    })
    .sort((a, b) => b.score - a.score)

  await prisma.productLeaderboardScore.deleteMany({ where: { runId: run.id } })
  if (scores.length) {
    await prisma.productLeaderboardScore.createMany({
      data: scores.map((score, index) => ({
        runId: run.id,
        productId: score.productId,
        views: score.views,
        uniqueVisitors: score.uniqueVisitors,
        upvotes: score.upvotes,
        score: score.score,
        scoreComponents: json({
          views: score.views,
          uniqueVisitors: score.uniqueVisitors,
          upvotes: score.upvotes,
        }),
        rank: index + 1,
      })),
    })
  }
}

async function main() {
  const prisma = await prismaPromise
  const today = utcStartOfDay(new Date())

  await seedReferenceData(prisma)
  await upsertDevUsers(prisma, today)
  const ctx = await loadContext(prisma)

  await upsertDevProducts(prisma, ctx, today)

  const products = await prisma.product.findMany({
    where: { slug: { in: devProducts.map((product) => product.slug) } },
    select: { id: true, slug: true },
  })
  const productIdBySlug = new Map(
    products.map((product) => [product.slug, product.id]),
  )

  await resetProductDecorations(prisma, productIdBySlug, today)
  await seedUpvotes(prisma, ctx, productIdBySlug, today)
  await seedPaymentConnectors(prisma, productIdBySlug, today)
  await seedTraffic(prisma, productIdBySlug, today)
  await seedRewardsState(prisma, ctx, productIdBySlug, today)
  await seedLeaderboard(prisma, productIdBySlug, today)

  await seedAlternatives(prisma, {
    categoryIdBySlug: ctx.categoryIdBySlug,
    productIdBySlug,
  })

  console.info("Dev seed complete.")
  console.info(
    "For authenticated localhost testing, set DEV_ADMIN_CLERK_ID or DEV_MEMBER_CLERK_ID to your Clerk user id before running the seed.",
  )
}

const invokedDirectly = (() => {
  if (!process.argv[1]) return false
  const cliUrl = pathToFileURL(path.resolve(process.argv[1])).href
  return import.meta.url === cliUrl
})()

if (invokedDirectly) {
  prismaPromise
    .then(() => main())
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
    .finally(async () => {
      const prisma = await prismaPromise
      await prisma.$disconnect()
    })
}

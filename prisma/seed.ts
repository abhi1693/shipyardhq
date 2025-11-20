import {
  DeviceCategory,
  Platform,
  Prisma,
  ProductStatus,
  ProductType,
  ProductUpdateStatus,
  PricingModel,
  PaymentConnectorProvider,
  PaymentConnectorStatus,
  PaymentCredentialStatus,
} from "@/lib/vendor/prisma/client"
import { PRICING_PATH } from "@/lib/routes"
import type { PrismaClient } from "@/lib/vendor/prisma/client"
import { loadEnvConfig } from "@next/env"
import {
  addDays,
  addHours,
  addMinutes,
  addMonths,
  addWeeks,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns"

import {
  buildConnectorKeyHint,
  encryptConnectorSecret,
} from "@/lib/server/payments/connectorSecrets"

import { seedAlternatives } from "./seed.alternatives"
import { seedCategories } from "./seed.categories"
import { seedPlanFeatures } from "./seed.plan-features"
import { seedPlans } from "./seed.plans"
import { seedRewards } from "./seed.rewards"
import { seedUseCases } from "./seed.use-cases"

const prismaPromise = import("@/lib/prisma").then(
  (module) => module.default as PrismaClient,
)
let prisma: PrismaClient

type ProductSeed = {
  slug: string
  name: string
  tagline: string
  description: string
  websiteUrl: string
  logo: string
  bannerImage: string
  status: ProductStatus
  publishedAt: Date
  type: ProductType
  pricingModel: PricingModel
  startingPriceCents?: number | null
  currencyCode?: string | null
  ctaLabel?: string | null
  ctaUrl?: string | null
  keywords: string[]
  platforms: Platform[]
  planSlug?: string
  planAssignedAt?: Date | null
  userClerkId: string
  categorySlug: string
  organizationName?: string
  createdAt?: Date
  updatedAt?: Date
  metadata?: Prisma.ProductMetadataCreateWithoutProductInput
  verification?: Prisma.ProductVerificationCreateWithoutProductInput
  analytics?: Prisma.ProductAnalyticsCreateWithoutProductInput
}

type SeedContext = {
  userIdByClerkId: Map<string, string>
  organizationIdByName: Map<string, string>
  categoryIdBySlug: Map<string, string>
  planIdBySlug: Map<string, string>
}

function buildRevenueSnapshots(options: {
  currencyCode: string
  days: number
  baseDailyCents: number
}): {
  snapshots: Array<{
    currencyCode: string
    periodStart: Date
    periodRevenueCents: number
    allTimeRevenueCents: number
    data: { provider: string; charges: number }
  }>
} {
  const { currencyCode, days, baseDailyCents } = options
  const start = addDays(startOfDay(new Date()), -(days - 1))
  const snapshots: Array<{
    currencyCode: string
    periodStart: Date
    periodRevenueCents: number
    allTimeRevenueCents: number
    data: { provider: string; charges: number }
  }> = []

  let runningTotal = 0

  for (let i = 0; i < days; i += 1) {
    const periodStart = addDays(start, i)
    const trendBoost = Math.floor(i / 21) * 700
    const seasonal = Math.round(Math.sin(i / 7) * 500)
    const dailyJitter = (i % 5) * 120
    const periodRevenueCents = Math.max(
      2000,
      baseDailyCents + trendBoost + seasonal + dailyJitter,
    )
    const charges = Math.max(1, Math.round(periodRevenueCents / 5000))

    runningTotal += periodRevenueCents
    snapshots.push({
      currencyCode,
      periodStart,
      periodRevenueCents,
      allTimeRevenueCents: runningTotal,
      data: { provider: "seed", charges },
    })
  }

  return { snapshots }
}

function toSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
}

function buildProductCreateInput(
  def: ProductSeed,
  ctx: SeedContext,
): Prisma.ProductCreateInput {
  const userId = ctx.userIdByClerkId.get(def.userClerkId)
  if (!userId) {
    throw new Error(`Missing user for clerkId '${def.userClerkId}'`)
  }

  const categoryId = ctx.categoryIdBySlug.get(def.categorySlug)
  if (!categoryId) {
    throw new Error(`Missing category '${def.categorySlug}'`)
  }

  const organizationId = def.organizationName
    ? ctx.organizationIdByName.get(def.organizationName)
    : undefined
  if (def.organizationName && !organizationId) {
    throw new Error(`Missing organization '${def.organizationName}'`)
  }

  const planId = def.planSlug ? ctx.planIdBySlug.get(def.planSlug) : undefined
  if (def.planSlug && !planId) {
    throw new Error(`Missing plan '${def.planSlug}'`)
  }

  const data: Prisma.ProductCreateInput = {
    name: def.name,
    slug: def.slug,
    tagline: def.tagline,
    description: def.description,
    websiteUrl: def.websiteUrl,
    logo: def.logo,
    bannerImage: def.bannerImage,
    status: def.status,
    publishedAt: def.publishedAt,
    type: def.type,
    pricingModel: def.pricingModel,
    startingPriceCents: def.startingPriceCents ?? null,
    currencyCode: def.currencyCode ?? null,
    ctaLabel: def.ctaLabel ?? null,
    ctaUrl: def.ctaUrl ?? null,
    keywords: def.keywords,
    platforms: def.platforms,
    user: { connect: { id: userId } },
    category: { connect: { id: categoryId } },
  }

  if (def.createdAt) {
    data.createdAt = def.createdAt
  }

  if (def.updatedAt) {
    data.updatedAt = def.updatedAt
  }

  if (organizationId) {
    data.organization = { connect: { id: organizationId } }
  }

  if (planId) {
    data.plan = { connect: { id: planId } }
    if (def.planAssignedAt) {
      data.planAssignedAt = def.planAssignedAt
    }
  }

  if (def.metadata) {
    data.metadata = { create: def.metadata }
  }
  if (def.verification) {
    data.verification = { create: def.verification }
  }
  if (def.analytics) {
    data.analytics = { create: def.analytics }
  }

  return data
}

function buildProductUpdateInput(
  def: ProductSeed,
  ctx: SeedContext,
  options?: { preserveAnalytics?: boolean },
): Prisma.ProductUpdateInput {
  const userId = ctx.userIdByClerkId.get(def.userClerkId)
  if (!userId) {
    throw new Error(`Missing user for clerkId '${def.userClerkId}'`)
  }

  const categoryId = ctx.categoryIdBySlug.get(def.categorySlug)
  if (!categoryId) {
    throw new Error(`Missing category '${def.categorySlug}'`)
  }

  const organizationId = def.organizationName
    ? ctx.organizationIdByName.get(def.organizationName)
    : undefined
  if (def.organizationName && !organizationId) {
    throw new Error(`Missing organization '${def.organizationName}'`)
  }

  const planId = def.planSlug ? ctx.planIdBySlug.get(def.planSlug) : undefined
  if (def.planSlug && !planId) {
    throw new Error(`Missing plan '${def.planSlug}'`)
  }

  const update: Prisma.ProductUpdateInput = {
    name: def.name,
    tagline: def.tagline,
    description: def.description,
    websiteUrl: def.websiteUrl,
    logo: def.logo,
    bannerImage: def.bannerImage,
    status: def.status,
    publishedAt: def.publishedAt,
    type: def.type,
    pricingModel: def.pricingModel,
    startingPriceCents: def.startingPriceCents ?? null,
    currencyCode: def.currencyCode ?? null,
    ctaLabel: def.ctaLabel ?? null,
    ctaUrl: def.ctaUrl ?? null,
    keywords: { set: def.keywords },
    platforms: { set: def.platforms },
    user: { connect: { id: userId } },
    category: { connect: { id: categoryId } },
    planAssignedAt: def.planAssignedAt ?? null,
  }

  if (def.createdAt) {
    update.createdAt = def.createdAt
  }

  if (def.updatedAt) {
    update.updatedAt = def.updatedAt
  }

  if (organizationId) {
    update.organization = { connect: { id: organizationId } }
  }
  if (planId) {
    update.plan = { connect: { id: planId } }
  }

  if (def.metadata) {
    update.metadata = {
      upsert: {
        update: def.metadata,
        create: def.metadata,
      },
    }
  }

  if (def.verification) {
    update.verification = {
      upsert: {
        update: def.verification,
        create: def.verification,
      },
    }
  }

  if (def.analytics) {
    update.analytics = {
      upsert: {
        update: options?.preserveAnalytics ? {} : def.analytics,
        create: def.analytics,
      },
    }
  }

  return update
}

async function upsertProduct(
  def: ProductSeed,
  ctx: SeedContext,
  options?: { preserveAnalytics?: boolean },
) {
  const existing = await prisma.product.findUnique({
    where: { slug: def.slug },
  })
  await prisma.product.upsert({
    where: { slug: def.slug },
    create: buildProductCreateInput(def, ctx),
    update: buildProductUpdateInput(def, ctx, options),
  })

  return {
    slug: def.slug,
    action: existing ? ("update" as const) : ("create" as const),
  }
}

async function main() {
  prisma = await prismaPromise
  await seedCategories(prisma)
  await seedUseCases(prisma)
  await seedPlanFeatures(prisma)
  await seedPlans(prisma)
  await seedRewards(prisma)

  const userSeeds = [
    {
      clerkId: "clerk-001",
      email: "user1@example.com",
      firstName: "Alice",
      lastName: "Doe",
      role: "member",
      roleIntent: "Founder",
    },
    {
      clerkId: "clerk-002",
      email: "user2@example.com",
      firstName: "Bob",
      lastName: "Smith",
      role: "member",
      roleIntent: "Developer",
    },
  ] satisfies Prisma.UserCreateInput[]

  const userIdByClerkId = new Map<string, string>()
  const userRows: { clerkId: string; action: "create" | "update" }[] = []
  for (const user of userSeeds) {
    const existing = await prisma.user.findUnique({
      where: { clerkId: user.clerkId },
    })
    const record = await prisma.user.upsert({
      where: { clerkId: user.clerkId },
      update: {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role ?? "member",
        roleIntent: user.roleIntent,
      },
      create: user,
    })
    userIdByClerkId.set(user.clerkId, record.id)
    userRows.push({
      clerkId: user.clerkId,
      action: existing ? "update" : "create",
    })
  }
  console.table(userRows)

  const organizationSeeds = [
    { name: "OpenStackers Inc", url: "https://openstackers.com" },
    { name: "DevBoost Labs", url: "https://devboostlabs.io" },
  ]

  const organizationIdByName = new Map<string, string>()
  const organizationRows: { name: string; action: "create" | "update" }[] = []
  for (const org of organizationSeeds) {
    const existing = await prisma.organization.findUnique({
      where: { url: org.url },
    })
    const record = await prisma.organization.upsert({
      where: { url: org.url },
      update: { name: org.name },
      create: { name: org.name, url: org.url },
    })
    organizationIdByName.set(org.name, record.id)
    organizationRows.push({
      name: org.name,
      action: existing ? "update" : "create",
    })
  }
  console.table(organizationRows)

  const membershipSeeds = [
    {
      userClerkId: "clerk-001",
      organizationName: "OpenStackers Inc",
      jobTitle: "Frontend Engineer",
    },
    {
      userClerkId: "clerk-002",
      organizationName: "DevBoost Labs",
      jobTitle: "Marketing Lead",
    },
  ]

  const membershipRows: {
    organization: string
    clerkId: string
    action: "create" | "update"
  }[] = []

  for (const membership of membershipSeeds) {
    const userId = userIdByClerkId.get(membership.userClerkId)
    const organizationId = organizationIdByName.get(membership.organizationName)
    if (!userId || !organizationId) {
      continue
    }

    const existing = await prisma.organizationMembership.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
    })

    await prisma.organizationMembership.upsert({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
      update: { jobTitle: membership.jobTitle },
      create: {
        userId,
        organizationId,
        jobTitle: membership.jobTitle,
      },
    })

    membershipRows.push({
      organization: membership.organizationName,
      clerkId: membership.userClerkId,
      action: existing ? "update" : "create",
    })
  }
  console.table(membershipRows)

  const [categoryRows, planRows] = await Promise.all([
    prisma.category.findMany({ select: { id: true, slug: true } }),
    prisma.plan.findMany({ select: { id: true, slug: true } }),
  ])

  const categoryIdBySlug = new Map(
    categoryRows.map((row) => [row.slug, row.id]),
  )
  const planIdBySlug = new Map(planRows.map((row) => [row.slug, row.id]))

  const ctx: SeedContext = {
    userIdByClerkId,
    organizationIdByName,
    categoryIdBySlug,
    planIdBySlug,
  }

  const now = new Date()
  const startToday = startOfDay(now)
  const startYesterday = addDays(startToday, -1)
  const startOfCurrentWeek = startOfWeek(now, { weekStartsOn: 1 })
  const startOfPreviousWeek = addWeeks(startOfCurrentWeek, -1)
  const startOfCurrentMonth = startOfMonth(now)
  const startOfPreviousMonth = addMonths(startOfCurrentMonth, -1)

  const ensurePast = (candidate: Date, fallbackDaysAgo: number) => {
    if (candidate.getTime() <= now.getTime()) {
      return candidate
    }
    if (fallbackDaysAgo === 0) {
      return addMinutes(now, -30)
    }
    return addHours(addDays(startToday, -fallbackDaysAgo), 11)
  }

  const createdCycle = [
    ensurePast(addHours(startToday, 10), 0),
    ensurePast(addHours(startYesterday, 11), 1),
    ensurePast(addHours(addDays(startOfCurrentWeek, 2), 13), 4),
    ensurePast(addHours(addDays(startOfPreviousWeek, 3), 16), 8),
    ensurePast(addHours(addDays(startOfCurrentMonth, 6), 9), 12),
    ensurePast(addHours(addDays(startOfPreviousMonth, 10), 13), 30),
  ]

  const updatedCycle = [
    ensurePast(addHours(startToday, 16), 0),
    ensurePast(addHours(addDays(startToday, -1), 18), 1),
    ensurePast(addHours(addDays(startToday, -4), 17), 5),
    ensurePast(addHours(addDays(startOfCurrentMonth, 8), 15), 14),
  ]

  const productRows: { slug: string; action: "create" | "update" }[] = []

  const primaryCreatedAt = addMinutes(createdCycle[5], 5)
  const primaryUpdatedCandidate = addMinutes(updatedCycle[3], 7)
  const primaryUpdatedAt =
    primaryUpdatedCandidate.getTime() >= primaryCreatedAt.getTime()
      ? primaryUpdatedCandidate
      : addHours(primaryCreatedAt, 6)

  const primaryProduct: ProductSeed = {
    slug: "shitposts",
    name: "ShitPosts",
    tagline: "Build and share your shitposts",
    description:
      "A platform to create, share, and discover the best shitposts.",
    websiteUrl: "https://shitposts.ai",
    logo: "https://shitposts.ai/brand.png",
    bannerImage: "https://shitposts.ai/banner.png",
    status: ProductStatus.published,
    publishedAt: primaryCreatedAt,
    type: ProductType.saas,
    pricingModel: PricingModel.freemium,
    startingPriceCents: 0,
    currencyCode: "USD",
    ctaLabel: "Visit Website",
    ctaUrl: "https://shitposts.ai",
    keywords: ["memes", "social", "fun"],
    platforms: [Platform.web],
    userClerkId: "clerk-001",
    categorySlug: "social-media-tools",
    organizationName: "OpenStackers Inc",
    planSlug: "pro",
    planAssignedAt: addDays(primaryCreatedAt, 2),
    createdAt: primaryCreatedAt,
    updatedAt: primaryUpdatedAt,
    metadata: {
      githubUrl: "https://github.com/deploykit/app",
      twitterUrl: "https://twitter.com/deploykit",
      demoUrl: "https://demo.deploykit.dev",
      contactEmail: "hello@deploykit.dev",
    },
    verification: {
      verificationTxt: "deploykit-verification=xyz123",
      isVerified: false,
    },
    analytics: {
      upvotes: 120,
      clicks: 700,
    },
  }

  productRows.push(
    await upsertProduct(primaryProduct, ctx, { preserveAnalytics: true }),
  )

  const productNames = [
    "PostPilot",
    "Launchify",
    "GrowthForge",
    "ZapSync",
    "InsightIQ",
    "PixelPush",
    "MetricFlow",
    "AdNexus",
    "SaaSify",
    "ClickPilot",
    "AutoTweet",
    "CodePulse",
    "BugSmasher",
    "PlanStack",
    "FormFrenzy",
    "Promptify",
    "LeadLoop",
    "PromptCraft",
    "AIDeck",
    "ShareSpark",
    "QueryNest",
    "FormJuggler",
    "MicroStack",
    "TaskTrove",
    "CloudCue",
    "DeployFlow",
    "SubmitEase",
    "ByteBoard",
    "StatHero",
    "TaskDock",
    "UIStitch",
    "GrowthHop",
    "FunnelBeam",
    "StackHatch",
    "LinkDrip",
    "PromoWiz",
    "TagPulse",
    "ViewBooster",
    "PostTrail",
    "LaunchDock",
    "CrowdMagnet",
    "HypeNest",
    "PromptForge",
    "ReactVerse",
    "BugBoard",
    "SyncLy",
    "AutoPromo",
    "CodeCrest",
    "ShipJet",
    "BoostMate",
  ]

  const productIndexBySlug = new Map<string, number>()
  productNames.forEach((name, index) => {
    productIndexBySlug.set(toSlug(name), index)
  })

  const resolveUpdateAnchor = (slug: string) => {
    const index = productIndexBySlug.get(slug)
    if (index == null) {
      return ensurePast(addDays(startToday, -10), 14)
    }
    const cycleBase = updatedCycle[index % updatedCycle.length]
    const offset = (index % 5) * 7
    return ensurePast(addMinutes(cycleBase, offset), 14)
  }

  const taglines = [
    "Streamline your workflow",
    "Grow your audience fast",
    "Automate your launches",
    "Intelligence for your next move",
    "Beautiful posts, zero hassle",
    "Get your product discovered",
    "From idea to launch in minutes",
    "Build trust with users",
    "Insights that drive growth",
    "Tools for SaaS founders",
  ]

  const bulkSeeds: ProductSeed[] = productNames.map((name, index) => {
    const slug = toSlug(name)
    const domain = `https://${slug}.dev`
    const tagline = taglines[index % taglines.length]
    const createdBase = createdCycle[index % createdCycle.length]
    const createdAt = addMinutes(createdBase, (index % 6) * 5)
    const updatedBase = updatedCycle[index % updatedCycle.length]
    let updatedAt = addMinutes(updatedBase, (index % 5) * 7)
    if (updatedAt.getTime() < createdAt.getTime()) {
      updatedAt = addHours(createdAt, 6)
    }
    const planSlug = index % 5 === 0 ? "featured" : "free"

    return {
      slug,
      name,
      tagline,
      description: `${name} helps you ${tagline.toLowerCase()}.`,
      websiteUrl: domain,
      logo: `${domain}/logo.png`,
      bannerImage: `${domain}/banner.png`,
      status: ProductStatus.published,
      publishedAt: createdAt,
      createdAt,
      updatedAt,
      type: ProductType.saas,
      pricingModel: PricingModel.subscription,
      startingPriceCents: [0, 900, 1900, 2900, 4900][index % 5],
      currencyCode: "USD",
      ctaLabel: "Try for free",
      ctaUrl: domain,
      keywords: ["saas", "productivity", "launch"],
      platforms: [Platform.web],
      userClerkId: index % 2 === 0 ? "clerk-001" : "clerk-002",
      categorySlug: index % 3 === 0 ? "developer-tools" : "productivity",
      organizationName: index % 2 === 0 ? "OpenStackers Inc" : "DevBoost Labs",
      planSlug,
      planAssignedAt:
        planSlug === "featured"
          ? ensurePast(addDays(createdAt, 2), 2)
          : ensurePast(addDays(createdAt, 5), 7),
      metadata: {
        githubUrl: `https://github.com/${slug}`,
        twitterUrl: `https://twitter.com/${slug}`,
        demoUrl: `${domain}/demo`,
        contactEmail: `contact@${slug}.dev`,
      },
      verification: {
        verificationTxt: `${slug}-verification=${(index + 1000).toString()}`,
        isVerified: false,
      },
      analytics: {
        upvotes: 40 + (((index + 1) * 7) % 500),
        clicks: 150 + (((index + 3) * 13) % 2500),
      },
    }
  })

  for (const seed of bulkSeeds) {
    productRows.push(
      await upsertProduct(seed, ctx, { preserveAnalytics: true }),
    )
  }

  console.table(productRows)

  const products = await prisma.product.findMany({
    select: { id: true, slug: true },
  })
  const productIdBySlug = new Map(
    products.map((product) => [product.slug, product.id]),
  )

  await seedPaymentConnectors()

  async function seedPaymentConnectors() {
    const secret = process.env.PAYMENT_CONNECTOR_SECRET_KEY?.trim()
    if (!secret) {
      console.warn(
        "[seed] Skipping payment connector seeds because PAYMENT_CONNECTOR_SECRET_KEY is missing",
      )
      return
    }

    const connectorSeeds = [
      {
        productSlug: "shitposts",
        provider: PaymentConnectorProvider.dodo,
        currencyCode: "USD",
        days: 180,
        baseDailyCents: 18000,
      },
      {
        productSlug: "launchify",
        provider: PaymentConnectorProvider.dodo,
        currencyCode: "USD",
        days: 120,
        baseDailyCents: 26000,
      },
      {
        productSlug: "growthforge",
        provider: PaymentConnectorProvider.dodo,
        currencyCode: "USD",
        days: 150,
        baseDailyCents: 32000,
      },
    ] as const

    const connectorRows: Array<{ productSlug: string; action: string }> = []
    for (const seed of connectorSeeds) {
      const productId = productIdBySlug.get(seed.productSlug)
      if (!productId) {
        console.warn(
          `[seed] Skipping connector for '${seed.productSlug}' (product not found)`,
        )
        continue
      }

      const { snapshots } = buildRevenueSnapshots({
        currencyCode: seed.currencyCode,
        days: seed.days,
        baseDailyCents: seed.baseDailyCents,
      })

      const latest = snapshots[snapshots.length - 1]
      const apiKey = `sk_test_seed_${seed.productSlug}_key`
      const encryptedKey = encryptConnectorSecret(apiKey)
      const keyHint = buildConnectorKeyHint(apiKey)
      const nowTimestamp = new Date()

      const existingConnector = await prisma.paymentConnector.findUnique({
        where: { productId },
        select: { id: true },
      })

      const connector = await prisma.paymentConnector.upsert({
        where: { productId },
        update: {
          provider: seed.provider,
          status: PaymentConnectorStatus.active,
          lastSyncedAt: nowTimestamp,
          verifiedAt: nowTimestamp,
          latestAllTimeRevenueCents: latest?.allTimeRevenueCents ?? 0,
          latestCurrencyCode: latest?.currencyCode,
          latestPeriodStart: latest?.periodStart,
        },
        create: {
          productId,
          provider: seed.provider,
          status: PaymentConnectorStatus.active,
          lastSyncedAt: nowTimestamp,
          verifiedAt: nowTimestamp,
          latestAllTimeRevenueCents: latest?.allTimeRevenueCents ?? 0,
          latestCurrencyCode: latest?.currencyCode,
          latestPeriodStart: latest?.periodStart,
        },
      })

      await prisma.paymentConnectorCredential.updateMany({
        where: {
          connectorId: connector.id,
          status: PaymentCredentialStatus.active,
        },
        data: { status: PaymentCredentialStatus.revoked },
      })

      await prisma.paymentConnectorCredential.create({
        data: {
          connectorId: connector.id,
          status: PaymentCredentialStatus.active,
          encryptedKey,
          keyHint,
        },
      })

      for (const snapshot of snapshots) {
        await prisma.paymentRevenueSnapshot.upsert({
          where: {
            connectorId_periodStart_currencyCode: {
              connectorId: connector.id,
              periodStart: snapshot.periodStart,
              currencyCode: snapshot.currencyCode,
            },
          },
          update: {
            periodRevenueCents: snapshot.periodRevenueCents,
            allTimeRevenueCents: snapshot.allTimeRevenueCents,
            data: snapshot.data,
          },
          create: {
            connectorId: connector.id,
            currencyCode: snapshot.currencyCode,
            periodStart: snapshot.periodStart,
            periodRevenueCents: snapshot.periodRevenueCents,
            allTimeRevenueCents: snapshot.allTimeRevenueCents,
            data: snapshot.data,
          },
        })
      }

      connectorRows.push({
        productSlug: seed.productSlug,
        action: existingConnector ? "update" : "create",
      })
    }

    if (connectorRows.length) {
      console.table(connectorRows)
    }
  }

  type ProductUpdateSeed = {
    id: string
    productSlug: string
    authorClerkId?: string
    title: string
    summary: string
    content: string
    createdOffsetMinutes: number
    publishedOffsetMinutes: number
    fallbackDaysAgo: number
  }

  type ResolvedProductUpdateSeed = {
    id: string
    productSlug: string
    authorClerkId?: string
    title: string
    summary: string
    content: string
    createdAt: Date
    publishedAt: Date
  }

  const buildProductUpdateSeed = (
    seed: ProductUpdateSeed,
  ): ResolvedProductUpdateSeed => {
    const {
      createdOffsetMinutes,
      publishedOffsetMinutes,
      fallbackDaysAgo,
      ...rest
    } = seed
    const anchor = resolveUpdateAnchor(seed.productSlug)
    const createdAt = ensurePast(
      addMinutes(anchor, createdOffsetMinutes),
      fallbackDaysAgo,
    )
    const publishedCandidate = ensurePast(
      addMinutes(anchor, publishedOffsetMinutes),
      fallbackDaysAgo,
    )
    const publishedAt =
      publishedCandidate.getTime() >= createdAt.getTime()
        ? publishedCandidate
        : addMinutes(createdAt, 30)

    return {
      ...rest,
      createdAt,
      publishedAt,
    }
  }

  const productUpdateSeeds: ResolvedProductUpdateSeed[] = [
    buildProductUpdateSeed({
      id: "seed-update-postpilot-daily-workflow",
      productSlug: "postpilot",
      authorClerkId: "clerk-001",
      title: "Daily workflow board",
      summary:
        "We added collaborative drafts and task tracking to keep launches on schedule.",
      content: [
        "### What's new",
        "- Introduced a shared workflow board so teams can co-edit launch tasks in real time.",
        "- Added inline comments and suggestions while drafting announcements.",
        "",
        "### Fixes",
        "- Resolved an issue with reminders firing twice in certain timezones.",
      ].join("\n"),
      createdOffsetMinutes: -120,
      publishedOffsetMinutes: -75,
      fallbackDaysAgo: 0,
    }),
    buildProductUpdateSeed({
      id: "seed-update-launchify-auto-messages",
      productSlug: "launchify",
      authorClerkId: "clerk-001",
      title: "Auto message suggestions",
      summary:
        "Launchify can now draft launch copy based on your latest changelog.",
      content: [
        "### Highlights",
        "- AI-powered suggestions for email and social copy seeded from your changelog entries.",
        "- One-click publishing to your connected channels with approval flows.",
        "",
        "### Improvements",
        "- Faster asset uploads and better image optimization for launch pages.",
      ].join("\n"),
      createdOffsetMinutes: -160,
      publishedOffsetMinutes: -110,
      fallbackDaysAgo: 1,
    }),
    buildProductUpdateSeed({
      id: "seed-update-growthforge-growth-canvas",
      productSlug: "growthforge",
      authorClerkId: "clerk-002",
      title: "Growth canvas templates",
      summary:
        "We shipped reusable experiment templates and deeper analytics filters.",
      content: [
        "### Experiments",
        "- Template gallery for repeatable growth experiments with pre-filled metrics.",
        "- Added comparison mode to review experiment performance across cohorts.",
        "",
        "### Quality",
        "- Improved CSV export reliability and clarified status badges.",
      ].join("\n"),
      createdOffsetMinutes: -210,
      publishedOffsetMinutes: -165,
      fallbackDaysAgo: 5,
    }),
    buildProductUpdateSeed({
      id: "seed-update-zapsync-automation",
      productSlug: "zapsync",
      authorClerkId: "clerk-002",
      title: "Automation insights dashboard",
      summary:
        "ZapSync now tracks automation health and surfaces failed jobs proactively.",
      content: [
        "### Dashboard",
        "- Centralized automation health overview with trend charts and failure alerts.",
        "- Bulk retry options and new filters for mission-critical workflows.",
        "",
        "### Reliability",
        "- Hardened webhook retries and improved logging around third-party rate limits.",
      ].join("\n"),
      createdOffsetMinutes: -260,
      publishedOffsetMinutes: -200,
      fallbackDaysAgo: 14,
    }),
  ]

  const productUpdateRows: { id: string; action: "create" | "update" }[] = []

  for (const seed of productUpdateSeeds) {
    const productId = productIdBySlug.get(seed.productSlug)
    if (!productId) {
      console.warn(
        `[seed] Skipping product update '${seed.id}' because product '${seed.productSlug}' was not found.`,
      )
      continue
    }

    const authorId = seed.authorClerkId
      ? userIdByClerkId.get(seed.authorClerkId)
      : undefined

    const createData: Prisma.ProductUpdateCreateInput = {
      id: seed.id,
      title: seed.title,
      summary: seed.summary,
      content: seed.content,
      status: ProductUpdateStatus.published,
      publishedAt: seed.publishedAt,
      createdAt: seed.createdAt,
      product: { connect: { id: productId } },
    }

    if (authorId) {
      createData.author = { connect: { id: authorId } }
    }

    const updateData: Prisma.ProductUpdateUpdateInput = {
      title: seed.title,
      summary: seed.summary,
      content: seed.content,
      status: ProductUpdateStatus.published,
      publishedAt: seed.publishedAt,
      createdAt: seed.createdAt,
      product: { connect: { id: productId } },
    }

    updateData.author = authorId
      ? { connect: { id: authorId } }
      : { disconnect: true }

    const existing = await prisma.productUpdate.findUnique({
      where: { id: seed.id },
      select: { id: true },
    })

    await prisma.productUpdate.upsert({
      where: { id: seed.id },
      create: createData,
      update: updateData,
    })

    productUpdateRows.push({
      id: seed.id,
      action: existing ? "update" : "create",
    })
  }

  console.table(productUpdateRows)

  await seedAlternatives(prisma, {
    categoryIdBySlug,
    productIdBySlug,
  })

  const monthlyRankingSeeds: {
    month: Date
    rankings: {
      slug: string
      rank: number
      score?: number
      upvotes?: number
    }[]
  }[] = [
    {
      month: new Date(Date.UTC(2024, 3, 1)),
      rankings: [
        { slug: "shitposts", rank: 1, score: 98, upvotes: 640 },
        { slug: "launchify", rank: 2, score: 93, upvotes: 590 },
        { slug: "growthforge", rank: 3, score: 89, upvotes: 560 },
        { slug: "promptify", rank: 4, score: 86, upvotes: 540 },
        { slug: "stackhatch", rank: 5, score: 82, upvotes: 520 },
        { slug: "zapsync", rank: 6, score: 79, upvotes: 505 },
        { slug: "metricflow", rank: 7, score: 77, upvotes: 492 },
        { slug: "sharespark", rank: 8, score: 74, upvotes: 476 },
        { slug: "deployflow", rank: 9, score: 72, upvotes: 463 },
        { slug: "crowdmagnet", rank: 10, score: 70, upvotes: 451 },
      ],
    },
    {
      month: new Date(Date.UTC(2024, 2, 1)),
      rankings: [
        { slug: "launchify", rank: 1, score: 95, upvotes: 610 },
        { slug: "shitposts", rank: 2, score: 92, upvotes: 580 },
        { slug: "growthforge", rank: 3, score: 88, upvotes: 552 },
        { slug: "promowiz", rank: 4, score: 84, upvotes: 530 },
        { slug: "tasktrove", rank: 5, score: 81, upvotes: 498 },
        { slug: "promptforge", rank: 6, score: 79, upvotes: 480 },
        { slug: "stathero", rank: 7, score: 77, upvotes: 468 },
        { slug: "byteboard", rank: 8, score: 74, upvotes: 455 },
        { slug: "autotweet", rank: 9, score: 72, upvotes: 440 },
        { slug: "planstack", rank: 10, score: 70, upvotes: 428 },
      ],
    },
    {
      month: new Date(Date.UTC(2024, 1, 1)),
      rankings: [
        { slug: "growthforge", rank: 1, score: 92, upvotes: 580 },
        { slug: "launchify", rank: 2, score: 90, upvotes: 560 },
        { slug: "shitposts", rank: 3, score: 87, upvotes: 540 },
        { slug: "metricflow", rank: 4, score: 84, upvotes: 520 },
        { slug: "promptify", rank: 5, score: 82, upvotes: 505 },
        { slug: "formfrenzy", rank: 6, score: 79, upvotes: 488 },
        { slug: "stackhatch", rank: 7, score: 77, upvotes: 470 },
        { slug: "leadloop", rank: 8, score: 75, upvotes: 455 },
        { slug: "deployflow", rank: 9, score: 73, upvotes: 440 },
        { slug: "funnelbeam", rank: 10, score: 71, upvotes: 428 },
      ],
    },
  ]

  await prisma.monthlyProductRanking.deleteMany({})

  const monthlyRankingRows: { month: string; entries: number }[] = []
  for (const monthSeed of monthlyRankingSeeds) {
    const normalizedMonth = new Date(
      Date.UTC(
        monthSeed.month.getUTCFullYear(),
        monthSeed.month.getUTCMonth(),
        1,
      ),
    )

    const rankings: Prisma.MonthlyProductRankingCreateManyInput[] = []
    for (const ranking of monthSeed.rankings) {
      const productId = productIdBySlug.get(ranking.slug)
      if (!productId) {
        console.warn(
          `Missing product for monthly ranking slug '${ranking.slug}'`,
        )
        continue
      }

      rankings.push({
        productId,
        month: normalizedMonth,
        rank: ranking.rank,
        score: ranking.score ?? null,
        upvotes: ranking.upvotes ?? null,
      })
    }

    if (!rankings.length) {
      continue
    }

    await prisma.monthlyProductRanking.createMany({ data: rankings })
    monthlyRankingRows.push({
      month: normalizedMonth.toISOString().slice(0, 7),
      entries: rankings.length,
    })
  }

  console.table(monthlyRankingRows)

  const baseDate = new Date()
  baseDate.setUTCHours(12, 0, 0, 0)
  const trafficTimestamp = (daysAgo: number, hourOffset = 0) => {
    const date = new Date(baseDate)
    date.setUTCDate(date.getUTCDate() - daysAgo)
    date.setUTCHours(date.getUTCHours() + hourOffset, 0, 0, 0)
    return date
  }

  const trafficSeeds: {
    slug: string
    events: Array<
      Omit<Prisma.ProductTrafficEventCreateManyInput, "id" | "productId">
    >
  }[] = [
    {
      slug: "shitposts",
      events: [
        {
          path: "/",
          referrer: "https://twitter.com/shipyardhq/status/123",
          device: DeviceCategory.mobile,
          browser: "Mobile Safari",
          os: "iOS",
          country: "United States",
          region: "California",
          city: "Los Angeles",
          ipHash: "sp-evt-01",
          createdAt: trafficTimestamp(0, -3),
        },
        {
          path: PRICING_PATH,
          referrer: "https://www.google.com/search?q=shitposts+ai",
          device: DeviceCategory.desktop,
          browser: "Chrome",
          os: "macOS",
          country: "United States",
          region: "New York",
          city: "New York",
          ipHash: "sp-evt-02",
          createdAt: trafficTimestamp(1, -2),
        },
        {
          path: "/launch",
          device: DeviceCategory.tablet,
          browser: "Safari",
          os: "iPadOS",
          country: "Canada",
          region: "Ontario",
          city: "Toronto",
          ipHash: "sp-evt-03",
          createdAt: trafficTimestamp(2, 1),
        },
        {
          path: "/",
          referrer: "https://www.producthunt.com/posts/shitposts-ai",
          device: DeviceCategory.desktop,
          browser: "Firefox",
          os: "Windows",
          country: "Germany",
          region: "Berlin",
          city: "Berlin",
          ipHash: "sp-evt-04",
          createdAt: trafficTimestamp(3, -5),
        },
        {
          path: PRICING_PATH,
          referrer: "https://mail.google.com/mail/u/0/#newsletter",
          device: DeviceCategory.desktop,
          browser: "Chrome",
          os: "macOS",
          country: "United States",
          region: "Texas",
          city: "Austin",
          ipHash: "sp-evt-05",
          createdAt: trafficTimestamp(4, 2),
        },
        {
          path: "/",
          referrer: "https://www.reddit.com/r/startups/comments/xyz",
          device: DeviceCategory.mobile,
          browser: "Chrome Mobile",
          os: "Android",
          country: "Australia",
          region: "New South Wales",
          city: "Sydney",
          ipHash: "sp-evt-06",
          createdAt: trafficTimestamp(5, -1),
        },
        {
          path: "/launch",
          referrer: "https://www.linkedin.com/posts/shipyardhq",
          device: DeviceCategory.desktop,
          browser: "Edge",
          os: "Windows",
          country: "United Kingdom",
          region: "England",
          city: "London",
          ipHash: "sp-evt-07",
          createdAt: trafficTimestamp(6, 4),
        },
        {
          path: PRICING_PATH,
          device: DeviceCategory.mobile,
          browser: "Mobile Safari",
          os: "iOS",
          country: "United States",
          region: "Illinois",
          city: "Chicago",
          ipHash: "sp-evt-08",
          createdAt: trafficTimestamp(7, -2),
        },
        {
          path: "/community",
          referrer: "https://news.ycombinator.com/item?id=424242",
          device: DeviceCategory.desktop,
          browser: "Chrome",
          os: "Linux",
          country: "India",
          region: "Karnataka",
          city: "Bengaluru",
          ipHash: "sp-evt-09",
          createdAt: trafficTimestamp(8, 3),
        },
        {
          path: "/",
          device: DeviceCategory.desktop,
          browser: "Safari",
          os: "macOS",
          country: "United States",
          region: "Washington",
          city: "Seattle",
          ipHash: "sp-evt-10",
          createdAt: trafficTimestamp(9, -4),
        },
      ],
    },
    {
      slug: "launchify",
      events: [
        {
          path: "/",
          referrer: "https://www.google.com/search?q=launchify+product",
          device: DeviceCategory.desktop,
          browser: "Chrome",
          os: "Windows",
          country: "United States",
          region: "Colorado",
          city: "Denver",
          ipHash: "launchify-evt-01",
          createdAt: trafficTimestamp(0, -1),
        },
        {
          path: "/features",
          referrer: "https://twitter.com/productled/status/555",
          device: DeviceCategory.mobile,
          browser: "Mobile Safari",
          os: "iOS",
          country: "United States",
          region: "California",
          city: "San Francisco",
          ipHash: "launchify-evt-02",
          createdAt: trafficTimestamp(1, 2),
        },
        {
          path: PRICING_PATH,
          device: DeviceCategory.desktop,
          browser: "Firefox",
          os: "Linux",
          country: "Netherlands",
          region: "North Holland",
          city: "Amsterdam",
          ipHash: "launchify-evt-03",
          createdAt: trafficTimestamp(3, -3),
        },
        {
          path: "/blog/launch-checklist",
          referrer: "https://news.ycombinator.com/item?id=515151",
          device: DeviceCategory.desktop,
          browser: "Chrome",
          os: "Windows",
          country: "United States",
          region: "Massachusetts",
          city: "Boston",
          ipHash: "launchify-evt-04",
          createdAt: trafficTimestamp(4, 1),
        },
        {
          path: "/integrations",
          referrer: "https://mailchi.mp/launchify-update",
          device: DeviceCategory.tablet,
          browser: "Safari",
          os: "iPadOS",
          country: "United States",
          region: "Utah",
          city: "Salt Lake City",
          ipHash: "launchify-evt-05",
          createdAt: trafficTimestamp(5, -2),
        },
        {
          path: "/",
          referrer: "https://www.bing.com/search?q=launchify",
          device: DeviceCategory.mobile,
          browser: "Chrome Mobile",
          os: "Android",
          country: "Singapore",
          region: "Central Region",
          city: "Singapore",
          ipHash: "launchify-evt-06",
          createdAt: trafficTimestamp(6, 3),
        },
      ],
    },
  ]

  const trafficRows: { slug: string; events: number }[] = []
  for (const traffic of trafficSeeds) {
    const productId = productIdBySlug.get(traffic.slug)
    if (!productId) {
      console.warn(
        `Missing product for slug '${traffic.slug}', skipping traffic seeding`,
      )
      continue
    }
    await prisma.productTrafficEvent.deleteMany({ where: { productId } })
    if (!traffic.events.length) {
      trafficRows.push({ slug: traffic.slug, events: 0 })
      continue
    }

    await prisma.productTrafficEvent.createMany({
      data: traffic.events.map((event) => ({
        ...event,
        productId,
      })),
    })

    trafficRows.push({ slug: traffic.slug, events: traffic.events.length })
  }

  console.table(trafficRows)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

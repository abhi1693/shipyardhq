import {
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
import type { PrismaClient } from "@/lib/vendor/prisma/client"
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
  userEmail: string
  categorySlug: string
  organizationName?: string
  createdAt?: Date
  updatedAt?: Date
  metadata?: Prisma.ProductMetadataCreateWithoutProductInput
  verification?: Prisma.ProductVerificationCreateWithoutProductInput
  analytics?: Prisma.ProductAnalyticsCreateWithoutProductInput
  isVerified?: boolean
}

type SeedContext = {
  userIdByEmail: Map<string, string>
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

function buildProductCreateInput(
  def: ProductSeed,
  ctx: SeedContext,
): Prisma.ProductCreateInput {
  const userId = ctx.userIdByEmail.get(def.userEmail)
  if (!userId) {
    throw new Error(`Missing user for email '${def.userEmail}'`)
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
  const userId = ctx.userIdByEmail.get(def.userEmail)
  if (!userId) {
    throw new Error(`Missing user for email '${def.userEmail}'`)
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
    include: { verification: true },
  })

  const upserted = await prisma.product.upsert({
    where: { slug: def.slug },
    create: buildProductCreateInput(def, ctx),
    update: buildProductUpdateInput(def, ctx, options),
  })

  const verificationTxt =
    def.verification?.verificationTxt ??
    generateVerificationTxtFromWebsite(def.websiteUrl)
  await prisma.productVerification.upsert({
    where: { productId: upserted.id },
    create: {
      productId: upserted.id,
      verificationTxt,
      isVerified:
        typeof def.isVerified === "boolean"
          ? def.isVerified
          : (def.verification?.isVerified ?? false),
    },
    update: {
      verificationTxt,
      isVerified:
        typeof def.isVerified === "boolean"
          ? def.isVerified
          : (def.verification?.isVerified ?? false),
    },
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
    {
      clerkId: "seed-admin-abhimanyu",
      email: "desk.abhimanyu@gmail.com",
      firstName: "Abhimanyu",
      lastName: "Saharan",
      role: "admin",
      roleIntent: "Admin",
    },
  ] satisfies Prisma.UserCreateInput[]

  const userIdByClerkId = new Map<string, string>()
  const userIdByEmail = new Map<string, string>()
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
    userIdByEmail.set(user.email, record.id)
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
    userIdByEmail,
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

  const placeholderLogo = "https://placehold.co/600x400"

  const baseProducts = [
    {
      slug: "shipyardhq",
      name: "Shipyard HQ",
      websiteUrl: "https://shipyardhq.dev",
      userEmail: "desk.abhimanyu@gmail.com",
      categorySlug: "developer-tools",
      tagline: "Launch, grow, and showcase your SaaS.",
      description:
        "A curated hub for shipping updates, demos, and growth experiments.",
      keywords: ["developer tools", "launches", "growth"],
      pricingModel: PricingModel.subscription,
      startingPriceCents: 4900,
      planSlug: "pro",
    },
    {
      slug: "shitposts",
      name: "ShitPosts",
      websiteUrl: "https://shitposts.ai",
      userEmail: "desk.abhimanyu@gmail.com",
      categorySlug: "social-media-tools",
      tagline: "Build and share your best shitposts.",
      description: "Create, remix, and ship viral posts with AI helpers.",
      keywords: ["social", "memes", "ai"],
      pricingModel: PricingModel.freemium,
      startingPriceCents: 0,
      planSlug: "featured",
    },
    {
      slug: "indexly",
      name: "Indexly",
      websiteUrl: "https://indexly.cc",
      userEmail: "desk.abhimanyu@gmail.com",
      categorySlug: "seo-growth",
      tagline: "Track and improve your search visibility.",
      description: "Monitor indexation health and SEO signals automatically.",
      keywords: ["seo", "monitoring", "analytics"],
      pricingModel: PricingModel.subscription,
      startingPriceCents: 2900,
      planSlug: "pro",
    },
    {
      slug: "askusers",
      name: "AskUsers",
      websiteUrl: "https://askusers.org",
      userEmail: "user1@example.com",
      categorySlug: "marketing",
      tagline: "Collect user feedback fast.",
      description: "Survey and interview real users to validate features.",
      keywords: ["research", "feedback", "marketing"],
      pricingModel: PricingModel.subscription,
      startingPriceCents: 1900,
      planSlug: "free",
    },
    {
      slug: "ai-seo-web-checker",
      name: "AI SEO Web Checker",
      websiteUrl: "https://ai.seowebchecker.com",
      userEmail: "user2@example.com",
      categorySlug: "seo-growth",
      tagline: "AI-powered SEO audits.",
      description:
        "Automated site checks with AI suggestions for faster fixes.",
      keywords: ["seo", "ai", "optimization"],
      pricingModel: PricingModel.subscription,
      startingPriceCents: 2500,
      planSlug: "free",
    },
    {
      slug: "unshift",
      name: "Unshift",
      websiteUrl: "https://unshift.ai",
      userEmail: "user1@example.com",
      categorySlug: "developer-tools",
      tagline: "AI workflows for engineers.",
      description: "Automate engineering workflows with AI-powered tooling.",
      keywords: ["developer tools", "automation", "ai"],
      pricingModel: PricingModel.subscription,
      startingPriceCents: 4900,
      planSlug: "featured",
    },
  ] as const

  const productSeeds: ProductSeed[] = baseProducts.map((product, index) => {
    const createdAt = ensurePast(
      addMinutes(createdCycle[index % createdCycle.length], index * 5),
      index,
    )
    const updatedAt = ensurePast(
      addMinutes(updatedCycle[index % updatedCycle.length], index * 7),
      index + 1,
    )

    return {
      slug: product.slug,
      name: product.name,
      tagline: product.tagline,
      description: product.description,
      websiteUrl: product.websiteUrl,
      logo: placeholderLogo,
      bannerImage: placeholderLogo,
      status: ProductStatus.published,
      publishedAt: createdAt,
      createdAt,
      updatedAt,
      type: ProductType.saas,
      pricingModel: product.pricingModel,
      startingPriceCents: product.startingPriceCents,
      currencyCode: "USD",
      ctaLabel: "Visit website",
      ctaUrl: product.websiteUrl,
      keywords: [...product.keywords],
      platforms: [Platform.web],
      userEmail: product.userEmail,
      categorySlug: product.categorySlug,
      planSlug: product.planSlug,
      planAssignedAt: product.planSlug
        ? ensurePast(addDays(createdAt, 2), index + 2)
        : undefined,
      metadata: {
        demoUrl: `${product.websiteUrl}/demo`,
        contactEmail: `hello@${product.slug}.dev`,
      },
      analytics: {
        upvotes: 40 + index * 15,
      },
    }
  })

  for (const seed of productSeeds) {
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
        productSlug: "shipyardhq",
        provider: PaymentConnectorProvider.dodo,
        currencyCode: "USD",
        days: 150,
        baseDailyCents: 32000,
      },
      {
        productSlug: "shitposts",
        provider: PaymentConnectorProvider.dodo,
        currencyCode: "USD",
        days: 120,
        baseDailyCents: 18000,
      },
      {
        productSlug: "indexly",
        provider: PaymentConnectorProvider.dodo,
        currencyCode: "USD",
        days: 120,
        baseDailyCents: 24000,
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
    createdAt: Date
    publishedAt: Date
  }

  const productUpdateSeeds: ProductUpdateSeed[] = [
    {
      id: "seed-update-shipyardhq-playbooks",
      productSlug: "shipyardhq",
      authorClerkId: "seed-admin-abhimanyu",
      title: "New launch playbooks",
      summary: "Added ready-to-run launch playbooks and a refreshed listing editor.",
      content: [
        "### What's new",
        "- Launch playbooks with tasks and assets you can clone.",
        "- Listing editor now has live previews and guardrails for metadata.",
        "",
        "### Quality",
        "- Faster screenshot processing and steadier analytics pulls.",
      ].join("\n"),
      createdAt: ensurePast(addMinutes(startToday, -240), 1),
      publishedAt: ensurePast(addMinutes(startToday, -200), 1),
    },
    {
      id: "seed-update-indexly-audits",
      productSlug: "indexly",
      authorClerkId: "seed-admin-abhimanyu",
      title: "Index coverage alerts",
      summary: "Automatic alerts when index coverage drops or spikes.",
      content: [
        "### Highlights",
        "- Email and Slack alerts for coverage changes.",
        "- URL inspector with AI suggestions to fix crawls.",
        "",
        "### Fixes",
        "- Better handling for international domains.",
      ].join("\n"),
      createdAt: ensurePast(addMinutes(startToday, -320), 2),
      publishedAt: ensurePast(addMinutes(startToday, -280), 2),
    },
    {
      id: "seed-update-shitposts-editor",
      productSlug: "shitposts",
      authorClerkId: "seed-admin-abhimanyu",
      title: "Faster meme editor",
      summary: "Inline templates, scheduled posts, and sturdier uploads.",
      content: [
        "### Editor",
        "- Template picker with trending formats.",
        "- Scheduled posts with auto-expiring links.",
        "",
        "### Reliability",
        "- Fixed occasional upload timeouts.",
      ].join("\n"),
      createdAt: ensurePast(addMinutes(startToday, -180), 1),
      publishedAt: ensurePast(addMinutes(startToday, -140), 1),
    },
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
      month: startOfCurrentMonth,
      rankings: [
        { slug: "shipyardhq", rank: 1, score: 96, upvotes: 620 },
        { slug: "shitposts", rank: 2, score: 92, upvotes: 590 },
        { slug: "indexly", rank: 3, score: 89, upvotes: 560 },
        { slug: "ai-seo-web-checker", rank: 4, score: 85, upvotes: 530 },
        { slug: "askusers", rank: 5, score: 82, upvotes: 510 },
        { slug: "unshift", rank: 6, score: 80, upvotes: 495 },
      ],
    },
    {
      month: startOfPreviousMonth,
      rankings: [
        { slug: "shitposts", rank: 1, score: 94, upvotes: 580 },
        { slug: "shipyardhq", rank: 2, score: 91, upvotes: 550 },
        { slug: "indexly", rank: 3, score: 88, upvotes: 530 },
        { slug: "unshift", rank: 4, score: 84, upvotes: 500 },
        { slug: "askusers", rank: 5, score: 81, upvotes: 482 },
        { slug: "ai-seo-web-checker", rank: 6, score: 79, upvotes: 470 },
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
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

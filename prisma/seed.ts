import {
  Platform,
  Prisma,
  ProductStatus,
  ProductType,
  PricingModel,
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

import { generateVerificationTxtFromWebsite } from "@/lib/products/verification"
import { BRAND_NAME } from "@/lib/brand"

import { seedAlternatives } from "./seed.alternatives"
import { seedCategories } from "./seed.categories"
import { seedPlanFeatures } from "./seed.plan-features"
import { seedPlans } from "./seed.plans"
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
  keywords: string[]
  platforms: Platform[]
  planSlug?: string
  planAssignedAt?: Date | null
  userEmail: string
  categorySlug: string
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
  categoryIdBySlug: Map<string, string>
  planIdBySlug: Map<string, string>
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

  const placeholderLogo = "https://placehold.co/600x400.png"

  const baseProducts = [
    {
      slug: "shipyardhq",
      name: BRAND_NAME,
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
      keywords: [...product.keywords],
      platforms: [Platform.web],
      userEmail: product.userEmail,
      categorySlug: product.categorySlug,
      planSlug: product.planSlug,
      planAssignedAt: product.planSlug
        ? ensurePast(addDays(createdAt, 2), index + 2)
        : undefined,
      metadata: {
        videoUrl: `${product.websiteUrl}/video`,
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

  await seedAlternatives(prisma, {
    categoryIdBySlug,
    productIdBySlug,
  })
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

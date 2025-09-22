import {
  DeviceCategory,
  Platform,
  Prisma,
  PrismaClient,
  ProductStatus,
  ProductType,
  PricingModel,
} from "@/lib/vendor/prisma/client"
import { PRICING_PATH } from "@/lib/routes"

import { seedCategories } from "./seed.categories"
import { seedPlanFeatures } from "./seed.plan-features"
import { seedPlans } from "./seed.plans"
import { seedUseCases } from "./seed.use-cases"

const prisma = new PrismaClient()

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

  const productRows: { slug: string; action: "create" | "update" }[] = []

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
    publishedAt: new Date("2024-01-02T00:00:00.000Z"),
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
    planAssignedAt: new Date("2024-01-03T00:00:00.000Z"),
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

  const basePublished = Date.parse("2024-02-01T00:00:00.000Z")
  const baseAssignment = Date.parse("2024-02-10T00:00:00.000Z")

  const bulkSeeds: ProductSeed[] = productNames.map((name, index) => {
    const slug = toSlug(name)
    const domain = `https://${slug}.dev`
    const tagline = taglines[index % taglines.length]

    return {
      slug,
      name,
      tagline,
      description: `${name} helps you ${tagline.toLowerCase()}.`,
      websiteUrl: domain,
      logo: `${domain}/logo.png`,
      bannerImage: `${domain}/banner.png`,
      status: ProductStatus.published,
      publishedAt: new Date(basePublished + index * 86_400_000),
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
      planSlug: index % 5 === 0 ? "featured" : "free",
      planAssignedAt: new Date(baseAssignment + index * 86_400_000),
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

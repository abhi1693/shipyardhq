import {
  PrismaClient,
  Prisma,
  PlanType,
  Plan,
} from "@/lib/vendor/prisma/client"

const prisma = new PrismaClient()

async function main() {
  // Seed Users
  const users: Prisma.UserCreateInput[] = [
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
  ]
  const createdUsers = await Promise.all(
    users.map((data) => prisma.user.create({ data })),
  )

  // Seed Organizations
  const orgs = [
    { name: "OpenStackers Inc", url: "https://openstackers.com" },
    { name: "DevBoost Labs", url: "https://devboostlabs.io" },
  ]
  const createdOrgs = await Promise.all(
    orgs.map((data) => prisma.organization.create({ data })),
  )

  // Seed Organization Memberships
  await Promise.all([
    prisma.organizationMembership.create({
      data: {
        userId: createdUsers[0].id,
        organizationId: createdOrgs[0].id,
        jobTitle: "Frontend Engineer",
      },
    }),
    prisma.organizationMembership.create({
      data: {
        userId: createdUsers[1].id,
        organizationId: createdOrgs[1].id,
        jobTitle: "Marketing Lead",
      },
    }),
  ])

  // Seed Categories
  const categories: Prisma.CategoryCreateInput[] = [
    {
      name: "Dev Tools",
      slug: "dev-tools",
      description: "This is a sample",
      icon: "tool",
    },
    {
      name: "Productivity",
      slug: "productivity",
      description: "This is a sample",
      icon: "bolt",
    },
  ]
  const createdCategories = await Promise.all(
    categories.map((data) => prisma.category.create({ data })),
  )

  // Seed UseCases and connect to Categories
  const useCases = [
    {
      label: "Launch a SaaS",
      slug: "launch-saas",
      categorySlugs: ["dev-tools", "productivity"],
    },
    {
      label: "Automate Tasks",
      slug: "automate-tasks",
      categorySlugs: ["productivity"],
    },
    {
      label: "Grow Your Audience",
      slug: "grow-audience",
      categorySlugs: ["dev-tools"],
    },
  ]

  for (const useCase of useCases) {
    const categoriesToConnect = createdCategories.filter((cat) =>
      useCase.categorySlugs.includes(cat.slug),
    )

    await prisma.useCase.create({
      data: {
        label: useCase.label,
        slug: useCase.slug,
        categories: {
          create: categoriesToConnect.map((category) => ({
            category: { connect: { id: category.id } },
          })),
        },
      },
    })
  }

  // Seed Plan Features
  const features = [
    {
      key: "analytics.basic",
      name: "Basic Analytics",
      description: "Shows basic view count",
    },
    {
      key: "analytics.advanced",
      name: "Advanced Analytics",
      description: "Unlocks advanced traffic dashboards",
    },
    {
      key: "featured",
      name: "Featured Badge",
      description: "Product marked as featured",
    },
    {
      key: "priorityPlacement",
      name: "Priority Placement",
      description: "Listed higher in results",
    },
    {
      key: "homepage",
      name: "Homepage Placement",
      description: "Visible on homepage",
    },
    {
      key: "stickyBanner",
      name: "Sticky Banner",
      description: "Sticky header visibility",
    },
    {
      key: "customCTA",
      name: "Custom CTA",
      description: "Add your own button/CTA",
    },
    {
      key: "earlyAccess",
      name: "Early Access",
      description: "Access new features early",
    },
    {
      key: "newsletterPromotion",
      name: "Newsletter Promotion",
      description: "Promoted in email campaigns",
    },
    {
      key: "backlink",
      name: "Do-follow Backlink",
      description: "Enables do-follow link to your site",
    },
  ]

  const createdFeatures: Record<string, { id: string }> = {}
  for (const feature of features) {
    const created = await prisma.planFeature.upsert({
      where: { key: feature.key },
      update: {},
      create: feature,
    })
    createdFeatures[feature.key] = { id: created.id }
  }

  // Seed Plans (Optimized with createMany for assignments)
  const plans = [
    {
      name: "Free",
      slug: "free",
      description: "Basic listing",
      type: PlanType.one_time_price,
      price: 0,
      isDefault: true,
      boostForDays: 1,
      featureKeys: ["analytics.basic", "backlink"],
    },
    {
      name: "Featured",
      slug: "featured",
      description: "Boosted listing",
      type: PlanType.one_time_price,
      price: 1900,
      isDefault: false,
      boostForDays: 14,
      featureKeys: [
        "analytics.basic",
        "analytics.advanced",
        "featured",
        "priorityPlacement",
        "homepage",
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
      featureKeys: [
        "analytics.basic",
        "analytics.advanced",
        "featured",
        "priorityPlacement",
        "homepage",
        "stickyBanner",
        "customCTA",
        "earlyAccess",
        "newsletterPromotion",
        "backlink",
      ],
    },
  ]

  const createdPlans: Plan[] = []
  for (const plan of plans) {
    const { featureKeys, ...planData } = plan
    const created = await prisma.plan.create({ data: planData })
    createdPlans.push(created)

    await prisma.planFeatureAssignment.createMany({
      data: featureKeys.map((key) => ({
        planId: created.id,
        featureId: createdFeatures[key].id,
        enabled: true,
        isExperimental: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      skipDuplicates: true,
    })
  }

  // Seed Primary Product
  await prisma.product.create({
    data: {
      name: "ShitPosts",
      slug: "shitposts",
      tagline: "Build and share your shitposts",
      description:
        "A platform to create, share, and discover the best shitposts.",
      websiteUrl: "https://shitposts.ai",
      logo: "https://shitposts.ai/brand.png",
      bannerImage: "https://shitposts.ai/banner.png",
      status: "published",
      publishedAt: new Date(),
      startingPriceCents: 0,
      currencyCode: "USD",
      ctaLabel: "Visit Website",
      ctaUrl: "https://shitposts.ai",
      keywords: ["memes", "social", "fun"],
      platforms: ["web"],
      user: { connect: { id: createdUsers[0].id } },
      category: { connect: { id: createdCategories[0].id } },
      organization: { connect: { id: createdOrgs[0].id } },
      plan: { connect: { id: createdPlans[1].id } },
      planAssignedAt: new Date(),
      type: "saas",
      pricingModel: "freemium",
      metadata: {
        create: {
          githubUrl: "https://github.com/deploykit/app",
          twitterUrl: "https://twitter.com/deploykit",
          demoUrl: "https://demo.deploykit.dev",
          contactEmail: "hello@deploykit.dev",
        },
      },
      verification: {
        create: {
          verificationTxt: "deploykit-verification=xyz123",
          isVerified: false,
        },
      },
      analytics: {
        create: {
          upvotes: 120,
          clicks: 700,
        },
      },
    },
  })

  // Seed 50 More Products
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

  const bulkProducts: Prisma.ProductCreateInput[] = productNames.map(
    (name, i) => {
      const domain = `https://${name.toLowerCase()}.dev`
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")

      return {
        name,
        slug,
        tagline: taglines[i % taglines.length],
        websiteUrl: domain,
        logo: `${domain}/logo.png`,
        bannerImage: `${domain}/banner.png`,
        status: "published",
        publishedAt: new Date(),
        description: `${name} helps you ${taglines[i % taglines.length].toLowerCase()}.`,
        type: "saas",
        pricingModel: "subscription",
        startingPriceCents: [0, 900, 1900, 2900, 4900][i % 5],
        currencyCode: "USD",
        ctaLabel: "Try for free",
        ctaUrl: domain,
        keywords: ["saas", "productivity", "launch"],
        platforms: ["web"],
        user: {
          connect: {
            id: i % 2 === 0 ? createdUsers[0].id : createdUsers[1].id,
          },
        },
        category: {
          connect: {
            id: i % 3 === 0 ? createdCategories[0].id : createdCategories[1].id,
          },
        },
        organization: {
          connect: {
            id: i % 2 === 0 ? createdOrgs[0].id : createdOrgs[1].id,
          },
        },
        plan: {
          connect: {
            id: i % 5 === 0 ? createdPlans[1].id : createdPlans[0].id,
          },
        },
        metadata: {
          create: {
            githubUrl: `https://github.com/${name.toLowerCase()}`,
            twitterUrl: `https://twitter.com/${name.toLowerCase()}`,
            demoUrl: `${domain}/demo`,
            contactEmail: `contact@${domain.replace("https://", "")}`,
          },
        },
        verification: {
          create: {
            verificationTxt: `${name.toLowerCase()}-verification=${Math.floor(Math.random() * 9000 + 1000)}`,
            isVerified: false,
          },
        },
        analytics: {
          create: {
            upvotes: Math.floor(Math.random() * 500),
            clicks: Math.floor(Math.random() * 2000),
          },
        },
      }
    },
  )

  await Promise.all(bulkProducts.map((data) => prisma.product.create({ data })))
}

main()

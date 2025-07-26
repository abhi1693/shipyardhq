import { PrismaClient, Prisma, PlanType } from "@prisma/client"

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
    },
    {
      clerkId: "clerk-002",
      email: "user2@example.com",
      firstName: "Bob",
      lastName: "Smith",
      role: "member",
    },
  ]
  const createdUsers = await Promise.all(
    users.map((data) => prisma.user.create({ data })),
  )

  // Seed Categories
  const categories: Prisma.CategoryCreateInput[] = [
    { name: "Dev Tools", slug: "dev-tools" },
    { name: "Productivity", slug: "productivity" },
  ]
  const createdCategories = await Promise.all(
    categories.map((data) => prisma.category.create({ data })),
  )

  // Seed Plan Features
  const allFeatures = [
    {
      key: "analytics.basic",
      name: "Basic Analytics",
      description: "Shows basic view count",
    },
    {
      key: "analytics.advanced",
      name: "Advanced Analytics",
      description: "Shows CTR and traffic sources",
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
  for (const feature of allFeatures) {
    const created = await prisma.planFeature.upsert({
      where: { key: feature.key },
      update: {},
      create: {
        key: feature.key,
        name: feature.name,
        description: feature.description,
      },
    })
    createdFeatures[feature.key] = { id: created.id }
  }

  // Seed Plans
  const plans = [
    {
      name: "Free",
      slug: "free",
      description: "Basic listing",
      type: PlanType.recurring,
      price: 0,
      interval: "month",
      frequency: 1,
      isDefault: true,
      features: ["analytics.basic", "backlink"],
    },
    {
      name: "Featured",
      slug: "featured",
      description: "Boosted listing",
      type: PlanType.recurring,
      price: 1900,
      interval: "month",
      frequency: 1,
      isDefault: false,
      features: [
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
      type: PlanType.recurring,
      price: 4900,
      interval: "month",
      frequency: 1,
      isDefault: false,
      features: [
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

  const createdPlans = []
  for (const plan of plans) {
    const created = await prisma.plan.create({
      data: {
        name: plan.name,
        slug: plan.slug,
        description: plan.description,
        type: plan.type,
        price: plan.price,
        interval: plan.interval,
        frequency: plan.frequency,
        isDefault: plan.isDefault,
      },
    })

    for (const featureKey of plan.features) {
      await prisma.planFeatureAssignment.create({
        data: {
          planId: created.id,
          featureId: createdFeatures[featureKey].id,
          enabled: true,
          isExperimental: false,
        },
      })
    }

    createdPlans.push(created)
  }

  // Seed Products
  const products: Prisma.ProductCreateInput[] = [
    {
      name: "ShitPosts",
      tagline: "Build and share your shitposts",
      websiteUrl: "https://shitposts.ai",
      logo: "https://shitposts.ai/brand.png",
      user: { connect: { id: createdUsers[0].id } },
      category: { connect: { id: createdCategories[0].id } },
      plan: { connect: { id: createdPlans[1].id } },
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
          views: 2500,
          upvotes: 120,
          clicks: 700,
        },
      },
    },
  ]

  await Promise.all(products.map((data) => prisma.product.create({ data })))
}

main()
  .then(() => console.log("✅ Seeding complete."))
  .catch((e) => {
    console.error("❌ Error seeding database:", e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())

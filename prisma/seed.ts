import { PrismaClient, Prisma } from "@prisma/client"

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
  const createdUsers = await Promise.all(users.map((data) => prisma.user.create({ data })))

  // Seed Categories
  const categories: Prisma.CategoryCreateInput[] = [
    { name: "Dev Tools", slug: "dev-tools" },
    { name: "Productivity", slug: "productivity" },
  ]
  const createdCategories = await Promise.all(categories.map((data) => prisma.category.create({ data })))

  // Seed Plans
  const plans: (Prisma.PlanCreateInput & { features: { key: string; enabled: boolean }[] })[] = [
    {
      name: "Free",
      slug: "free",
      description: "Basic listing",
      type: "recurring",
      price: 0,
      interval: "month",
      frequency: 1,
      isDefault: true,
      features: [
        { key: "analytics.basic", enabled: true },
        { key: "backlink", enabled: true },
      ],
    },
    {
      name: "Featured",
      slug: "featured",
      description: "Boosted listing",
      type: "recurring",
      price: 1900,
      interval: "month",
      frequency: 1,
      isDefault: false,
      features: [
        { key: "analytics.basic", enabled: true },
        { key: "analytics.advanced", enabled: true },
        { key: "featured", enabled: true },
        { key: "priorityPlacement", enabled: true },
        { key: "homepage", enabled: true },
      ],
    },
    {
      name: "Pro",
      slug: "pro",
      description: "Maximum visibility",
      type: "recurring",
      price: 4900,
      interval: "month",
      frequency: 1,
      isDefault: false,
      features: [
        { key: "analytics.basic", enabled: true },
        { key: "analytics.advanced", enabled: true },
        { key: "featured", enabled: true },
        { key: "priorityPlacement", enabled: true },
        { key: "homepage", enabled: true },
        { key: "stickyBanner", enabled: true },
        { key: "customCTA", enabled: true },
        { key: "earlyAccess", enabled: true },
        { key: "newsletterPromotion", enabled: true },
        { key: "backlink", enabled: true },
      ],
    },
  ]

  const createdPlans = []
  for (const plan of plans) {
    const created = await prisma.plan.create({
      data: {
        ...plan,
        features: {
          create: plan.features.map((f) => ({
            key: f.key,
            enabled: f.enabled,
            isExperimental: false,
          })),
        },
      },
    })
    createdPlans.push(created)
  }

  // Seed Products
  const products: Prisma.ProductCreateInput[] = [
    {
      name: "DeployKit",
      tagline: "One-click deploys for your stack",
      websiteUrl: "https://deploykit.dev",
      logo: "https://deploykit.dev/logo.png",
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
          isVerified: true,
          verifiedAt: new Date(),
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
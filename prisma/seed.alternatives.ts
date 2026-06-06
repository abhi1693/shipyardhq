import path from "node:path"
import { pathToFileURL } from "node:url"

import type { PrismaClient } from "@/lib/vendor/prisma/client"
import slugifyLib from "slugify"

const slugify = (text: string) =>
  slugifyLib(text, { lower: true, strict: true })

const prismaPromise = import("@/lib/prisma").then(
  (module) => module.default as PrismaClient,
)

type AlternativeSeed = {
  name: string
  slug?: string
  description: string
  websiteUrl: string
  logoUrl: string
  categorySlugs: string[]
  productSlugs: string[]
}

const ALTERNATIVES: AlternativeSeed[] = [
  {
    name: "MailBridge",
    description:
      "Email automation platform that connects marketing, lifecycle campaigns, and community outreach in one workspace.",
    websiteUrl: "https://mailbridge.io",
    logoUrl: "https://mailbridge.io/logo.png",
    categorySlugs: ["marketing", "automation-and-workflow"],
    productSlugs: [
      "askusers",
      "shitposts",
      "dev-prism-capture",
      "dev-launch-001",
      "dev-launch-008",
    ],
  },
  {
    name: "SupportSphere",
    description:
      "Collaborative inbox and knowledge base that helps teams resolve issues faster with unified workflows.",
    websiteUrl: "https://supportsphere.app",
    logoUrl: "https://supportsphere.app/logo.png",
    categorySlugs: ["customer-support", "collaboration-and-community"],
    productSlugs: [
      "askusers",
      "dev-support-tide",
      "dev-feedback-forge",
      "dev-launch-005",
      "dev-launch-015",
    ],
  },
  {
    name: "InsightBoard",
    description:
      "Executive dashboards, cohort tracking, and automated insights for modern SaaS operators.",
    websiteUrl: "https://insightboard.dev",
    logoUrl: "https://insightboard.dev/logo.png",
    categorySlugs: ["analytics", "productivity"],
    productSlugs: [
      "indexly",
      "ai-seo-web-checker",
      "dev-revenue-radar",
      "dev-signal-deck",
      "dev-launch-002",
      "dev-launch-007",
    ],
  },
  {
    name: "GrowthGears",
    description:
      "Demand generation toolkit combining funnels, attribution, and outbound automation.",
    websiteUrl: "https://growthgears.com",
    logoUrl: "https://growthgears.com/logo.png",
    categorySlugs: ["marketing", "sales"],
    productSlugs: [
      "askusers",
      "shitposts",
      "dev-pipeline-pulse",
      "dev-prism-capture",
      "dev-launch-009",
      "dev-launch-019",
    ],
  },
  {
    name: "AutomateHub",
    description:
      "Integration hub for syncing data, automating back-office tasks, and orchestrating internal tooling.",
    websiteUrl: "https://automatehub.io",
    logoUrl: "https://automatehub.io/logo.png",
    categorySlugs: ["automation-and-workflow", "developer-tools"],
    productSlugs: [
      "unshift",
      "shipyardhq",
      "dev-dockpilot",
      "dev-api-compass",
      "dev-api-harbor",
      "dev-launch-004",
    ],
  },
  {
    name: "DesignForge",
    description:
      "Design ideation suite with real-time collaboration, component libraries, and AI assisted mockups.",
    websiteUrl: "https://designforge.studio",
    logoUrl: "https://designforge.studio/logo.png",
    categorySlugs: ["design-and-ui", "productivity"],
    productSlugs: [
      "shipyardhq",
      "unshift",
      "dev-design-crane",
      "dev-prism-capture",
      "dev-launch-006",
    ],
  },
  {
    name: "Product Hunt",
    description:
      "Launch discovery community where makers publish new products, collect votes, and build early distribution.",
    websiteUrl: "https://www.producthunt.com",
    logoUrl: "https://logo.clearbit.com/producthunt.com",
    categorySlugs: ["marketing", "creator-economy", "developer-tools"],
    productSlugs: [
      "shipyardhq",
      "askusers",
      "dev-dockpilot",
      "dev-launch-notes",
      "dev-prism-capture",
      "dev-launch-001",
    ],
  },
  {
    name: "Canny",
    description:
      "Feedback collection and roadmap planning platform for prioritizing user requests and product decisions.",
    websiteUrl: "https://canny.io",
    logoUrl: "https://logo.clearbit.com/canny.io",
    categorySlugs: ["customer-support", "product-management"],
    productSlugs: [
      "askusers",
      "shipyardhq",
      "dev-support-tide",
      "dev-feedback-forge",
      "dev-roadmap-river",
    ],
  },
  {
    name: "Intercom",
    description:
      "Customer messaging and support platform for inbox workflows, help centers, and lifecycle engagement.",
    websiteUrl: "https://www.intercom.com",
    logoUrl: "https://logo.clearbit.com/intercom.com",
    categorySlugs: ["customer-support", "customer-success"],
    productSlugs: [
      "askusers",
      "dev-support-tide",
      "dev-feedback-forge",
      "dev-launch-005",
      "dev-launch-015",
    ],
  },
  {
    name: "Google Analytics",
    description:
      "Web and campaign analytics platform for understanding acquisition, engagement, and conversion paths.",
    websiteUrl: "https://analytics.google.com",
    logoUrl: "https://logo.clearbit.com/google.com",
    categorySlugs: ["analytics", "marketing"],
    productSlugs: [
      "indexly",
      "ai-seo-web-checker",
      "dev-revenue-radar",
      "dev-signal-deck",
      "dev-cart-current",
      "dev-launch-002",
    ],
  },
  {
    name: "Baremetrics",
    description:
      "Subscription analytics and revenue reporting for SaaS companies tracking MRR, churn, and growth metrics.",
    websiteUrl: "https://baremetrics.com",
    logoUrl: "https://logo.clearbit.com/baremetrics.com",
    categorySlugs: ["analytics", "finance-and-accounting"],
    productSlugs: [
      "shipyardhq",
      "indexly",
      "dev-revenue-radar",
      "dev-checkout-beacon",
      "dev-cart-current",
    ],
  },
  {
    name: "Zapier",
    description:
      "No-code automation platform for connecting SaaS apps, moving data, and triggering workflow actions.",
    websiteUrl: "https://zapier.com",
    logoUrl: "https://logo.clearbit.com/zapier.com",
    categorySlugs: [
      "automation-and-workflow",
      "apis-and-integrations",
      "nocode-and-lowcode",
    ],
    productSlugs: [
      "unshift",
      "shipyardhq",
      "dev-api-compass",
      "dev-api-harbor",
      "dev-dockpilot",
      "dev-launch-004",
    ],
  },
  {
    name: "Webflow",
    description:
      "Visual website builder and CMS for launching marketing sites, landing pages, and polished web experiences.",
    websiteUrl: "https://webflow.com",
    logoUrl: "https://logo.clearbit.com/webflow.com",
    categorySlugs: ["design-and-ui", "nocode-and-lowcode", "marketing"],
    productSlugs: [
      "shipyardhq",
      "unshift",
      "dev-design-crane",
      "dev-prism-capture",
      "dev-launch-006",
    ],
  },
  {
    name: "Ahrefs",
    description:
      "SEO platform for keyword research, site audits, backlink intelligence, and content growth workflows.",
    websiteUrl: "https://ahrefs.com",
    logoUrl: "https://logo.clearbit.com/ahrefs.com",
    categorySlugs: ["seo-growth", "marketing", "analytics"],
    productSlugs: [
      "indexly",
      "ai-seo-web-checker",
      "shitposts",
      "dev-signal-deck",
      "dev-launch-002",
    ],
  },
  {
    name: "HubSpot",
    description:
      "CRM and growth platform for marketing automation, sales pipelines, and customer lifecycle operations.",
    websiteUrl: "https://www.hubspot.com",
    logoUrl: "https://logo.clearbit.com/hubspot.com",
    categorySlugs: ["sales", "marketing", "customer-success"],
    productSlugs: [
      "askusers",
      "shitposts",
      "dev-pipeline-pulse",
      "dev-prism-capture",
      "dev-launch-009",
    ],
  },
  {
    name: "Linear",
    description:
      "Issue tracking and product planning workspace built for fast-moving software teams.",
    websiteUrl: "https://linear.app",
    logoUrl: "https://logo.clearbit.com/linear.app",
    categorySlugs: ["product-management", "developer-tools", "productivity"],
    productSlugs: [
      "shipyardhq",
      "unshift",
      "dev-dockpilot",
      "dev-launch-notes",
      "dev-roadmap-river",
      "dev-launch-006",
    ],
  },
  {
    name: "Sentry",
    description:
      "Application monitoring and error tracking platform for debugging production software and protecting user experience.",
    websiteUrl: "https://sentry.io",
    logoUrl: "https://logo.clearbit.com/sentry.io",
    categorySlugs: ["monitoring-and-observability", "developer-tools"],
    productSlugs: [
      "unshift",
      "shipyardhq",
      "dev-uptime-buoy",
      "dev-api-compass",
      "dev-api-harbor",
      "dev-launch-010",
    ],
  },
  {
    name: "Stripe Billing",
    description:
      "Billing infrastructure for subscriptions, usage-based pricing, invoicing, payments, and revenue operations.",
    websiteUrl: "https://stripe.com/billing",
    logoUrl: "https://logo.clearbit.com/stripe.com",
    categorySlugs: ["ecommerce", "finance-and-accounting"],
    productSlugs: [
      "shipyardhq",
      "dev-checkout-beacon",
      "dev-cart-current",
      "dev-revenue-radar",
      "dev-launch-002",
    ],
  },
  {
    name: "Buffer",
    description:
      "Social media planning and publishing platform for scheduling posts, tracking engagement, and growing channels.",
    websiteUrl: "https://buffer.com",
    logoUrl: "https://logo.clearbit.com/buffer.com",
    categorySlugs: ["social-media-tools", "marketing", "creator-economy"],
    productSlugs: [
      "shitposts",
      "askusers",
      "dev-prism-capture",
      "dev-launch-001",
      "dev-launch-008",
    ],
  },
  {
    name: "Postman",
    description:
      "API collaboration platform for designing, testing, documenting, and monitoring integrations.",
    websiteUrl: "https://www.postman.com",
    logoUrl: "https://logo.clearbit.com/postman.com",
    categorySlugs: [
      "apis-and-integrations",
      "developer-tools",
      "testing-and-qa",
    ],
    productSlugs: [
      "unshift",
      "shipyardhq",
      "dev-api-harbor",
      "dev-api-compass",
      "dev-launch-006",
    ],
  },
]

type SeedAlternativesContext = {
  categoryIdBySlug?: Map<string, string>
  productIdBySlug?: Map<string, string>
}

export async function seedAlternatives(
  prisma: PrismaClient,
  context: SeedAlternativesContext = {},
) {
  const categoryMap =
    context.categoryIdBySlug ??
    new Map(
      (
        await prisma.category.findMany({
          select: { id: true, slug: true },
        })
      ).map((category) => [category.slug, category.id] as const),
    )

  const productMap =
    context.productIdBySlug ??
    new Map(
      (
        await prisma.product.findMany({
          select: { id: true, slug: true },
        })
      ).map((product) => [product.slug, product.id] as const),
    )

  const results: Array<{
    name: string
    slug: string
    action: "create" | "update"
    categories: number
    products: number
  }> = []

  for (const definition of ALTERNATIVES) {
    const slug = definition.slug ?? slugify(definition.name)

    const categoryIds = definition.categorySlugs
      .map((categorySlug) => categoryMap.get(categorySlug))
      .filter((value): value is string => Boolean(value))
    if (!categoryIds.length) {
      console.warn(
        `Skipping alternative '${slug}' — no matching categories found (${definition.categorySlugs.join(", ")})`,
      )
      continue
    }

    const productIds = definition.productSlugs
      .map((productSlug) => productMap.get(productSlug))
      .filter((value): value is string => Boolean(value))
    if (!productIds.length) {
      console.warn(
        `Skipping alternative '${slug}' — no matching products found (${definition.productSlugs.join(", ")})`,
      )
      continue
    }

    const existing = await prisma.alternativeProduct.findUnique({
      where: { slug },
    })

    await prisma.alternativeProduct.upsert({
      where: { slug },
      update: {
        name: definition.name,
        description: definition.description,
        websiteUrl: definition.websiteUrl,
        logoUrl: definition.logoUrl,
        categories: {
          set: categoryIds.map((id) => ({ id })),
        },
        products: {
          set: productIds.map((id) => ({ id })),
        },
      },
      create: {
        slug,
        name: definition.name,
        description: definition.description,
        websiteUrl: definition.websiteUrl,
        logoUrl: definition.logoUrl,
        categories: {
          connect: categoryIds.map((id) => ({ id })),
        },
        products: {
          connect: productIds.map((id) => ({ id })),
        },
      },
    })

    results.push({
      name: definition.name,
      slug,
      action: existing ? "update" : "create",
      categories: categoryIds.length,
      products: productIds.length,
    })
  }

  if (results.length) {
    console.table(results)
  }

  return results
}

const invokedDirectly = (() => {
  if (!process.argv[1]) return false
  const cliUrl = pathToFileURL(path.resolve(process.argv[1])).href
  return import.meta.url === cliUrl
})()

if (invokedDirectly) {
  prismaPromise
    .then((prisma) => seedAlternatives(prisma))
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
    .finally(async () => {
      const prisma = await prismaPromise
      await prisma.$disconnect()
    })
}

import path from "node:path"
import { pathToFileURL } from "node:url"

import type { PrismaClient } from "@/lib/vendor/prisma/client"
import slugifyLib from "slugify"

const prismaPromise = import("@/lib/prisma").then(
  (module) => module.default as PrismaClient,
)

const slugify = (text: string) =>
  slugifyLib(text, { lower: true, strict: true })

type UseCaseSeed = {
  label: string
  slug?: string
  categorySlugs: string[]
}

// Prod-safe, idempotent seeding for UseCases and their Category mappings
const USE_CASES: UseCaseSeed[] = [
  {
    label: "Launch a SaaS",
    slug: "launch-saas",
    categorySlugs: ["developer-tools", "productivity"],
  },
  {
    label: "Automate Workflows",
    slug: "automate-workflows",
    categorySlugs: [
      "automation-and-workflow",
      "nocode-and-lowcode",
      "apis-and-integrations",
    ],
  },
  {
    label: "Grow Your Audience",
    slug: "grow-your-audience",
    categorySlugs: ["marketing", "seo-growth", "social-media-tools"],
  },
  {
    label: "Build Community",
    slug: "build-community",
    categorySlugs: [
      "collaboration-and-community",
      "social-media-tools",
      "creator-economy",
    ],
  },
  {
    label: "Ship Faster",
    slug: "ship-faster",
    categorySlugs: [
      "devops-and-cicd",
      "testing-and-qa",
      "monitoring-and-observability",
      "hosting-and-cloud",
    ],
  },
  {
    label: "Automate Support",
    slug: "automate-support",
    categorySlugs: ["customer-support", "ai-and-machine-learning"],
  },
  {
    label: "Scale Customer Success",
    slug: "scale-customer-success",
    categorySlugs: ["customer-success", "product-management"],
  },
  {
    label: "Build Internal Tools",
    slug: "build-internal-tools",
    categorySlugs: ["internal-tools", "developer-tools"],
  },
  {
    label: "Launch a Marketplace",
    slug: "launch-marketplace",
    categorySlugs: ["marketplace-platforms", "ecommerce", "creator-economy"],
  },
  {
    label: "Optimize Field Operations",
    slug: "optimize-field-operations",
    categorySlugs: ["field-operations-and-logistics", "iot-and-hardware"],
  },
  {
    label: "Monetize Content",
    slug: "monetize-content",
    categorySlugs: [
      "creator-economy",
      "content-and-writing",
      "video-and-audio",
    ],
  },
  {
    label: "Deliver Analytics",
    slug: "deliver-analytics",
    categorySlugs: [
      "analytics",
      "monitoring-and-observability",
      "ai-and-machine-learning",
    ],
  },
  {
    label: "Launch a Crypto App",
    slug: "launch-crypto-app",
    categorySlugs: [
      "web3-and-crypto",
      "crypto-infrastructure",
      "developer-tools",
    ],
  },
  {
    label: "Accept Crypto Payments",
    slug: "accept-crypto-payments",
    categorySlugs: ["crypto-payments", "ecommerce", "finance-and-accounting"],
  },
  {
    label: "Monitor On-Chain Activity",
    slug: "monitor-on-chain-activity",
    categorySlugs: ["crypto-analytics", "analytics", "security-and-privacy"],
  },
  {
    label: "Secure Your Stack",
    slug: "secure-your-stack",
    categorySlugs: [
      "security-and-privacy",
      "devops-and-cicd",
      "monitoring-and-observability",
      "legal-and-compliance",
    ],
  },
  {
    label: "Automate Finance Ops",
    slug: "automate-finance-ops",
    categorySlugs: [
      "finance-and-accounting",
      "automation-and-workflow",
      "internal-tools",
    ],
  },
  {
    label: "Empower Remote Teams",
    slug: "empower-remote-teams",
    categorySlugs: [
      "collaboration-and-community",
      "productivity",
      "hr-and-hiring",
    ],
  },
  {
    label: "Create AI Media",
    slug: "create-ai-media",
    categorySlugs: [
      "video-and-audio",
      "design-and-ui",
      "content-and-writing",
      "ai-and-machine-learning",
    ],
  },
  {
    label: "Sell Online",
    slug: "sell-online",
    categorySlugs: ["ecommerce", "sales", "marketing", "customer-support"],
  },
  {
    label: "Launch an Education Product",
    slug: "launch-education-product",
    categorySlugs: [
      "learning-and-education",
      "content-and-writing",
      "video-and-audio",
    ],
  },
  {
    label: "Build Health & Wellness Tools",
    slug: "build-health-wellness-tools",
    categorySlugs: [
      "health-and-wellness",
      "ai-and-machine-learning",
      "productivity",
    ],
  },
  {
    label: "Manage Business Operations",
    slug: "manage-business-operations",
    categorySlugs: [
      "finance-and-accounting",
      "legal-and-compliance",
      "hr-and-hiring",
      "internal-tools",
    ],
  },
  {
    label: "Build API-First Products",
    slug: "build-api-first-products",
    categorySlugs: [
      "apis-and-integrations",
      "developer-tools",
      "databases-and-data",
      "hosting-and-cloud",
    ],
  },
  {
    label: "Launch Local Services",
    slug: "launch-local-services",
    categorySlugs: [
      "travel-and-tourism",
      "food-and-beverage",
      "real-estate",
      "field-operations-and-logistics",
    ],
  },
  {
    label: "Build Games & Entertainment",
    slug: "build-games-entertainment",
    categorySlugs: [
      "gaming-and-entertainment",
      "video-and-audio",
      "creator-economy",
    ],
  },
  {
    label: "Build AI Chatbots",
    slug: "build-ai-chatbots",
    categorySlugs: [
      "ai-and-machine-learning",
      "customer-support",
      "automation-and-workflow",
    ],
  },
  {
    label: "Create AI Writing Tools",
    slug: "create-ai-writing-tools",
    categorySlugs: [
      "ai-and-machine-learning",
      "content-and-writing",
      "marketing",
    ],
  },
  {
    label: "Build AI Productivity Apps",
    slug: "build-ai-productivity-apps",
    categorySlugs: [
      "ai-and-machine-learning",
      "productivity",
      "automation-and-workflow",
    ],
  },
  {
    label: "Create Lead Generation Tools",
    slug: "create-lead-generation-tools",
    categorySlugs: ["marketing", "sales", "seo-growth"],
  },
  {
    label: "Optimize SEO Workflows",
    slug: "optimize-seo-workflows",
    categorySlugs: ["seo-growth", "marketing", "analytics"],
  },
  {
    label: "Automate Email Marketing",
    slug: "automate-email-marketing",
    categorySlugs: ["marketing", "sales", "automation-and-workflow"],
  },
  {
    label: "Schedule Social Media Content",
    slug: "schedule-social-media-content",
    categorySlugs: ["social-media-tools", "marketing", "analytics"],
  },
  {
    label: "Build Landing Page Tools",
    slug: "build-landing-page-tools",
    categorySlugs: ["marketing", "design-and-ui", "nocode-and-lowcode"],
  },
  {
    label: "Create Forms & Surveys",
    slug: "create-forms-and-surveys",
    categorySlugs: [
      "productivity",
      "marketing",
      "analytics",
      "nocode-and-lowcode",
    ],
  },
  {
    label: "Run Customer Research",
    slug: "run-customer-research",
    categorySlugs: ["product-management", "analytics", "customer-support"],
  },
  {
    label: "Collect Product Feedback",
    slug: "collect-product-feedback",
    categorySlugs: [
      "product-management",
      "customer-success",
      "customer-support",
    ],
  },
  {
    label: "Manage Product Roadmaps",
    slug: "manage-product-roadmaps",
    categorySlugs: [
      "product-management",
      "collaboration-and-community",
      "internal-tools",
    ],
  },
  {
    label: "Build Knowledge Bases",
    slug: "build-knowledge-bases",
    categorySlugs: [
      "customer-support",
      "content-and-writing",
      "collaboration-and-community",
    ],
  },
  {
    label: "Create Documentation Portals",
    slug: "create-documentation-portals",
    categorySlugs: [
      "developer-tools",
      "content-and-writing",
      "customer-support",
    ],
  },
  {
    label: "Manage Sales Pipelines",
    slug: "manage-sales-pipelines",
    categorySlugs: ["sales", "customer-success", "automation-and-workflow"],
  },
  {
    label: "Manage Subscriptions & Billing",
    slug: "manage-subscriptions-and-billing",
    categorySlugs: ["ecommerce", "finance-and-accounting", "customer-success"],
  },
  {
    label: "Schedule Bookings & Appointments",
    slug: "schedule-bookings-and-appointments",
    categorySlugs: [
      "productivity",
      "travel-and-tourism",
      "food-and-beverage",
      "field-operations-and-logistics",
    ],
  },
  {
    label: "Build Recruiting Workflows",
    slug: "build-recruiting-workflows",
    categorySlugs: ["hr-and-hiring", "ai-and-machine-learning", "productivity"],
  },
  {
    label: "Manage Compliance Workflows",
    slug: "manage-compliance-workflows",
    categorySlugs: [
      "legal-and-compliance",
      "security-and-privacy",
      "finance-and-accounting",
    ],
  },
  {
    label: "Build Real Estate Tools",
    slug: "build-real-estate-tools",
    categorySlugs: ["real-estate", "sales", "marketing"],
  },
  {
    label: "Run Restaurant Operations",
    slug: "run-restaurant-operations",
    categorySlugs: [
      "food-and-beverage",
      "field-operations-and-logistics",
      "finance-and-accounting",
    ],
  },
  {
    label: "Plan Trips & Itineraries",
    slug: "plan-trips-and-itineraries",
    categorySlugs: [
      "travel-and-tourism",
      "ai-and-machine-learning",
      "productivity",
    ],
  },
  {
    label: "Create Fitness Coaching Apps",
    slug: "create-fitness-coaching-apps",
    categorySlugs: [
      "health-and-wellness",
      "ai-and-machine-learning",
      "productivity",
    ],
  },
  {
    label: "Track Sustainability Metrics",
    slug: "track-sustainability-metrics",
    categorySlugs: [
      "green-and-sustainability",
      "analytics",
      "iot-and-hardware",
    ],
  },
]

export async function seedUseCases(prisma: PrismaClient) {
  const rows: { label: string; slug: string; action: "create" | "update" }[] =
    []

  for (const def of USE_CASES) {
    const slug = def.slug ?? slugify(def.label)

    const existing = await prisma.useCase.findUnique({ where: { slug } })
    const action = existing ? ("update" as const) : ("create" as const)

    const useCase = await prisma.useCase.upsert({
      where: { slug },
      update: { label: def.label },
      create: { slug, label: def.label },
    })

    // Resolve categories and upsert join rows
    const categories = await prisma.category.findMany({
      where: { slug: { in: def.categorySlugs } },
      select: { id: true, slug: true },
    })
    const foundSlugs = new Set(categories.map((c) => c.slug))
    const missing = def.categorySlugs.filter((s) => !foundSlugs.has(s))
    if (missing.length) {
      console.warn(
        `UseCase ${slug} missing categories (skipped mappings): ${missing.join(", ")}`,
      )
    }

    // Create/enable mappings. Use upsert on the compound unique [useCaseId, categoryId]
    for (const category of categories) {
      await prisma.useCaseCategory.upsert({
        where: {
          useCaseId_categoryId: {
            useCaseId: useCase.id,
            categoryId: category.id,
          },
        },
        update: {},
        create: { useCaseId: useCase.id, categoryId: category.id },
      })
    }

    rows.push({ label: def.label, slug, action })
  }

  console.table(rows)
  return rows
}

const invokedDirectly = (() => {
  if (!process.argv[1]) return false
  const cliUrl = pathToFileURL(path.resolve(process.argv[1])).href
  return import.meta.url === cliUrl
})()

if (invokedDirectly) {
  prismaPromise
    .then((prisma) => seedUseCases(prisma))
    .catch((e) => {
      console.error(e)
      process.exit(1)
    })
    .finally(async () => {
      const prisma = await prismaPromise
      await prisma.$disconnect()
    })
}

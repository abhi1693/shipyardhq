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
    categorySlugs: ["automation-workflow", "no-code-low-code"],
  },
  {
    label: "Grow Your Audience",
    slug: "grow-your-audience",
    categorySlugs: ["marketing", "seo-growth", "social-media-tools"],
  },
  {
    label: "Build Community",
    slug: "build-community",
    categorySlugs: ["collaboration-community"],
  },
  {
    label: "Ship Faster",
    slug: "ship-faster",
    categorySlugs: ["devops-ci-cd", "testing-qa", "monitoring-observability"],
  },
  {
    label: "Automate Support",
    slug: "automate-support",
    categorySlugs: ["customer-support", "ai-machine-learning"],
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
    categorySlugs: ["marketplace-platforms", "e-commerce", "creator-economy"],
  },
  {
    label: "Optimize Field Operations",
    slug: "optimize-field-operations",
    categorySlugs: ["field-operations-logistics", "iot-hardware"],
  },
  {
    label: "Monetize Content",
    slug: "monetize-content",
    categorySlugs: ["creator-economy", "content-writing", "video-audio"],
  },
  {
    label: "Deliver Analytics",
    slug: "deliver-insights",
    categorySlugs: [
      "analytics",
      "monitoring-observability",
      "ai-machine-learning",
    ],
  },
  {
    label: "Launch a Crypto App",
    slug: "launch-crypto-app",
    categorySlugs: ["web3-crypto", "crypto-infrastructure", "developer-tools"],
  },
  {
    label: "Accept Crypto Payments",
    slug: "accept-crypto-payments",
    categorySlugs: ["crypto-payments", "e-commerce", "finance-accounting"],
  },
  {
    label: "Monitor On-Chain Activity",
    slug: "monitor-on-chain-activity",
    categorySlugs: ["crypto-analytics", "analytics", "security-privacy"],
  },
  {
    label: "Secure Your Stack",
    slug: "secure-your-stack",
    categorySlugs: [
      "security-privacy",
      "devops-ci-cd",
      "monitoring-observability",
    ],
  },
  {
    label: "Automate Finance Ops",
    slug: "automate-finance-ops",
    categorySlugs: [
      "finance-accounting",
      "automation-workflow",
      "internal-tools",
    ],
  },
  {
    label: "Empower Remote Teams",
    slug: "empower-remote-teams",
    categorySlugs: ["collaboration-community", "productivity", "hr-hiring"],
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

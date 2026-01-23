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
    categorySlugs: ["marketing", "automation-workflow"],
    productSlugs: ["launchify", "crowdmagnet", "promowiz"],
  },
  {
    name: "SupportSphere",
    description:
      "Collaborative inbox and knowledge base that helps teams resolve issues faster with unified workflows.",
    websiteUrl: "https://supportsphere.app",
    logoUrl: "https://supportsphere.app/logo.png",
    categorySlugs: ["customer-support", "collaboration-community"],
    productSlugs: ["tasktrove", "syncly", "bugboard"],
  },
  {
    name: "InsightBoard",
    description:
      "Executive dashboards, cohort tracking, and automated insights for modern SaaS operators.",
    websiteUrl: "https://insightboard.dev",
    logoUrl: "https://insightboard.dev/logo.png",
    categorySlugs: ["analytics", "productivity"],
    productSlugs: ["metricflow", "stathero", "insightiq"],
  },
  {
    name: "GrowthGears",
    description:
      "Demand generation toolkit combining funnels, attribution, and outbound automation.",
    websiteUrl: "https://growthgears.com",
    logoUrl: "https://growthgears.com/logo.png",
    categorySlugs: ["marketing", "sales"],
    productSlugs: ["growthforge", "leadloop", "funnelbeam"],
  },
  {
    name: "AutomateHub",
    description:
      "Integration hub for syncing data, automating back-office tasks, and orchestrating internal tooling.",
    websiteUrl: "https://automatehub.io",
    logoUrl: "https://automatehub.io/logo.png",
    categorySlugs: ["automation-workflow", "developer-tools"],
    productSlugs: ["zapsync", "deployflow", "autopromo"],
  },
  {
    name: "DesignForge",
    description:
      "Design ideation suite with real-time collaboration, component libraries, and AI assisted mockups.",
    websiteUrl: "https://designforge.studio",
    logoUrl: "https://designforge.studio/logo.png",
    categorySlugs: ["design-ui", "productivity"],
    productSlugs: ["pixelpush", "uistitch", "codecrest"],
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

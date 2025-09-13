import { PrismaClient } from "@/lib/vendor/prisma/client"
import slugifyLib from "slugify"

const prisma = new PrismaClient()
const slugify = (text: string) => slugifyLib(text, { lower: true, strict: true })

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
    categorySlugs: [
      "devops-ci-cd",
      "testing-qa",
      "monitoring-observability",
    ],
  },
]

async function main() {
  const rows: { label: string; slug: string; action: "create" | "update" }[] = []

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
      // eslint-disable-next-line no-console
      console.warn(
        `UseCase ${slug} missing categories (skipped mappings): ${missing.join(", ")}`,
      )
    }

    // Create/enable mappings. Use upsert on the compound unique [useCaseId, categoryId]
    for (const category of categories) {
      await prisma.useCaseCategory.upsert({
        where: {
          useCaseId_categoryId: { useCaseId: useCase.id, categoryId: category.id },
        },
        update: {},
        create: { useCaseId: useCase.id, categoryId: category.id },
      })
    }

    rows.push({ label: def.label, slug, action })
  }

  // eslint-disable-next-line no-console
  console.table(rows)
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })


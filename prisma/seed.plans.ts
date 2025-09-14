import { PlanType, PrismaClient } from "@/lib/vendor/prisma/client"

const prisma = new PrismaClient()

type PlanSeed = {
  name: string
  slug: string
  description?: string
  type: PlanType
  price: number
  isDefault?: boolean
  boostForDays?: number
  featureKeys: string[]
}

// Prod-safe plans with additive feature assignments; uses upsert and compound unique
const PLANS: PlanSeed[] = [
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

async function main() {
  const rows: { slug: string; action: "create" | "update" }[] = []

  // Resolve features once
  const allFeatures = await prisma.planFeature.findMany({
    select: { id: true, key: true },
  })
  const featureByKey = new Map(allFeatures.map((f) => [f.key, f.id]))

  for (const p of PLANS) {
    const exists = await prisma.plan.findUnique({ where: { slug: p.slug } })
    const action = exists ? ("update" as const) : ("create" as const)

    const plan = await prisma.plan.upsert({
      where: { slug: p.slug },
      update: {
        name: p.name,
        description: p.description,
        type: p.type,
        price: p.price,
        isDefault: !!p.isDefault,
        boostForDays: p.boostForDays ?? 1,
      },
      create: {
        name: p.name,
        slug: p.slug,
        description: p.description,
        type: p.type,
        price: p.price,
        isDefault: !!p.isDefault,
        boostForDays: p.boostForDays ?? 1,
      },
    })

    for (const key of p.featureKeys) {
      const featureId = featureByKey.get(key)
      if (!featureId) {
        // eslint-disable-next-line no-console
        console.warn(
          `Plan ${p.slug}: missing feature '${key}', skip assignment`,
        )
        continue
      }
      await prisma.planFeatureAssignment.upsert({
        where: { planId_featureId: { planId: plan.id, featureId } },
        update: { enabled: true },
        create: { planId: plan.id, featureId, enabled: true },
      })
    }

    rows.push({ slug: p.slug, action })
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

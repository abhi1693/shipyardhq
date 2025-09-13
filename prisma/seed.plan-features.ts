import { PrismaClient } from "@/lib/vendor/prisma/client"

const prisma = new PrismaClient()

// Prod-safe, idempotent PlanFeature seeding
const FEATURES = [
  { key: "analytics.basic", name: "Basic Analytics", description: "Shows basic view count" },
  { key: "featured", name: "Featured Badge", description: "Product marked as featured" },
  { key: "priorityPlacement", name: "Priority Placement", description: "Listed higher in results" },
  { key: "homepage", name: "Homepage Placement", description: "Visible on homepage" },
  { key: "stickyBanner", name: "Sticky Banner", description: "Sticky header visibility" },
  { key: "customCTA", name: "Custom CTA", description: "Add your own button/CTA" },
  { key: "earlyAccess", name: "Early Access", description: "Access new features early" },
  { key: "newsletterPromotion", name: "Newsletter Promotion", description: "Promoted in email campaigns" },
  { key: "backlink", name: "Do-follow Backlink", description: "Enables do-follow link to your site" },
]

async function main() {
  const rows: { key: string; action: "create" | "update" }[] = []
  for (const f of FEATURES) {
    const exists = await prisma.planFeature.findUnique({ where: { key: f.key } })
    const action = exists ? ("update" as const) : ("create" as const)
    await prisma.planFeature.upsert({
      where: { key: f.key },
      update: { name: f.name, description: f.description },
      create: { key: f.key, name: f.name, description: f.description },
    })
    rows.push({ key: f.key, action })
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

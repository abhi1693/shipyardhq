import path from "node:path"
import { pathToFileURL } from "node:url"

import { PrismaClient } from "@/lib/vendor/prisma/client"

// Prod-safe, idempotent PlanFeature seeding
const FEATURES = [
  {
    key: "analytics.basic",
    name: "Basic Analytics",
    description: "Shows basic view count",
  },
  {
    key: "product.sitemap",
    name: "Product Sitemap Submission",
    description:
      "We submit your listing to Google and Bing for faster indexing.",
  },
  {
    key: "backlink",
    name: "Backlink",
    description: "Adds a backlink from Shipyard to your product site.",
  },
  {
    key: "insights.pipeline",
    name: "Product Insights Pipeline",
    description:
      "Run the competitive, community, and discussion analysis pipeline for your product.",
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
    key: "sponsoredProducts",
    name: "Sponsored Placement",
    description: "Reserve a sponsored slot across Shipyard",
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
    key: "newsletterPromotion",
    name: "Newsletter Promotion",
    description: "Promoted in email campaigns",
  },
  {
    key: "organization",
    name: "Organizations",
    description: "Invite your team and manage members together",
  },
]

export async function seedPlanFeatures(prisma: PrismaClient) {
  const rows: { key: string; action: "create" | "update" }[] = []
  for (const f of FEATURES) {
    const exists = await prisma.planFeature.findUnique({
      where: { key: f.key },
    })
    const action = exists ? ("update" as const) : ("create" as const)
    await prisma.planFeature.upsert({
      where: { key: f.key },
      update: { name: f.name, description: f.description },
      create: { key: f.key, name: f.name, description: f.description },
    })
    rows.push({ key: f.key, action })
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
  const prisma = new PrismaClient()
  seedPlanFeatures(prisma)
    .catch((e) => {
      console.error(e)
      process.exit(1)
    })
    .finally(async () => {
      await prisma.$disconnect()
    })
}

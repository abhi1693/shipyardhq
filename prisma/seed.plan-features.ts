import path from "node:path"
import { pathToFileURL } from "node:url"

import type { PrismaClient } from "@/lib/vendor/prisma/client"

const prismaPromise = import("@/lib/prisma").then(
  (module) => module.default as PrismaClient,
)

// Prod-safe, idempotent PlanFeature seeding
const FEATURES = [
  {
    key: "analytics.basic",
    name: "Basic Analytics",
    displayName: "Launch traffic pulse",
    description:
      "Shows recent views, visits, and launch activity for the product.",
  },
  {
    key: "backlink",
    name: "Direct Website Traffic",
    displayName: "Direct website link with click tracking",
    description:
      "Adds a direct sponsored website link and measures aggregate outbound clicks from the Shipyard product page.",
  },
  {
    key: "product.sitemap",
    name: "Product Sitemap Submission",
    displayName: "Indexed discovery page",
    description:
      "We submit your listing to Google and Bing for faster indexing.",
  },
  {
    key: "product.aiSearchReady",
    name: "AI Search Readiness",
    displayName: "AI-readable product profile",
    description:
      "Adds structured metadata, schema, sitemap inclusion, and crawler-readable product facts.",
  },
  {
    key: "analytics.advanced",
    name: "Advanced Analytics",
    displayName: "Traffic and audience insights",
    description:
      "Shows views, visits, browser, device, operating system, country, and AI crawler attention where available.",
  },
  {
    key: "featured",
    name: "Featured Badge",
    displayName: "Featured launch badge",
    description: "Product marked as featured",
  },
  {
    key: "priorityPlacement",
    name: "Priority Placement",
    displayName: "Higher placement while boost is active",
    description: "Listed higher in results",
  },
  {
    key: "sponsoredProducts",
    name: "Sponsored Placement",
    displayName: "Promoted in launch surfaces",
    description: "Reserve a sponsored slot across Shipyard",
  },
  {
    key: "partnerSpotlight",
    name: "Partner Spotlight",
    displayName: "Partner spotlight placement",
    description: "Partner spotlight visibility",
  },
  {
    key: "homepageLaunch",
    name: "Homepage Launch of the Day",
    displayName: "Homepage Launch of the Day slot",
    description: "Eligibility for the sponsored homepage launch slot",
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
      update: {
        name: f.name,
        displayName: f.displayName,
        description: f.description,
      },
      create: {
        key: f.key,
        name: f.name,
        displayName: f.displayName,
        description: f.description,
      },
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
  prismaPromise
    .then((prisma) => seedPlanFeatures(prisma))
    .catch((e) => {
      console.error(e)
      process.exit(1)
    })
    .finally(async () => {
      const prisma = await prismaPromise
      await prisma.$disconnect()
    })
}

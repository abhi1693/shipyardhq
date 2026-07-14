import prisma from "@/lib/prisma"
import { productPath } from "@/lib/routes"
import { queryCloudflareHttpGroups } from "@/lib/server/analytics/cloudflareAnalytics"
import { classifyTrafficComposition } from "@/lib/server/analytics/trafficComposition"
import {
  chunkArray,
  cloudflareGroupLimit,
  extractProductSlug,
  parseAnalyticsDate,
  type AnalyticsIngestionProgressReporter,
  type AnalyticsIngestionWindow,
} from "@/lib/server/analytics/ingestion/shared"

type ProductTrafficDailyRow = {
  productId: string
  date: Date
  source: "cloudflare"
  pageViews: number
  uniqueVisitors: number
  browserRequests: number
  browserVisits: number
  sessions: number
  bounceRate: number
  averageSessionDuration: number
  newUsers: number
  returningVisitors: number
  engagementRate: number
  pagesPerSession: number
  ingestionRunId?: string | null
}

export type ProductTrafficDailySyncResult = {
  rows: number
  stored: number
  pages: number
  truncated: boolean
}

export async function syncProductTrafficDaily(args: {
  window: AnalyticsIngestionWindow
  ingestionRunId?: string | null
  maxRows?: number
  onProgress?: AnalyticsIngestionProgressReporter
}): Promise<ProductTrafficDailySyncResult> {
  const products = await prisma.product.findMany({
    select: { id: true, slug: true },
  })
  args.onProgress?.(`Loaded ${products.length} products for product traffic`)
  const productIdBySlug = new Map(
    products.map((product) => [product.slug.toLowerCase(), product.id]),
  )
  if (productIdBySlug.size === 0) {
    args.onProgress?.("No products found; skipping product traffic daily")
    return { rows: 0, stored: 0, pages: 0, truncated: false }
  }

  const limit = cloudflareGroupLimit(args.maxRows)
  const queryBase = {
    dateRange: {
      startDate: args.window.startDate,
      endDate: args.window.endDate,
    },
    pagePaths: products.map((product) => productPath(product.slug)),
    limit,
  } as const
  const [groups, compositionGroups] = await Promise.all([
    queryCloudflareHttpGroups({
      ...queryBase,
      dimensions: ["date", "clientRequestPath"],
    }),
    queryCloudflareHttpGroups({
      ...queryBase,
      dimensions: [
        "date",
        "clientRequestPath",
        "verifiedBotCategory",
        "userAgentBrowser",
        "requestSource",
      ],
    }),
  ])
  args.onProgress?.(
    `Fetched product daily groups: ${groups.length} totals and ${compositionGroups.length} traffic composition groups`,
  )
  const recordsByKey = new Map<string, ProductTrafficDailyRow>()

  for (const group of groups) {
    const date = parseAnalyticsDate(group.dimensions?.date)
    const slug = extractProductSlug(group.dimensions?.clientRequestPath)
    const productId = slug ? productIdBySlug.get(slug) : null
    if (!date || !productId) continue

    const groupViews = Math.max(0, Math.round(Number(group.count) || 0))
    const groupVisits = Math.max(0, Math.round(Number(group.sum?.visits) || 0))
    const key = `${productId}:${date.toISOString().slice(0, 10)}`
    const current = recordsByKey.get(key)
    if (current) {
      current.pageViews += groupViews
      current.uniqueVisitors += groupVisits
      current.sessions += groupVisits
      current.pagesPerSession =
        current.sessions > 0 ? current.pageViews / current.sessions : 0
      continue
    }

    recordsByKey.set(key, {
      productId,
      date,
      source: "cloudflare",
      pageViews: groupViews,
      uniqueVisitors: groupVisits,
      browserRequests: 0,
      browserVisits: 0,
      sessions: groupVisits,
      bounceRate: 0,
      averageSessionDuration: 0,
      newUsers: 0,
      returningVisitors: 0,
      engagementRate: 0,
      pagesPerSession: groupVisits > 0 ? groupViews / groupVisits : 0,
      ingestionRunId: args.ingestionRunId ?? null,
    })
  }

  for (const group of compositionGroups) {
    const classification = classifyTrafficComposition({
      verifiedBotCategory: group.dimensions?.verifiedBotCategory,
      userAgentBrowser: group.dimensions?.userAgentBrowser,
      requestSource: group.dimensions?.requestSource,
    })
    if (classification.segment !== "browser") continue

    const date = parseAnalyticsDate(group.dimensions?.date)
    const slug = extractProductSlug(group.dimensions?.clientRequestPath)
    const productId = slug ? productIdBySlug.get(slug) : null
    if (!date || !productId) continue

    const record = recordsByKey.get(
      `${productId}:${date.toISOString().slice(0, 10)}`,
    )
    if (!record) continue

    record.browserRequests += Math.max(0, Math.round(Number(group.count) || 0))
    record.browserVisits += Math.max(
      0,
      Math.round(Number(group.sum?.visits) || 0),
    )
  }

  const records = Array.from(recordsByKey.values())
  args.onProgress?.(
    `Prepared ${records.length} product-day rows; replacing stored daily rows`,
  )

  await prisma.productTrafficDaily.deleteMany({
    where: {
      source: "cloudflare",
      date: { gte: args.window.start, lte: args.window.end },
    },
  })

  for (const batch of chunkArray(records, 500)) {
    await prisma.productTrafficDaily.createMany({ data: batch })
  }
  args.onProgress?.(`Stored ${records.length} product-day rows`)

  return {
    rows: groups.length + compositionGroups.length,
    stored: records.length,
    pages: 1,
    truncated: groups.length >= limit || compositionGroups.length >= limit,
  }
}

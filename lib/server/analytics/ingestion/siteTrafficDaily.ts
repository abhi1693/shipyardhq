import prisma from "@/lib/prisma"
import { queryCloudflareHttpGroups } from "@/lib/server/analytics/cloudflareAnalytics"
import {
  chunkArray,
  cloudflareGroupLimit,
  parseAnalyticsDate,
  type AnalyticsIngestionProgressReporter,
  type AnalyticsIngestionWindow,
} from "@/lib/server/analytics/ingestion/shared"

type SiteTrafficDailyRow = {
  date: Date
  source: "cloudflare"
  pageViews: number
  uniqueVisitors: number
  sessions: number
  bounceRate: number
  averageSessionDuration: number
  newUsers: number
  returningVisitors: number
  engagementRate: number
  pagesPerSession: number
  ingestionRunId?: string | null
}

export type SiteTrafficDailySyncResult = {
  rows: number
  stored: number
  pages: number
  truncated: boolean
}

export async function syncSiteTrafficDaily(args: {
  window: AnalyticsIngestionWindow
  ingestionRunId?: string | null
  maxRows?: number
  onProgress?: AnalyticsIngestionProgressReporter
}): Promise<SiteTrafficDailySyncResult> {
  const limit = cloudflareGroupLimit(args.maxRows)
  args.onProgress?.(
    `Requesting site daily totals for ${args.window.days} completed UTC days`,
  )
  const groups = await queryCloudflareHttpGroups({
    dateRange: {
      startDate: args.window.startDate,
      endDate: args.window.endDate,
    },
    dimensions: ["date"],
    limit,
  })
  args.onProgress?.(`Fetched ${groups.length} site daily groups`)
  const records: SiteTrafficDailyRow[] = groups.flatMap((group) => {
    const date = parseAnalyticsDate(group.dimensions?.date)
    if (!date) return []
    const groupViews = Math.max(0, Math.round(Number(group.count) || 0))
    const groupVisits = Math.max(0, Math.round(Number(group.sum?.visits) || 0))
    return [
      {
        date,
        source: "cloudflare",
        pageViews: groupViews,
        uniqueVisitors: groupVisits,
        sessions: groupVisits,
        bounceRate: 0,
        averageSessionDuration: 0,
        newUsers: 0,
        returningVisitors: 0,
        engagementRate: 0,
        pagesPerSession: groupVisits > 0 ? groupViews / groupVisits : 0,
        ingestionRunId: args.ingestionRunId ?? null,
      },
    ]
  })

  args.onProgress?.(
    `Prepared ${records.length} site daily rows; replacing stored daily rows`,
  )

  await prisma.siteTrafficDaily.deleteMany({
    where: {
      source: "cloudflare",
      date: { gte: args.window.start, lte: args.window.end },
    },
  })
  for (const batch of chunkArray(records, 500)) {
    await prisma.siteTrafficDaily.createMany({ data: batch })
  }
  args.onProgress?.(`Stored ${records.length} site daily rows`)

  return {
    rows: groups.length,
    stored: records.length,
    pages: 1,
    truncated: groups.length >= limit,
  }
}

import prisma from "@/lib/prisma"
import {
  buildProductPageFilter,
  chunkArray,
  extractProductSlug,
  fetchGaReportRows,
  normalizePercent,
  parseGaDate,
  parseMetricValue,
  type AnalyticsIngestionWindow,
} from "@/lib/server/analytics/ingestion/shared"

type ProductSlugMap = Map<string, string>

type ProductTrafficDailyRow = {
  productId: string
  date: Date
  source: "ga4"
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

type ProductTrafficAccumulator = {
  productId: string
  date: Date
  pageViews: number
  uniqueVisitors: number
  sessions: number
  newUsers: number
  engagedSessions: number
  bounceRateWeighted: number
  durationWeighted: number
  pagesPerSessionWeighted: number
}

export type ProductTrafficDailySyncResult = {
  rows: number
  stored: number
  pages: number
  truncated: boolean
}

async function loadProductSlugMap(): Promise<ProductSlugMap> {
  const rows = await prisma.product.findMany({
    select: { id: true, slug: true },
  })
  return rows.reduce<ProductSlugMap>((acc, row) => {
    acc.set(row.slug.toLowerCase(), row.id)
    return acc
  }, new Map())
}

export async function syncProductTrafficDaily(args: {
  window: AnalyticsIngestionWindow
  ingestionRunId?: string | null
  maxRows?: number
}): Promise<ProductTrafficDailySyncResult> {
  const slugMap = await loadProductSlugMap()
  if (slugMap.size === 0) {
    return { rows: 0, stored: 0, pages: 0, truncated: false }
  }

  const metrics = [
    { name: "screenPageViews" },
    { name: "activeUsers" },
    { name: "sessions" },
    { name: "bounceRate" },
    { name: "averageSessionDuration" },
    { name: "newUsers" },
    { name: "engagedSessions" },
    { name: "screenPageViewsPerSession" },
  ]

  const { rows, pages, truncated } = await fetchGaReportRows({
    request: {
      dateRanges: [
        { startDate: args.window.startDate, endDate: args.window.endDate },
      ],
      dimensions: [{ name: "date" }, { name: "pagePath" }],
      metrics,
      dimensionFilter: buildProductPageFilter(),
      orderBys: [{ dimension: { dimensionName: "date" } }],
    },
    maxRows: args.maxRows,
  })

  const aggregated = new Map<string, ProductTrafficAccumulator>()

  for (const row of rows) {
    const date = parseGaDate(row.dimensionValues?.[0]?.value)
    const path = row.dimensionValues?.[1]?.value
    if (!date || !path) continue

    const slug = extractProductSlug(path)
    if (!slug) continue
    const productId = slugMap.get(slug)
    if (!productId) continue

    const pageViews = parseMetricValue(row.metricValues?.[0]?.value)
    const uniqueVisitors = parseMetricValue(row.metricValues?.[1]?.value)
    const sessions = parseMetricValue(row.metricValues?.[2]?.value)
    const bounceRate = normalizePercent(
      parseMetricValue(row.metricValues?.[3]?.value),
    )
    const averageSessionDuration = parseMetricValue(
      row.metricValues?.[4]?.value,
    )
    const newUsers = parseMetricValue(row.metricValues?.[5]?.value)
    const engagedSessions = parseMetricValue(row.metricValues?.[6]?.value)
    const pagesPerSession = parseMetricValue(row.metricValues?.[7]?.value)

    const key = `${productId}:${date.toISOString().slice(0, 10)}`
    const current =
      aggregated.get(key) ??
      ({
        productId,
        date,
        pageViews: 0,
        uniqueVisitors: 0,
        sessions: 0,
        newUsers: 0,
        engagedSessions: 0,
        bounceRateWeighted: 0,
        durationWeighted: 0,
        pagesPerSessionWeighted: 0,
      } satisfies ProductTrafficAccumulator)

    current.pageViews += pageViews
    current.uniqueVisitors += uniqueVisitors
    current.sessions += sessions
    current.newUsers += newUsers
    current.engagedSessions += engagedSessions
    current.bounceRateWeighted += sessions > 0 ? bounceRate * sessions : 0
    current.durationWeighted += sessions > 0 ? averageSessionDuration * sessions : 0
    current.pagesPerSessionWeighted += sessions > 0 ? pagesPerSession * sessions : 0

    aggregated.set(key, current)
  }

  const records: ProductTrafficDailyRow[] = Array.from(aggregated.values()).map(
    (entry) => {
      const sessions = entry.sessions
      const bounceRate = sessions > 0 ? entry.bounceRateWeighted / sessions : 0
      const averageSessionDuration =
        sessions > 0 ? entry.durationWeighted / sessions : 0
      const pagesPerSession =
        sessions > 0 ? entry.pagesPerSessionWeighted / sessions : 0
      const engagementRate =
        sessions > 0 ? (entry.engagedSessions / sessions) * 100 : 0

      return {
        productId: entry.productId,
        date: entry.date,
        source: "ga4",
        pageViews: Math.round(entry.pageViews),
        uniqueVisitors: Math.round(entry.uniqueVisitors),
        sessions: Math.round(entry.sessions),
        bounceRate,
        averageSessionDuration,
        newUsers: Math.round(entry.newUsers),
        returningVisitors: Math.max(
          Math.round(entry.uniqueVisitors) - Math.round(entry.newUsers),
          0,
        ),
        engagementRate,
        pagesPerSession,
        ingestionRunId: args.ingestionRunId ?? null,
      }
    },
  )

  await prisma.productTrafficDaily.deleteMany({
    where: {
      source: "ga4",
      date: { gte: args.window.start, lte: args.window.end },
    },
  })

  if (!records.length) {
    return { rows: rows.length, stored: 0, pages, truncated }
  }

  const BATCH_SIZE = 500
  for (const batch of chunkArray(records, BATCH_SIZE)) {
    await prisma.productTrafficDaily.createMany({
      data: batch,
    })
  }

  return { rows: rows.length, stored: records.length, pages, truncated }
}

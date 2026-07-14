import { formatCountryName } from "@/lib/geo"
import prisma from "@/lib/prisma"
import {
  AI_VERIFIED_BOT_CATEGORIES,
  normalizeManagedLabels,
} from "@/lib/server/analytics/aiCrawlerAttention"
import { queryCloudflareHttpGroups } from "@/lib/server/analytics/cloudflareAnalytics"
import { parseUtcHour } from "@/lib/server/analytics/hourlyActivity"
import { classifyTrafficComposition } from "@/lib/server/analytics/trafficComposition"
import {
  chunkArray,
  cloudflareGroupLimit,
  normalizePath,
  parseAnalyticsDate,
  type AnalyticsIngestionWindow,
} from "@/lib/server/analytics/ingestion/shared"

type BreakdownResult = {
  name: string
  rows: number
  stored: number
  pages: number
  truncated: boolean
}

export type SiteTrafficBreakdownSyncResult = {
  breakdowns: BreakdownResult[]
}

function groupViews(group: { count: number }) {
  return Math.max(0, Math.round(Number(group.count) || 0))
}

async function insertBatches<T>(
  records: T[],
  createMany: (batch: T[]) => Promise<unknown>,
) {
  for (const batch of chunkArray(records, 500)) {
    await createMany(batch)
  }
}

export async function syncSiteTrafficBreakdowns(args: {
  window: AnalyticsIngestionWindow
  ingestionRunId?: string | null
  maxRows?: number
}): Promise<SiteTrafficBreakdownSyncResult> {
  const limit = cloudflareGroupLimit(args.maxRows)
  const baseQuery = {
    dateRange: {
      startDate: args.window.startDate,
      endDate: args.window.endDate,
    },
    limit,
  } as const
  const [
    browserGroups,
    osGroups,
    deviceGroups,
    countryGroups,
    hourlyGroups,
    compositionGroups,
    aiCrawlerStatusGroups,
    aiCrawlerEndpointGroups,
  ] = await Promise.all([
    queryCloudflareHttpGroups({
      ...baseQuery,
      dimensions: ["date", "userAgentBrowser"],
    }),
    queryCloudflareHttpGroups({
      ...baseQuery,
      dimensions: ["date", "userAgentOS"],
    }),
    queryCloudflareHttpGroups({
      ...baseQuery,
      dimensions: ["date", "clientDeviceType"],
    }),
    queryCloudflareHttpGroups({
      ...baseQuery,
      dimensions: ["date", "clientCountryName"],
    }),
    queryCloudflareHttpGroups({
      ...baseQuery,
      dimensions: ["datetimeHour"],
    }),
    queryCloudflareHttpGroups({
      ...baseQuery,
      dimensions: [
        "date",
        "verifiedBotCategory",
        "userAgentBrowser",
        "requestSource",
      ],
    }),
    queryCloudflareHttpGroups({
      ...baseQuery,
      dimensions: [
        "date",
        "verifiedBotCategory",
        "payPerCrawlStatus",
        "edgeResponseStatus",
      ],
      verifiedBotCategories: [...AI_VERIFIED_BOT_CATEGORIES],
    }),
    queryCloudflareHttpGroups({
      ...baseQuery,
      dimensions: [
        "date",
        "verifiedBotCategory",
        "clientRequestPath",
        "apiGatewayMatchedEndpoint",
        "webAssetsLabelsManaged",
      ],
      verifiedBotCategories: [...AI_VERIFIED_BOT_CATEGORIES],
    }),
  ])

  const source = "cloudflare" as const
  const ingestionRunId = args.ingestionRunId ?? null
  const browsers = browserGroups.flatMap((group) => {
    const date = parseAnalyticsDate(group.dimensions?.date)
    const visitors = groupViews(group)
    if (!date || visitors <= 0) return []
    return [
      {
        date,
        source,
        browser: group.dimensions?.userAgentBrowser?.trim() || "Unknown",
        visitors,
        ingestionRunId,
      },
    ]
  })
  const operatingSystems = osGroups.flatMap((group) => {
    const date = parseAnalyticsDate(group.dimensions?.date)
    const visitors = groupViews(group)
    if (!date || visitors <= 0) return []
    return [
      {
        date,
        source,
        operatingSystem: group.dimensions?.userAgentOS?.trim() || "Unknown",
        visitors,
        ingestionRunId,
      },
    ]
  })
  const devices = deviceGroups.flatMap((group) => {
    const date = parseAnalyticsDate(group.dimensions?.date)
    const visitors = groupViews(group)
    if (!date || visitors <= 0) return []
    return [
      {
        date,
        source,
        deviceCategory:
          group.dimensions?.clientDeviceType?.trim().toLowerCase() || "unknown",
        visitors,
        ingestionRunId,
      },
    ]
  })
  const countries = countryGroups.flatMap((group) => {
    const date = parseAnalyticsDate(group.dimensions?.date)
    const visitors = groupViews(group)
    if (!date || visitors <= 0) return []
    const countryCode = group.dimensions?.clientCountryName?.trim() || ""
    return [
      {
        date,
        source,
        country: formatCountryName(countryCode),
        countryCode,
        visitors,
        ingestionRunId,
      },
    ]
  })
  const hourlyActivity = hourlyGroups.flatMap((group) => {
    const timestamp = parseUtcHour(group.dimensions?.datetimeHour)
    const requests = groupViews(group)
    const visits = Math.max(0, Math.round(Number(group.sum?.visits) || 0))
    if (!timestamp || requests <= 0) return []
    return [
      {
        timestamp,
        source,
        requests,
        visits,
        ingestionRunId,
      },
    ]
  })
  const compositionByKey = new Map<
    string,
    {
      date: Date
      source: typeof source
      segment: string
      category: string
      requests: number
      ingestionRunId: string | null
    }
  >()
  for (const group of compositionGroups) {
    const date = parseAnalyticsDate(group.dimensions?.date)
    const requests = groupViews(group)
    if (!date || requests <= 0) continue

    const classification = classifyTrafficComposition({
      verifiedBotCategory: group.dimensions?.verifiedBotCategory,
      userAgentBrowser: group.dimensions?.userAgentBrowser,
      requestSource: group.dimensions?.requestSource,
    })
    const key = [
      date.toISOString(),
      classification.segment,
      classification.category,
    ].join(":")
    const current = compositionByKey.get(key)
    if (current) {
      current.requests += requests
      continue
    }

    compositionByKey.set(key, {
      date,
      source,
      segment: classification.segment,
      category: classification.category,
      requests,
      ingestionRunId,
    })
  }
  const composition = Array.from(compositionByKey.values())
  const aiCrawlerStatuses = aiCrawlerStatusGroups.flatMap((group) => {
    const date = parseAnalyticsDate(group.dimensions?.date)
    const category = group.dimensions?.verifiedBotCategory?.trim() || "Unknown"
    const requests = groupViews(group)
    if (!date || requests <= 0) return []
    return [
      {
        date,
        source,
        category,
        crawlStatus: group.dimensions?.payPerCrawlStatus?.trim() || "unknown",
        responseStatus: Math.max(
          0,
          Math.round(Number(group.dimensions?.edgeResponseStatus) || 0),
        ),
        requests,
        ingestionRunId,
      },
    ]
  })
  const aiCrawlerEndpointMap = new Map<
    string,
    {
      date: Date
      source: typeof source
      category: string
      endpoint: string
      matchedEndpoint: string
      managedLabels: Set<string>
      requests: number
      ingestionRunId: string | null
    }
  >()
  for (const group of aiCrawlerEndpointGroups) {
    const date = parseAnalyticsDate(group.dimensions?.date)
    const requests = groupViews(group)
    if (!date || requests <= 0) continue

    const category = group.dimensions?.verifiedBotCategory?.trim() || "Unknown"
    const endpoint = normalizePath(group.dimensions?.clientRequestPath)
    const matchedEndpoint =
      group.dimensions?.apiGatewayMatchedEndpoint?.trim() || ""
    const key = [date.toISOString(), category, endpoint, matchedEndpoint].join(
      ":",
    )
    const current = aiCrawlerEndpointMap.get(key) ?? {
      date,
      source,
      category,
      endpoint,
      matchedEndpoint,
      managedLabels: new Set<string>(),
      requests: 0,
      ingestionRunId,
    }
    current.requests += requests
    for (const label of normalizeManagedLabels(
      group.dimensions?.webAssetsLabelsManaged,
    )) {
      current.managedLabels.add(label)
    }
    aiCrawlerEndpointMap.set(key, current)
  }
  const aiCrawlerEndpoints = Array.from(aiCrawlerEndpointMap.values()).map(
    (record) => ({
      ...record,
      managedLabels: Array.from(record.managedLabels),
    }),
  )
  const hourlyWindowEnd = new Date(args.window.end)
  hourlyWindowEnd.setUTCDate(hourlyWindowEnd.getUTCDate() + 1)

  await prisma.$transaction([
    prisma.siteTrafficHourly.deleteMany({
      where: {
        source,
        timestamp: { gte: args.window.start, lt: hourlyWindowEnd },
      },
    }),
    prisma.siteTrafficCompositionDaily.deleteMany({
      where: { source, date: { gte: args.window.start, lte: args.window.end } },
    }),
    prisma.siteAiCrawlerStatusDaily.deleteMany({
      where: { source, date: { gte: args.window.start, lte: args.window.end } },
    }),
    prisma.siteAiCrawlerEndpointDaily.deleteMany({
      where: { source, date: { gte: args.window.start, lte: args.window.end } },
    }),
    prisma.siteTrafficBrowserDaily.deleteMany({
      where: { source, date: { gte: args.window.start, lte: args.window.end } },
    }),
    prisma.siteTrafficOperatingSystemDaily.deleteMany({
      where: { source, date: { gte: args.window.start, lte: args.window.end } },
    }),
    prisma.siteTrafficDeviceDaily.deleteMany({
      where: { source, date: { gte: args.window.start, lte: args.window.end } },
    }),
    prisma.siteTrafficCountryDaily.deleteMany({
      where: { source, date: { gte: args.window.start, lte: args.window.end } },
    }),
    prisma.siteTrafficRegionDaily.deleteMany({
      where: { source, date: { gte: args.window.start, lte: args.window.end } },
    }),
    prisma.siteTrafficCityDaily.deleteMany({
      where: { source, date: { gte: args.window.start, lte: args.window.end } },
    }),
  ])

  await insertBatches(browsers, (data) =>
    prisma.siteTrafficBrowserDaily.createMany({ data }),
  )
  await insertBatches(operatingSystems, (data) =>
    prisma.siteTrafficOperatingSystemDaily.createMany({ data }),
  )
  await insertBatches(devices, (data) =>
    prisma.siteTrafficDeviceDaily.createMany({ data }),
  )
  await insertBatches(countries, (data) =>
    prisma.siteTrafficCountryDaily.createMany({ data }),
  )
  await insertBatches(hourlyActivity, (data) =>
    prisma.siteTrafficHourly.createMany({ data }),
  )
  await insertBatches(composition, (data) =>
    prisma.siteTrafficCompositionDaily.createMany({ data }),
  )
  await insertBatches(aiCrawlerStatuses, (data) =>
    prisma.siteAiCrawlerStatusDaily.createMany({ data }),
  )
  await insertBatches(aiCrawlerEndpoints, (data) =>
    prisma.siteAiCrawlerEndpointDaily.createMany({ data }),
  )

  const result = (name: string, rows: number, stored: number) => ({
    name,
    rows,
    stored,
    pages: 1,
    truncated: rows >= limit,
  })
  return {
    breakdowns: [
      result("browsers", browserGroups.length, browsers.length),
      result("operatingSystems", osGroups.length, operatingSystems.length),
      result("devices", deviceGroups.length, devices.length),
      result("countries", countryGroups.length, countries.length),
      result("hourlyActivity", hourlyGroups.length, hourlyActivity.length),
      result(
        "trafficComposition",
        compositionGroups.length,
        composition.length,
      ),
      result(
        "aiCrawlerStatuses",
        aiCrawlerStatusGroups.length,
        aiCrawlerStatuses.length,
      ),
      result(
        "aiCrawlerEndpoints",
        aiCrawlerEndpointGroups.length,
        aiCrawlerEndpoints.length,
      ),
      result("regions", 0, 0),
      result("cities", 0, 0),
    ],
  }
}

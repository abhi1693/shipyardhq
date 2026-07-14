import { formatCountryName } from "@/lib/geo"
import prisma from "@/lib/prisma"
import {
  AI_VERIFIED_BOT_CATEGORIES,
  normalizeManagedLabels,
} from "@/lib/server/analytics/aiCrawlerAttention"
import {
  queryCloudflareHttpGroups,
  queryCloudflareHttpGroupsWithMetadata,
} from "@/lib/server/analytics/cloudflareAnalytics"
import { parseUtcHour } from "@/lib/server/analytics/hourlyActivity"
import { classifyTrafficComposition } from "@/lib/server/analytics/trafficComposition"
import {
  chunkArray,
  cloudflareGroupLimit,
  normalizePath,
  parseAnalyticsDate,
  type AnalyticsIngestionProgressReporter,
  type AnalyticsIngestionWindow,
} from "@/lib/server/analytics/ingestion/shared"

type BreakdownResult = {
  name: string
  rows: number
  stored: number
  pages: number
  queryWindows?: number
  truncated: boolean
}

export type SiteTrafficBreakdownSyncResult = {
  breakdowns: BreakdownResult[]
}

function groupViews(group: { count: number }) {
  return Math.max(0, Math.round(Number(group.count) || 0))
}

function formatProgressCount(value: number) {
  return Math.max(0, value).toLocaleString("en-US")
}

function formatWindowLabel(start: string, end: string) {
  return `${start.slice(0, 16).replace("T", " ")} to ${end
    .slice(0, 16)
    .replace("T", " ")} UTC`
}

async function insertBatches<T>(
  records: T[],
  createMany: (batch: T[]) => Promise<unknown>,
  options?: {
    label?: string
    onProgress?: AnalyticsIngestionProgressReporter
    progressEveryRows?: number
  },
) {
  const progressEveryRows = Math.max(1, options?.progressEveryRows ?? 5_000)
  const shouldReportBatches = Boolean(
    options?.onProgress && records.length >= progressEveryRows,
  )
  let stored = 0
  let nextProgressAt = progressEveryRows

  for (const batch of chunkArray(records, 500)) {
    await createMany(batch)
    stored += batch.length

    if (!shouldReportBatches) continue
    if (stored < nextProgressAt && stored < records.length) continue

    options?.onProgress?.(
      `Stored ${formatProgressCount(stored)}/${formatProgressCount(
        records.length,
      )} ${options.label ?? "rows"}`,
    )

    while (nextProgressAt <= stored) {
      nextProgressAt += progressEveryRows
    }
  }
}

export async function syncSiteTrafficBreakdowns(args: {
  window: AnalyticsIngestionWindow
  ingestionRunId?: string | null
  maxRows?: number
  onProgress?: AnalyticsIngestionProgressReporter
}): Promise<SiteTrafficBreakdownSyncResult> {
  const limit = cloudflareGroupLimit(args.maxRows)
  const baseQuery = {
    dateRange: {
      startDate: args.window.startDate,
      endDate: args.window.endDate,
    },
    limit,
  } as const
  const datasetCount = 8
  let completedDatasets = 0
  const trackDataset = async <T>(
    label: string,
    promise: Promise<T>,
    rowCount: (result: T) => number,
  ) => {
    const result = await promise
    completedDatasets += 1
    args.onProgress?.(
      `Fetched site ${label}: ${formatProgressCount(
        rowCount(result),
      )} groups (${completedDatasets}/${datasetCount} datasets)`,
    )
    return result
  }

  args.onProgress?.(
    `Requesting ${datasetCount} site breakdown datasets for ${args.window.days} completed UTC days`,
  )
  const [
    browserGroups,
    osGroups,
    deviceGroups,
    countryGroups,
    hourlyGroups,
    compositionGroups,
    aiCrawlerStatusGroups,
    aiCrawlerEndpointResult,
  ] = await Promise.all([
    trackDataset(
      "browsers",
      queryCloudflareHttpGroups({
        ...baseQuery,
        dimensions: ["date", "userAgentBrowser"],
      }),
      (result) => result.length,
    ),
    trackDataset(
      "operating systems",
      queryCloudflareHttpGroups({
        ...baseQuery,
        dimensions: ["date", "userAgentOS"],
      }),
      (result) => result.length,
    ),
    trackDataset(
      "devices",
      queryCloudflareHttpGroups({
        ...baseQuery,
        dimensions: ["date", "clientDeviceType"],
      }),
      (result) => result.length,
    ),
    trackDataset(
      "countries",
      queryCloudflareHttpGroups({
        ...baseQuery,
        dimensions: ["date", "clientCountryName"],
      }),
      (result) => result.length,
    ),
    trackDataset(
      "hourly activity",
      queryCloudflareHttpGroups({
        ...baseQuery,
        dimensions: ["datetimeHour"],
      }),
      (result) => result.length,
    ),
    trackDataset(
      "traffic composition",
      queryCloudflareHttpGroups({
        ...baseQuery,
        dimensions: [
          "date",
          "verifiedBotCategory",
          "userAgentBrowser",
          "requestSource",
        ],
      }),
      (result) => result.length,
    ),
    trackDataset(
      "AI crawler statuses",
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
      (result) => result.length,
    ),
    trackDataset(
      "AI crawler endpoints",
      queryCloudflareHttpGroupsWithMetadata({
        ...baseQuery,
        dimensions: [
          "date",
          "verifiedBotCategory",
          "clientRequestPath",
          "apiGatewayMatchedEndpoint",
          "webAssetsLabelsManaged",
        ],
        limitScope: "per-window",
        onWindowProgress: (event) => {
          const windowLabel = formatWindowLabel(
            event.windowStart,
            event.windowEnd,
          )
          if (event.action === "split") {
            args.onProgress?.(
              `AI crawler endpoint window ${windowLabel} hit ${formatProgressCount(
                event.groups,
              )}/${formatProgressCount(event.limit)} groups; splitting`,
            )
            return
          }

          args.onProgress?.(
            `AI crawler endpoint window ${windowLabel} fetched ${formatProgressCount(
              event.groups,
            )} groups (${event.windowsQueried} API requests so far)`,
          )
        },
        splitOnLimit: true,
        verifiedBotCategories: [...AI_VERIFIED_BOT_CATEGORIES],
      }),
      (result) => result.groups.length,
    ),
  ])
  const aiCrawlerEndpointGroups = aiCrawlerEndpointResult.groups

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

  args.onProgress?.(
    `Prepared site breakdown rows: ${formatProgressCount(
      browsers.length,
    )} browsers, ${formatProgressCount(
      operatingSystems.length,
    )} operating systems, ${formatProgressCount(
      devices.length,
    )} devices, ${formatProgressCount(
      countries.length,
    )} countries, ${formatProgressCount(
      hourlyActivity.length,
    )} hourly activity, ${formatProgressCount(
      composition.length,
    )} traffic composition, ${formatProgressCount(
      aiCrawlerStatuses.length,
    )} AI crawler statuses, ${formatProgressCount(
      aiCrawlerEndpoints.length,
    )} AI crawler endpoints; replacing stored breakdown rows`,
  )

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
  ])
  args.onProgress?.("Cleared existing site breakdown rows for this range")

  await insertBatches(browsers, (data) =>
    prisma.siteTrafficBrowserDaily.createMany({ data }),
  )
  args.onProgress?.(
    `Stored ${formatProgressCount(browsers.length)} browser rows`,
  )
  await insertBatches(operatingSystems, (data) =>
    prisma.siteTrafficOperatingSystemDaily.createMany({ data }),
  )
  args.onProgress?.(
    `Stored ${formatProgressCount(operatingSystems.length)} operating system rows`,
  )
  await insertBatches(devices, (data) =>
    prisma.siteTrafficDeviceDaily.createMany({ data }),
  )
  args.onProgress?.(`Stored ${formatProgressCount(devices.length)} device rows`)
  await insertBatches(countries, (data) =>
    prisma.siteTrafficCountryDaily.createMany({ data }),
  )
  args.onProgress?.(
    `Stored ${formatProgressCount(countries.length)} country rows`,
  )
  await insertBatches(hourlyActivity, (data) =>
    prisma.siteTrafficHourly.createMany({ data }),
  )
  args.onProgress?.(
    `Stored ${formatProgressCount(hourlyActivity.length)} hourly activity rows`,
  )
  await insertBatches(composition, (data) =>
    prisma.siteTrafficCompositionDaily.createMany({ data }),
  )
  args.onProgress?.(
    `Stored ${formatProgressCount(composition.length)} traffic composition rows`,
  )
  await insertBatches(aiCrawlerStatuses, (data) =>
    prisma.siteAiCrawlerStatusDaily.createMany({ data }),
  )
  args.onProgress?.(
    `Stored ${formatProgressCount(aiCrawlerStatuses.length)} AI crawler status rows`,
  )
  await insertBatches(
    aiCrawlerEndpoints,
    (data) => prisma.siteAiCrawlerEndpointDaily.createMany({ data }),
    {
      label: "AI crawler endpoint rows",
      onProgress: args.onProgress,
    },
  )
  args.onProgress?.(
    `Stored ${formatProgressCount(aiCrawlerEndpoints.length)} AI crawler endpoint rows`,
  )

  const result = (
    name: string,
    rows: number,
    stored: number,
    truncated = rows >= limit,
    queryWindows?: number,
  ) => ({
    name,
    rows,
    stored,
    pages: 1,
    ...(queryWindows === undefined ? {} : { queryWindows }),
    truncated,
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
        aiCrawlerEndpointResult.truncated,
        aiCrawlerEndpointResult.windowsQueried,
      ),
    ],
  }
}

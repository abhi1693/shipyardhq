import prisma from "@/lib/prisma"
import {
  buildProductPageFilter,
  chunkArray,
  extractProductSlug,
  fetchGaReportRows,
  normalizeReferrerDomain,
  parseGaDate,
  parseMetricValue,
  type AnalyticsIngestionWindow,
} from "@/lib/server/analytics/ingestion/shared"

type ProductSlugMap = Map<string, string>

type NumericKeys<T> = {
  [K in keyof T]: T[K] extends number ? K : never
}[keyof T]

type BreakdownResult = {
  name: string
  rows: number
  stored: number
  pages: number
  truncated: boolean
}

export type ProductTrafficBreakdownSyncResult = {
  breakdowns: BreakdownResult[]
}

type BreakdownCollectorInput<T extends Record<string, any>> = {
  name: string
  window: AnalyticsIngestionWindow
  slugMap: ProductSlugMap
  dimensions: string[]
  metricName: string
  maxRows?: number
  ingestionRunId?: string | null
  buildRecord: (args: {
    productId: string
    date: Date
    dimensionValues: string[]
    metricValue: number
    ingestionRunId?: string | null
  }) => T | null
  recordKey: (record: T) => string
  metricField: NumericKeys<T>
  replaceRecords: (records: T[]) => Promise<void>
}

async function loadProductSlugMap(): Promise<ProductSlugMap> {
  const rows = await prisma.product.findMany({
    select: { id: true, slug: true },
  })
  const slugMap: ProductSlugMap = new Map()
  for (const row of rows) {
    slugMap.set(row.slug.toLowerCase(), row.id)
  }
  return slugMap
}

async function collectBreakdownRecords<T extends Record<string, any>>(
  input: BreakdownCollectorInput<T>,
): Promise<BreakdownResult> {
  const { rows, pages, truncated } = await fetchGaReportRows({
    request: {
      dateRanges: [
        { startDate: input.window.startDate, endDate: input.window.endDate },
      ],
      dimensions: input.dimensions.map((name) => ({ name })),
      metrics: [{ name: input.metricName }],
      dimensionFilter: buildProductPageFilter(),
      orderBys: [
        {
          metric: { metricName: input.metricName },
          desc: true,
        },
      ],
    },
    maxRows: input.maxRows,
  })

  const aggregated = new Map<string, T>()

  for (const row of rows) {
    const date = parseGaDate(row.dimensionValues?.[0]?.value)
    const path = row.dimensionValues?.[1]?.value
    if (!date || !path) continue

    const slug = extractProductSlug(path)
    if (!slug) continue
    const productId = input.slugMap.get(slug)
    if (!productId) continue

    const metricValue = Math.round(
      parseMetricValue(row.metricValues?.[0]?.value),
    )
    if (metricValue <= 0) continue

    const dimensionValues = (row.dimensionValues ?? [])
      .slice(2)
      .map((entry) => entry?.value ?? "")

    const record = input.buildRecord({
      productId,
      date,
      dimensionValues,
      metricValue,
      ingestionRunId: input.ingestionRunId ?? null,
    })
    if (!record) continue

    const key = input.recordKey(record)
    const current = aggregated.get(key)
    if (!current) {
      aggregated.set(key, record)
      continue
    }

    const metricField = input.metricField as string
    const currentValue = Number(
      (current as Record<string, number>)[metricField] ?? 0,
    )
    ;(current as Record<string, number>)[metricField] =
      currentValue + metricValue
    aggregated.set(key, current)
  }

  const records = Array.from(aggregated.values())
  await input.replaceRecords(records)

  return {
    name: input.name,
    rows: rows.length,
    stored: records.length,
    pages,
    truncated,
  }
}

async function replaceProductTrafficReferrers(
  records: Array<{
    productId: string
    date: Date
    source: "ga4"
    referrer: string
    pageViews: number
    ingestionRunId?: string | null
  }>,
  window: AnalyticsIngestionWindow,
) {
  await prisma.productTrafficReferrerDaily.deleteMany({
    where: {
      source: "ga4",
      date: { gte: window.start, lte: window.end },
    },
  })

  if (!records.length) return
  const BATCH_SIZE = 500
  for (const batch of chunkArray(records, BATCH_SIZE)) {
    await prisma.productTrafficReferrerDaily.createMany({ data: batch })
  }
}

async function replaceProductTrafficChannels(
  records: Array<{
    productId: string
    date: Date
    source: "ga4"
    channel: string
    pageViews: number
    ingestionRunId?: string | null
  }>,
  window: AnalyticsIngestionWindow,
) {
  await prisma.productTrafficChannelDaily.deleteMany({
    where: {
      source: "ga4",
      date: { gte: window.start, lte: window.end },
    },
  })

  if (!records.length) return
  const BATCH_SIZE = 500
  for (const batch of chunkArray(records, BATCH_SIZE)) {
    await prisma.productTrafficChannelDaily.createMany({ data: batch })
  }
}

async function replaceProductTrafficBrowsers(
  records: Array<{
    productId: string
    date: Date
    source: "ga4"
    browser: string
    visitors: number
    ingestionRunId?: string | null
  }>,
  window: AnalyticsIngestionWindow,
) {
  await prisma.productTrafficBrowserDaily.deleteMany({
    where: {
      source: "ga4",
      date: { gte: window.start, lte: window.end },
    },
  })

  if (!records.length) return
  const BATCH_SIZE = 500
  for (const batch of chunkArray(records, BATCH_SIZE)) {
    await prisma.productTrafficBrowserDaily.createMany({ data: batch })
  }
}

async function replaceProductTrafficOperatingSystems(
  records: Array<{
    productId: string
    date: Date
    source: "ga4"
    operatingSystem: string
    visitors: number
    ingestionRunId?: string | null
  }>,
  window: AnalyticsIngestionWindow,
) {
  await prisma.productTrafficOperatingSystemDaily.deleteMany({
    where: {
      source: "ga4",
      date: { gte: window.start, lte: window.end },
    },
  })

  if (!records.length) return
  const BATCH_SIZE = 500
  for (const batch of chunkArray(records, BATCH_SIZE)) {
    await prisma.productTrafficOperatingSystemDaily.createMany({ data: batch })
  }
}

async function replaceProductTrafficDevices(
  records: Array<{
    productId: string
    date: Date
    source: "ga4"
    deviceCategory: string
    visitors: number
    ingestionRunId?: string | null
  }>,
  window: AnalyticsIngestionWindow,
) {
  await prisma.productTrafficDeviceDaily.deleteMany({
    where: {
      source: "ga4",
      date: { gte: window.start, lte: window.end },
    },
  })

  if (!records.length) return
  const BATCH_SIZE = 500
  for (const batch of chunkArray(records, BATCH_SIZE)) {
    await prisma.productTrafficDeviceDaily.createMany({ data: batch })
  }
}

async function replaceProductTrafficCountries(
  records: Array<{
    productId: string
    date: Date
    source: "ga4"
    country: string
    countryCode: string
    visitors: number
    ingestionRunId?: string | null
  }>,
  window: AnalyticsIngestionWindow,
) {
  await prisma.productTrafficCountryDaily.deleteMany({
    where: {
      source: "ga4",
      date: { gte: window.start, lte: window.end },
    },
  })

  if (!records.length) return
  const BATCH_SIZE = 500
  for (const batch of chunkArray(records, BATCH_SIZE)) {
    await prisma.productTrafficCountryDaily.createMany({ data: batch })
  }
}

async function replaceProductTrafficCities(
  records: Array<{
    productId: string
    date: Date
    source: "ga4"
    city: string
    region: string
    country: string
    countryCode: string
    visitors: number
    ingestionRunId?: string | null
  }>,
  window: AnalyticsIngestionWindow,
) {
  await prisma.productTrafficCityDaily.deleteMany({
    where: {
      source: "ga4",
      date: { gte: window.start, lte: window.end },
    },
  })

  if (!records.length) return
  const BATCH_SIZE = 500
  for (const batch of chunkArray(records, BATCH_SIZE)) {
    await prisma.productTrafficCityDaily.createMany({ data: batch })
  }
}

export async function syncProductTrafficBreakdowns(args: {
  window: AnalyticsIngestionWindow
  ingestionRunId?: string | null
  maxRows?: number
}): Promise<ProductTrafficBreakdownSyncResult> {
  const slugMap = await loadProductSlugMap()
  if (slugMap.size === 0) {
    return { breakdowns: [] }
  }

  const breakdowns: BreakdownResult[] = []
  const source = "ga4" as const

  breakdowns.push(
    await collectBreakdownRecords({
      name: "referrers",
      window: args.window,
      slugMap,
      dimensions: ["date", "pagePath", "pageReferrer"],
      metricName: "screenPageViews",
      maxRows: args.maxRows,
      ingestionRunId: args.ingestionRunId ?? null,
      metricField: "pageViews",
      buildRecord: ({
        productId,
        date,
        dimensionValues,
        metricValue,
        ingestionRunId,
      }) => {
        const referrer = normalizeReferrerDomain(dimensionValues[0])
        return {
          productId,
          date,
          source,
          referrer,
          pageViews: Math.round(metricValue),
          ingestionRunId,
        }
      },
      recordKey: (record) =>
        `${record.productId}:${record.date.toISOString().slice(0, 10)}:${record.referrer}`,
      replaceRecords: async (records) =>
        replaceProductTrafficReferrers(records, args.window),
    }),
  )

  breakdowns.push(
    await collectBreakdownRecords({
      name: "channels",
      window: args.window,
      slugMap,
      dimensions: ["date", "pagePath", "sessionDefaultChannelGrouping"],
      metricName: "screenPageViews",
      maxRows: args.maxRows,
      ingestionRunId: args.ingestionRunId ?? null,
      metricField: "pageViews",
      buildRecord: ({
        productId,
        date,
        dimensionValues,
        metricValue,
        ingestionRunId,
      }) => {
        const channel = dimensionValues[0]?.trim() || "Other"
        return {
          productId,
          date,
          source,
          channel,
          pageViews: Math.round(metricValue),
          ingestionRunId,
        }
      },
      recordKey: (record) =>
        `${record.productId}:${record.date.toISOString().slice(0, 10)}:${record.channel}`,
      replaceRecords: async (records) =>
        replaceProductTrafficChannels(records, args.window),
    }),
  )

  breakdowns.push(
    await collectBreakdownRecords({
      name: "browsers",
      window: args.window,
      slugMap,
      dimensions: ["date", "pagePath", "browser"],
      metricName: "activeUsers",
      maxRows: args.maxRows,
      ingestionRunId: args.ingestionRunId ?? null,
      metricField: "visitors",
      buildRecord: ({
        productId,
        date,
        dimensionValues,
        metricValue,
        ingestionRunId,
      }) => {
        const browser = dimensionValues[0]?.trim() || "Unknown"
        return {
          productId,
          date,
          source,
          browser,
          visitors: Math.round(metricValue),
          ingestionRunId,
        }
      },
      recordKey: (record) =>
        `${record.productId}:${record.date.toISOString().slice(0, 10)}:${record.browser}`,
      replaceRecords: async (records) =>
        replaceProductTrafficBrowsers(records, args.window),
    }),
  )

  breakdowns.push(
    await collectBreakdownRecords({
      name: "operating-systems",
      window: args.window,
      slugMap,
      dimensions: ["date", "pagePath", "operatingSystem"],
      metricName: "activeUsers",
      maxRows: args.maxRows,
      ingestionRunId: args.ingestionRunId ?? null,
      metricField: "visitors",
      buildRecord: ({
        productId,
        date,
        dimensionValues,
        metricValue,
        ingestionRunId,
      }) => {
        const operatingSystem = dimensionValues[0]?.trim() || "Unknown"
        return {
          productId,
          date,
          source,
          operatingSystem,
          visitors: Math.round(metricValue),
          ingestionRunId,
        }
      },
      recordKey: (record) =>
        `${record.productId}:${record.date.toISOString().slice(0, 10)}:${record.operatingSystem}`,
      replaceRecords: async (records) =>
        replaceProductTrafficOperatingSystems(records, args.window),
    }),
  )

  breakdowns.push(
    await collectBreakdownRecords({
      name: "devices",
      window: args.window,
      slugMap,
      dimensions: ["date", "pagePath", "deviceCategory"],
      metricName: "activeUsers",
      maxRows: args.maxRows,
      ingestionRunId: args.ingestionRunId ?? null,
      metricField: "visitors",
      buildRecord: ({
        productId,
        date,
        dimensionValues,
        metricValue,
        ingestionRunId,
      }) => {
        const deviceCategory =
          dimensionValues[0]?.trim().toLowerCase() || "unknown"
        return {
          productId,
          date,
          source,
          deviceCategory,
          visitors: Math.round(metricValue),
          ingestionRunId,
        }
      },
      recordKey: (record) =>
        `${record.productId}:${record.date.toISOString().slice(0, 10)}:${record.deviceCategory}`,
      replaceRecords: async (records) =>
        replaceProductTrafficDevices(records, args.window),
    }),
  )

  breakdowns.push(
    await collectBreakdownRecords({
      name: "countries",
      window: args.window,
      slugMap,
      dimensions: ["date", "pagePath", "country", "countryId"],
      metricName: "activeUsers",
      maxRows: args.maxRows,
      ingestionRunId: args.ingestionRunId ?? null,
      metricField: "visitors",
      buildRecord: ({
        productId,
        date,
        dimensionValues,
        metricValue,
        ingestionRunId,
      }) => {
        const country = dimensionValues[0]?.trim() || "Unknown"
        const countryCode = dimensionValues[1]?.trim() || ""
        return {
          productId,
          date,
          source,
          country,
          countryCode,
          visitors: Math.round(metricValue),
          ingestionRunId,
        }
      },
      recordKey: (record) =>
        `${record.productId}:${record.date.toISOString().slice(0, 10)}:${record.country}:${record.countryCode}`,
      replaceRecords: async (records) =>
        replaceProductTrafficCountries(records, args.window),
    }),
  )

  breakdowns.push(
    await collectBreakdownRecords({
      name: "cities",
      window: args.window,
      slugMap,
      dimensions: [
        "date",
        "pagePath",
        "city",
        "region",
        "country",
        "countryId",
      ],
      metricName: "activeUsers",
      maxRows: args.maxRows,
      ingestionRunId: args.ingestionRunId ?? null,
      metricField: "visitors",
      buildRecord: ({
        productId,
        date,
        dimensionValues,
        metricValue,
        ingestionRunId,
      }) => {
        const city = dimensionValues[0]?.trim() || "Unknown"
        const region = dimensionValues[1]?.trim() || "Unknown"
        const country = dimensionValues[2]?.trim() || "Unknown"
        const countryCode = dimensionValues[3]?.trim() || ""
        return {
          productId,
          date,
          source,
          city,
          region,
          country,
          countryCode,
          visitors: Math.round(metricValue),
          ingestionRunId,
        }
      },
      recordKey: (record) =>
        `${record.productId}:${record.date.toISOString().slice(0, 10)}:${record.city}:${record.region}:${record.country}:${record.countryCode}`,
      replaceRecords: async (records) =>
        replaceProductTrafficCities(records, args.window),
    }),
  )

  return { breakdowns }
}

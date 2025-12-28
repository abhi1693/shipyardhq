import prisma from "@/lib/prisma"
import {
  chunkArray,
  fetchGaReportRows,
  parseGaDate,
  parseMetricValue,
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

type BreakdownCollectorInput<T extends Record<string, any>> = {
  name: string
  window: AnalyticsIngestionWindow
  dimensions: string[]
  metricName: string
  maxRows?: number
  ingestionRunId?: string | null
  buildRecord: (args: {
    date: Date
    dimensionValues: string[]
    metricValue: number
    ingestionRunId?: string | null
  }) => T | null
  recordKey: (record: T) => string
  metricField: keyof T
  replaceRecords: (records: T[]) => Promise<void>
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
    if (!date) continue

    const metricValue = Math.round(
      parseMetricValue(row.metricValues?.[0]?.value),
    )
    if (metricValue <= 0) continue

    const dimensionValues = (row.dimensionValues ?? [])
      .slice(1)
      .map((entry) => entry?.value ?? "")

    const record = input.buildRecord({
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

    const currentValue = Number(current[input.metricField] ?? 0)
    current[input.metricField] = currentValue + metricValue
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

async function replaceSiteTrafficReferrers(
  records: Array<{
    date: Date
    source: "ga4"
    referrer: string
    pageViews: number
    ingestionRunId?: string | null
  }>,
  window: AnalyticsIngestionWindow,
) {
  await prisma.siteTrafficReferrerDaily.deleteMany({
    where: {
      source: "ga4",
      date: { gte: window.start, lte: window.end },
    },
  })

  if (!records.length) return
  const BATCH_SIZE = 500
  for (const batch of chunkArray(records, BATCH_SIZE)) {
    await prisma.siteTrafficReferrerDaily.createMany({ data: batch })
  }
}

async function replaceSiteTrafficBrowsers(
  records: Array<{
    date: Date
    source: "ga4"
    browser: string
    visitors: number
    ingestionRunId?: string | null
  }>,
  window: AnalyticsIngestionWindow,
) {
  await prisma.siteTrafficBrowserDaily.deleteMany({
    where: {
      source: "ga4",
      date: { gte: window.start, lte: window.end },
    },
  })

  if (!records.length) return
  const BATCH_SIZE = 500
  for (const batch of chunkArray(records, BATCH_SIZE)) {
    await prisma.siteTrafficBrowserDaily.createMany({ data: batch })
  }
}

async function replaceSiteTrafficOperatingSystems(
  records: Array<{
    date: Date
    source: "ga4"
    operatingSystem: string
    visitors: number
    ingestionRunId?: string | null
  }>,
  window: AnalyticsIngestionWindow,
) {
  await prisma.siteTrafficOperatingSystemDaily.deleteMany({
    where: {
      source: "ga4",
      date: { gte: window.start, lte: window.end },
    },
  })

  if (!records.length) return
  const BATCH_SIZE = 500
  for (const batch of chunkArray(records, BATCH_SIZE)) {
    await prisma.siteTrafficOperatingSystemDaily.createMany({ data: batch })
  }
}

async function replaceSiteTrafficDevices(
  records: Array<{
    date: Date
    source: "ga4"
    deviceCategory: string
    visitors: number
    ingestionRunId?: string | null
  }>,
  window: AnalyticsIngestionWindow,
) {
  await prisma.siteTrafficDeviceDaily.deleteMany({
    where: {
      source: "ga4",
      date: { gte: window.start, lte: window.end },
    },
  })

  if (!records.length) return
  const BATCH_SIZE = 500
  for (const batch of chunkArray(records, BATCH_SIZE)) {
    await prisma.siteTrafficDeviceDaily.createMany({ data: batch })
  }
}

async function replaceSiteTrafficCountries(
  records: Array<{
    date: Date
    source: "ga4"
    country: string
    countryCode: string
    visitors: number
    ingestionRunId?: string | null
  }>,
  window: AnalyticsIngestionWindow,
) {
  await prisma.siteTrafficCountryDaily.deleteMany({
    where: {
      source: "ga4",
      date: { gte: window.start, lte: window.end },
    },
  })

  if (!records.length) return
  const BATCH_SIZE = 500
  for (const batch of chunkArray(records, BATCH_SIZE)) {
    await prisma.siteTrafficCountryDaily.createMany({ data: batch })
  }
}

async function replaceSiteTrafficRegions(
  records: Array<{
    date: Date
    source: "ga4"
    region: string
    country: string
    countryCode: string
    visitors: number
    ingestionRunId?: string | null
  }>,
  window: AnalyticsIngestionWindow,
) {
  await prisma.siteTrafficRegionDaily.deleteMany({
    where: {
      source: "ga4",
      date: { gte: window.start, lte: window.end },
    },
  })

  if (!records.length) return
  const BATCH_SIZE = 500
  for (const batch of chunkArray(records, BATCH_SIZE)) {
    await prisma.siteTrafficRegionDaily.createMany({ data: batch })
  }
}

async function replaceSiteTrafficCities(
  records: Array<{
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
  await prisma.siteTrafficCityDaily.deleteMany({
    where: {
      source: "ga4",
      date: { gte: window.start, lte: window.end },
    },
  })

  if (!records.length) return
  const BATCH_SIZE = 500
  for (const batch of chunkArray(records, BATCH_SIZE)) {
    await prisma.siteTrafficCityDaily.createMany({ data: batch })
  }
}

export async function syncSiteTrafficBreakdowns(args: {
  window: AnalyticsIngestionWindow
  ingestionRunId?: string | null
  maxRows?: number
}): Promise<SiteTrafficBreakdownSyncResult> {
  const breakdowns: BreakdownResult[] = []

  breakdowns.push(
    await collectBreakdownRecords({
      name: "referrers",
      window: args.window,
      dimensions: ["date", "sessionSource"],
      metricName: "screenPageViews",
      maxRows: args.maxRows,
      ingestionRunId: args.ingestionRunId ?? null,
      metricField: "pageViews",
      buildRecord: ({ date, dimensionValues, metricValue, ingestionRunId }) => {
        const rawLabel = dimensionValues[0]?.trim()
        const normalizedLabel =
          rawLabel === "(direct)" ? "Direct / none" : rawLabel
        const referrer =
          normalizedLabel && normalizedLabel.length > 0
            ? normalizedLabel
            : "Direct / none"
        return {
          date,
          source: "ga4",
          referrer,
          pageViews: Math.round(metricValue),
          ingestionRunId,
        }
      },
      recordKey: (record) =>
        `${record.date.toISOString().slice(0, 10)}:${record.referrer}`,
      replaceRecords: async (records) =>
        replaceSiteTrafficReferrers(records, args.window),
    }),
  )

  breakdowns.push(
    await collectBreakdownRecords({
      name: "browsers",
      window: args.window,
      dimensions: ["date", "browser"],
      metricName: "activeUsers",
      maxRows: args.maxRows,
      ingestionRunId: args.ingestionRunId ?? null,
      metricField: "visitors",
      buildRecord: ({ date, dimensionValues, metricValue, ingestionRunId }) => {
        const browser = dimensionValues[0]?.trim() || "Unknown"
        return {
          date,
          source: "ga4",
          browser,
          visitors: Math.round(metricValue),
          ingestionRunId,
        }
      },
      recordKey: (record) =>
        `${record.date.toISOString().slice(0, 10)}:${record.browser}`,
      replaceRecords: async (records) =>
        replaceSiteTrafficBrowsers(records, args.window),
    }),
  )

  breakdowns.push(
    await collectBreakdownRecords({
      name: "operating-systems",
      window: args.window,
      dimensions: ["date", "operatingSystem"],
      metricName: "activeUsers",
      maxRows: args.maxRows,
      ingestionRunId: args.ingestionRunId ?? null,
      metricField: "visitors",
      buildRecord: ({ date, dimensionValues, metricValue, ingestionRunId }) => {
        const operatingSystem = dimensionValues[0]?.trim() || "Unknown"
        return {
          date,
          source: "ga4",
          operatingSystem,
          visitors: Math.round(metricValue),
          ingestionRunId,
        }
      },
      recordKey: (record) =>
        `${record.date.toISOString().slice(0, 10)}:${record.operatingSystem}`,
      replaceRecords: async (records) =>
        replaceSiteTrafficOperatingSystems(records, args.window),
    }),
  )

  breakdowns.push(
    await collectBreakdownRecords({
      name: "devices",
      window: args.window,
      dimensions: ["date", "deviceCategory"],
      metricName: "activeUsers",
      maxRows: args.maxRows,
      ingestionRunId: args.ingestionRunId ?? null,
      metricField: "visitors",
      buildRecord: ({ date, dimensionValues, metricValue, ingestionRunId }) => {
        const deviceCategory =
          dimensionValues[0]?.trim().toLowerCase() || "unknown"
        return {
          date,
          source: "ga4",
          deviceCategory,
          visitors: Math.round(metricValue),
          ingestionRunId,
        }
      },
      recordKey: (record) =>
        `${record.date.toISOString().slice(0, 10)}:${record.deviceCategory}`,
      replaceRecords: async (records) =>
        replaceSiteTrafficDevices(records, args.window),
    }),
  )

  breakdowns.push(
    await collectBreakdownRecords({
      name: "countries",
      window: args.window,
      dimensions: ["date", "country", "countryId"],
      metricName: "activeUsers",
      maxRows: args.maxRows,
      ingestionRunId: args.ingestionRunId ?? null,
      metricField: "visitors",
      buildRecord: ({ date, dimensionValues, metricValue, ingestionRunId }) => {
        const country = dimensionValues[0]?.trim() || "Unknown"
        const countryCode = dimensionValues[1]?.trim() || ""
        return {
          date,
          source: "ga4",
          country,
          countryCode,
          visitors: Math.round(metricValue),
          ingestionRunId,
        }
      },
      recordKey: (record) =>
        `${record.date.toISOString().slice(0, 10)}:${record.country}:${record.countryCode}`,
      replaceRecords: async (records) =>
        replaceSiteTrafficCountries(records, args.window),
    }),
  )

  breakdowns.push(
    await collectBreakdownRecords({
      name: "regions",
      window: args.window,
      dimensions: ["date", "region", "country", "countryId"],
      metricName: "activeUsers",
      maxRows: args.maxRows,
      ingestionRunId: args.ingestionRunId ?? null,
      metricField: "visitors",
      buildRecord: ({ date, dimensionValues, metricValue, ingestionRunId }) => {
        const region = dimensionValues[0]?.trim() || "Unknown"
        const country = dimensionValues[1]?.trim() || "Unknown"
        const countryCode = dimensionValues[2]?.trim() || ""
        return {
          date,
          source: "ga4",
          region,
          country,
          countryCode,
          visitors: Math.round(metricValue),
          ingestionRunId,
        }
      },
      recordKey: (record) =>
        `${record.date.toISOString().slice(0, 10)}:${record.region}:${record.country}:${record.countryCode}`,
      replaceRecords: async (records) =>
        replaceSiteTrafficRegions(records, args.window),
    }),
  )

  breakdowns.push(
    await collectBreakdownRecords({
      name: "cities",
      window: args.window,
      dimensions: ["date", "city", "region", "country", "countryId"],
      metricName: "activeUsers",
      maxRows: args.maxRows,
      ingestionRunId: args.ingestionRunId ?? null,
      metricField: "visitors",
      buildRecord: ({ date, dimensionValues, metricValue, ingestionRunId }) => {
        const city = dimensionValues[0]?.trim() || "Unknown"
        const region = dimensionValues[1]?.trim() || "Unknown"
        const country = dimensionValues[2]?.trim() || "Unknown"
        const countryCode = dimensionValues[3]?.trim() || ""
        return {
          date,
          source: "ga4",
          city,
          region,
          country,
          countryCode,
          visitors: Math.round(metricValue),
          ingestionRunId,
        }
      },
      recordKey: (record) =>
        `${record.date.toISOString().slice(0, 10)}:${record.city}:${record.region}:${record.country}:${record.countryCode}`,
      replaceRecords: async (records) =>
        replaceSiteTrafficCities(records, args.window),
    }),
  )

  return { breakdowns }
}

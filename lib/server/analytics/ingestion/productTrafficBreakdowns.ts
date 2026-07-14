import { formatCountryName } from "@/lib/geo"
import prisma from "@/lib/prisma"
import { productPath } from "@/lib/routes"
import { queryCloudflareHttpGroups } from "@/lib/server/analytics/cloudflareAnalytics"
import type { Prisma } from "@/lib/vendor/prisma/client"
import {
  chunkArray,
  cloudflareGroupLimit,
  extractProductSlug,
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

export type ProductTrafficBreakdownSyncResult = {
  breakdowns: BreakdownResult[]
}

function groupViews(group: { count: number }) {
  return Math.max(0, Math.round(Number(group.count) || 0))
}

function accumulate<T extends object, K extends keyof T>(
  records: Map<string, T>,
  key: string,
  record: T,
  metric: K,
) {
  const current = records.get(key)
  if (!current) {
    records.set(key, record)
    return
  }
  records.set(key, {
    ...current,
    [metric]: Number(current[metric]) + Number(record[metric]),
  })
}

async function insertBatches<T>(
  records: T[],
  createMany: (batch: T[]) => Promise<unknown>,
) {
  for (const batch of chunkArray(records, 500)) {
    await createMany(batch)
  }
}

export async function syncProductTrafficBreakdowns(args: {
  window: AnalyticsIngestionWindow
  ingestionRunId?: string | null
  maxRows?: number
}): Promise<ProductTrafficBreakdownSyncResult> {
  const products = await prisma.product.findMany({
    select: { id: true, slug: true },
  })
  const productIdBySlug = new Map(
    products.map((product) => [product.slug.toLowerCase(), product.id]),
  )
  if (productIdBySlug.size === 0) return { breakdowns: [] }

  const limit = cloudflareGroupLimit(args.maxRows)
  const baseQuery = {
    dateRange: {
      startDate: args.window.startDate,
      endDate: args.window.endDate,
    },
    pagePaths: products.map((product) => productPath(product.slug)),
    limit,
  } as const
  const [browserGroups, osGroups, deviceGroups, countryGroups] =
    await Promise.all([
      queryCloudflareHttpGroups({
        ...baseQuery,
        dimensions: ["date", "clientRequestPath", "userAgentBrowser"],
      }),
      queryCloudflareHttpGroups({
        ...baseQuery,
        dimensions: ["date", "clientRequestPath", "userAgentOS"],
      }),
      queryCloudflareHttpGroups({
        ...baseQuery,
        dimensions: ["date", "clientRequestPath", "clientDeviceType"],
      }),
      queryCloudflareHttpGroups({
        ...baseQuery,
        dimensions: ["date", "clientRequestPath", "clientCountryName"],
      }),
    ])

  const source = "cloudflare" as const
  const ingestionRunId = args.ingestionRunId ?? null
  const browsers = new Map<
    string,
    Prisma.ProductTrafficBrowserDailyCreateManyInput
  >()
  const operatingSystems = new Map<
    string,
    Prisma.ProductTrafficOperatingSystemDailyCreateManyInput
  >()
  const devices = new Map<
    string,
    Prisma.ProductTrafficDeviceDailyCreateManyInput
  >()
  const countries = new Map<
    string,
    Prisma.ProductTrafficCountryDailyCreateManyInput
  >()

  const resolveBase = (group: (typeof browserGroups)[number]) => {
    const date = parseAnalyticsDate(group.dimensions?.date)
    const slug = extractProductSlug(group.dimensions?.clientRequestPath)
    const productId = slug ? productIdBySlug.get(slug) : null
    return date && productId ? { date, productId } : null
  }

  for (const group of browserGroups) {
    const base = resolveBase(group)
    const visitors = groupViews(group)
    if (!base || visitors <= 0) continue
    const browser = group.dimensions?.userAgentBrowser?.trim() || "Unknown"
    accumulate(
      browsers,
      `${base.productId}:${base.date.toISOString().slice(0, 10)}:${browser}`,
      { ...base, source, browser, visitors, ingestionRunId },
      "visitors",
    )
  }

  for (const group of osGroups) {
    const base = resolveBase(group)
    const visitors = groupViews(group)
    if (!base || visitors <= 0) continue
    const operatingSystem = group.dimensions?.userAgentOS?.trim() || "Unknown"
    accumulate(
      operatingSystems,
      `${base.productId}:${base.date.toISOString().slice(0, 10)}:${operatingSystem}`,
      { ...base, source, operatingSystem, visitors, ingestionRunId },
      "visitors",
    )
  }

  for (const group of deviceGroups) {
    const base = resolveBase(group)
    const visitors = groupViews(group)
    if (!base || visitors <= 0) continue
    const deviceCategory =
      group.dimensions?.clientDeviceType?.trim().toLowerCase() || "unknown"
    accumulate(
      devices,
      `${base.productId}:${base.date.toISOString().slice(0, 10)}:${deviceCategory}`,
      { ...base, source, deviceCategory, visitors, ingestionRunId },
      "visitors",
    )
  }

  for (const group of countryGroups) {
    const base = resolveBase(group)
    const visitors = groupViews(group)
    if (!base || visitors <= 0) continue
    const countryCode = group.dimensions?.clientCountryName?.trim() || ""
    const country = formatCountryName(countryCode)
    accumulate(
      countries,
      `${base.productId}:${base.date.toISOString().slice(0, 10)}:${countryCode}`,
      { ...base, source, country, countryCode, visitors, ingestionRunId },
      "visitors",
    )
  }

  await prisma.$transaction([
    prisma.productTrafficBrowserDaily.deleteMany({
      where: { source, date: { gte: args.window.start, lte: args.window.end } },
    }),
    prisma.productTrafficOperatingSystemDaily.deleteMany({
      where: { source, date: { gte: args.window.start, lte: args.window.end } },
    }),
    prisma.productTrafficDeviceDaily.deleteMany({
      where: { source, date: { gte: args.window.start, lte: args.window.end } },
    }),
    prisma.productTrafficCountryDaily.deleteMany({
      where: { source, date: { gte: args.window.start, lte: args.window.end } },
    }),
  ])

  await insertBatches(Array.from(browsers.values()), (data) =>
    prisma.productTrafficBrowserDaily.createMany({ data }),
  )
  await insertBatches(Array.from(operatingSystems.values()), (data) =>
    prisma.productTrafficOperatingSystemDaily.createMany({ data }),
  )
  await insertBatches(Array.from(devices.values()), (data) =>
    prisma.productTrafficDeviceDaily.createMany({ data }),
  )
  await insertBatches(Array.from(countries.values()), (data) =>
    prisma.productTrafficCountryDaily.createMany({ data }),
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
      result("browsers", browserGroups.length, browsers.size),
      result("operatingSystems", osGroups.length, operatingSystems.size),
      result("devices", deviceGroups.length, devices.size),
      result("countries", countryGroups.length, countries.size),
    ],
  }
}

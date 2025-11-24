import { PrismaClient } from "@/lib/vendor/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { withAccelerate } from "@prisma/extension-accelerate"
import {
  convertToUsdCents,
  getUsdConversionRates,
} from "@/lib/server/payments/currency"

type ParsedArgs = {
  slug: string
  databaseUrl?: string
  startDate?: string
  endDate?: string
  sort?: "asc" | "desc"
}

function parseArgs(): ParsedArgs {
  const [, , ...rawArgs] = process.argv

  let slug: string | undefined
  let databaseUrl: string | undefined
  let startDate: string | undefined
  let endDate: string | undefined
  let sort: "asc" | "desc" | undefined
  let showHelp = false

  for (let i = 0; i < rawArgs.length; i += 1) {
    const current = rawArgs[i]
    const next = rawArgs[i + 1]

    if (current === "-h" || current === "--help") {
      showHelp = true
      continue
    }

    if (current === "--url" && next) {
      databaseUrl = next
      i += 1
      continue
    }

    if (current.startsWith("--url=")) {
      databaseUrl = current.replace("--url=", "")
      continue
    }

    if (current === "--start" && next) {
      startDate = next
      i += 1
      continue
    }

    if (current.startsWith("--start=")) {
      startDate = current.replace("--start=", "")
      continue
    }

    if (current === "--end" && next) {
      endDate = next
      i += 1
      continue
    }

    if (current.startsWith("--end=")) {
      endDate = current.replace("--end=", "")
      continue
    }

    if (current === "--sort" && next) {
      if (next === "asc" || next === "desc") {
        sort = next
      }
      i += 1
      continue
    }

    if (current.startsWith("--sort=")) {
      const value = current.replace("--sort=", "")
      if (value === "asc" || value === "desc") {
        sort = value
      }
      continue
    }

    if (!slug) {
      slug = current
    }
  }

  if (!slug) {
    if (!showHelp) {
      throw new Error(
        "Usage: pnpm tsx scripts/download-revenue.ts <product-slug> [--url <DATABASE_URL>]",
      )
    }
  }

  return { slug, databaseUrl, startDate, endDate, sort, showHelp }
}

function ensureDatabaseUrl(maybeUrl?: string): string {
  const url = maybeUrl ?? process.env.DATABASE_URL

  if (!url) {
    throw new Error(
      "DATABASE_URL is required. Pass --url <connection-string> or set the env var.",
    )
  }

  process.env.DATABASE_URL = url
  return url
}

function formatCents(cents: number | null | undefined): string {
  if (typeof cents !== "number") return "n/a"
  return (cents / 100).toFixed(2)
}

function parseDate(value?: string): Date | null {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function createPrismaClient(connectionString: string) {
  const isAccelerate =
    connectionString.startsWith("prisma://") ||
    connectionString.startsWith("prisma+postgres://")

  if (isAccelerate) {
    return new PrismaClient({ accelerateUrl: connectionString }).$extends(
      withAccelerate(),
    )
  }

  const adapter = new PrismaPg({ connectionString })
  return new PrismaClient({ adapter })
}

async function main() {
  const { slug, databaseUrl, startDate, endDate, sort, showHelp } = parseArgs()

  if (showHelp || !slug) {
    console.info(
      [
        "Usage:",
        "  pnpm tsx scripts/download-revenue.ts <product-slug> [options]",
        "",
        "Options:",
        "  --url <DATABASE_URL>   Override DATABASE_URL",
        "  --start YYYY-MM-DD     Filter snapshots on/after this date (UTC)",
        "  --end YYYY-MM-DD       Filter snapshots on/before this date (UTC)",
        "  --sort asc|desc        Sort by periodStart (default: desc)",
        "  -h, --help             Show this help",
      ].join("\n"),
    )
    return
  }
  const connectionString = ensureDatabaseUrl(databaseUrl)

  const prisma = createPrismaClient(connectionString)

  try {
    const rates = await getUsdConversionRates()

    const startAt = parseDate(startDate)
    const endAt = parseDate(endDate)
    if (startDate && !startAt) {
      throw new Error(`Invalid --start date: ${startDate}`)
    }
    if (endDate && !endAt) {
      throw new Error(`Invalid --end date: ${endDate}`)
    }
    if (startAt && endAt && startAt > endAt) {
      throw new Error("--start must be before --end")
    }

    const product = await prisma.product.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        paymentConnector: {
          select: {
            id: true,
            provider: true,
            status: true,
            latestAllTimeRevenueCents: true,
            latestCurrencyCode: true,
            latestPeriodStart: true,
            lastSyncedAt: true,
            lastSyncError: true,
            revenueHistory: {
              select: {
                currencyCode: true,
                periodStart: true,
                periodRevenueCents: true,
                allTimeRevenueCents: true,
                createdAt: true,
              },
            },
          },
        },
      },
    })

    if (!product) {
      throw new Error(`No product found for slug: ${slug}`)
    }

    if (!product.paymentConnector) {
      console.info(
        `Product ${product.name} (${product.slug}) has no payment connector.`,
      )
      return
    }

    const { paymentConnector } = product
    const { revenueHistory } = paymentConnector

    const filteredHistory = revenueHistory.filter((snapshot) => {
      const ts = snapshot.periodStart.getTime()
      if (startAt && ts < startAt.getTime()) return false
      if (endAt && ts > endAt.getTime()) return false
      return true
    })

    const sortedHistory = [...filteredHistory].sort((a, b) => {
      const primary =
        a.periodStart.getTime() === b.periodStart.getTime()
          ? a.createdAt.getTime() - b.createdAt.getTime()
          : a.periodStart.getTime() - b.periodStart.getTime()
      return sort === "asc" ? primary : -primary
    })

    console.info(
      JSON.stringify(
        {
          product: {
            id: product.id,
            name: product.name,
            slug: product.slug,
          },
          connector: {
            id: paymentConnector.id,
            provider: paymentConnector.provider,
            status: paymentConnector.status,
            latestAllTimeRevenueCents:
              paymentConnector.latestAllTimeRevenueCents,
            latestCurrencyCode: paymentConnector.latestCurrencyCode,
            latestPeriodStart: paymentConnector.latestPeriodStart,
            lastSyncedAt: paymentConnector.lastSyncedAt,
            lastSyncError: paymentConnector.lastSyncError,
          },
          snapshots: revenueHistory.length,
          filteredSnapshots: sortedHistory.length,
        },
        null,
        2,
      ),
    )

    if (sortedHistory.length === 0) {
      console.info("No revenue snapshots recorded for the specified range.")
      return
    }

    const rows = sortedHistory.map((snapshot) => {
      const periodConversion = convertToUsdCents(
        snapshot.periodRevenueCents ?? 0,
        snapshot.currencyCode,
        rates,
      )
      const allTimeConversion = convertToUsdCents(
        snapshot.allTimeRevenueCents ?? 0,
        snapshot.currencyCode,
        rates,
      )

      return {
        "Period Start (UTC)": snapshot.periodStart.toISOString(),
        Currency: snapshot.currencyCode,
        "Period Revenue": formatCents(snapshot.periodRevenueCents),
        "Period Revenue (USD)": formatCents(periodConversion.usdCents),
        "Rate→USD": periodConversion.rateUsed
          ? periodConversion.rateUsed.toFixed(4)
          : snapshot.currencyCode === "USD"
            ? "1.0000"
            : "n/a",
        "All-Time Revenue": formatCents(snapshot.allTimeRevenueCents),
        "All-Time Revenue (USD)": formatCents(allTimeConversion.usdCents),
        "Recorded At": snapshot.createdAt.toISOString(),
      }
    })

    console.table(rows)

    const totalsByCurrency = sortedHistory.reduce<
      Record<
        string,
        {
          periodCents: number
          allTimeCents: number
          periodUsdCents: number
          allTimeUsdCents: number
          count: number
        }
      >
    >((acc, snapshot) => {
      const bucket = acc[snapshot.currencyCode] ?? {
        periodCents: 0,
        allTimeCents: 0,
        periodUsdCents: 0,
        allTimeUsdCents: 0,
        count: 0,
      }

      const periodUsd = convertToUsdCents(
        snapshot.periodRevenueCents ?? 0,
        snapshot.currencyCode,
        rates,
      ).usdCents
      const allTimeUsd = convertToUsdCents(
        snapshot.allTimeRevenueCents ?? 0,
        snapshot.currencyCode,
        rates,
      ).usdCents

      bucket.periodCents += snapshot.periodRevenueCents ?? 0
      bucket.allTimeCents = Math.max(
        bucket.allTimeCents,
        snapshot.allTimeRevenueCents ?? 0,
      )
      bucket.periodUsdCents += periodUsd
      bucket.allTimeUsdCents = Math.max(bucket.allTimeUsdCents, allTimeUsd)
      bucket.count += 1

      acc[snapshot.currencyCode] = bucket
      return acc
    }, {})

    const totalsTable = Object.entries(totalsByCurrency).map(
      ([currencyCode, totals]) => ({
        Currency: currencyCode,
        Snapshots: totals.count,
        "Period Total": formatCents(totals.periodCents),
        "Period Total (USD)": formatCents(totals.periodUsdCents),
        "Max All-Time": formatCents(totals.allTimeCents),
        "Max All-Time (USD)": formatCents(totals.allTimeUsdCents),
      }),
    )

    console.info("\nSummary by currency:")
    console.table(totalsTable)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`[download-revenue] ${message}`)
  process.exitCode = 1
})

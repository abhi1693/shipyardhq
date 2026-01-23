import prisma from "@/lib/prisma"
import {
  PaymentConnectorProvider,
  PaymentConnectorStatus,
} from "@/lib/vendor/prisma/client"
import {
  convertToUsdCents,
  getUsdConversionRates,
} from "@/lib/server/payments/currency"

type AdminRevenuePoint = {
  date: string
  label: string
  valueCents: number
}

type AdminRevenueTopProduct = {
  productId: string
  name: string | null
  slug: string | null
  revenueCents: number
}

type AdminRevenueProviderShare = {
  provider: PaymentConnectorProvider
  revenueCents: number
  share: number
}

export type AdminRevenueAnalytics = {
  currency: string
  totals: {
    allTimeCents: number
    rangeCents: number
    previousRangeCents: number
    latestDayCents: number
  }
  coverage: {
    totalConnectors: number
    convertibleConnectors: number
    withRevenue: number
    errors: number
    lastSyncedAt: string | null
  }
  providerShare: AdminRevenueProviderShare[]
  topProducts: AdminRevenueTopProduct[]
  trend: AdminRevenuePoint[]
  unconvertedConnectorIds: string[]
  pace: {
    label: string
    fromCents: number
    toCents: number
    avgDays: number | null
    samples: number
  }[]
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

function startOfUtcDay(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  )
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * MS_PER_DAY)
}

function formatLabel(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date)
}

function asUsd(
  amountCents: number,
  currencyCode: string | null | undefined,
  rates: Map<string, number>,
) {
  const code = (currencyCode || "USD").toUpperCase()
  const { usdCents, rateUsed } = convertToUsdCents(amountCents, code, rates)
  const convertible = code === "USD" || rateUsed !== null
  return { usdCents, convertible }
}

export async function getAdminRevenueAnalytics({
  range,
}: {
  range: number | "all"
}): Promise<AdminRevenueAnalytics> {
  const isAllTime = range === "all"
  const rangeDays = isAllTime ? null : Math.max(range || 7, 1)
  const rates = await getUsdConversionRates()
  const now = new Date()
  const rangeStart = isAllTime
    ? startOfUtcDay(new Date(0))
    : startOfUtcDay(addDays(now, -((rangeDays ?? 1) - 1)))
  const previousRangeStart = isAllTime
    ? null
    : addDays(rangeStart, -(rangeDays ?? 1))

  const connectors = await prisma.paymentConnector.findMany({
    select: {
      id: true,
      provider: true,
      status: true,
      lastSyncedAt: true,
      latestAllTimeRevenueCents: true,
      latestCurrencyCode: true,
      product: {
        select: { id: true, name: true, slug: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  })

  const connectorLookup = new Map<string, (typeof connectors)[number]>(
    connectors.map((connector: (typeof connectors)[number]) => [
      connector.id,
      connector,
    ]),
  )

  const productLookup = new Map<
    string,
    { name: string | null; slug: string | null }
  >()

  const unconvertedConnectorIds: string[] = []
  let allTimeCents = 0
  let convertibleConnectors = 0
  let connectorsWithRevenue = 0
  let lastSyncedAt: Date | null = null
  const providerTotals = new Map<PaymentConnectorProvider, number>()
  const topProductTotals = new Map<string, AdminRevenueTopProduct>()

  for (const connector of connectors) {
    const { usdCents, convertible } = asUsd(
      connector.latestAllTimeRevenueCents ?? 0,
      connector.latestCurrencyCode,
      rates,
    )

    if (convertible) {
      convertibleConnectors += 1
      if (usdCents > 0) connectorsWithRevenue += 1
      allTimeCents += usdCents
      providerTotals.set(
        connector.provider,
        (providerTotals.get(connector.provider) ?? 0) + usdCents,
      )

      if (connector.product?.id) {
        productLookup.set(connector.product.id, {
          name: connector.product.name,
          slug: connector.product.slug,
        })
        const existing = topProductTotals.get(connector.product.id)
        const updated: AdminRevenueTopProduct = {
          productId: connector.product.id,
          name: connector.product.name,
          slug: connector.product.slug,
          revenueCents: (existing?.revenueCents ?? 0) + usdCents,
        }
        topProductTotals.set(connector.product.id, updated)
      }
    } else {
      unconvertedConnectorIds.push(connector.id)
    }

    if (connector.lastSyncedAt) {
      if (!lastSyncedAt || connector.lastSyncedAt > lastSyncedAt) {
        lastSyncedAt = connector.lastSyncedAt
      }
    }
  }

  const snapshots = await prisma.paymentRevenueSnapshot.findMany({
    where: previousRangeStart
      ? { periodStart: { gte: previousRangeStart } }
      : undefined,
    select: {
      connectorId: true,
      periodStart: true,
      currencyCode: true,
      periodRevenueCents: true,
    },
    orderBy: { periodStart: "asc" },
  })

  let rangeCents = 0
  let previousRangeCents = 0
  const dailyCurrent = new Map<string, number>()
  const rangeProductTotals = new Map<string, number>()

  for (const snapshot of snapshots) {
    const day = startOfUtcDay(new Date(snapshot.periodStart))
    const { usdCents, convertible } = asUsd(
      snapshot.periodRevenueCents ?? 0,
      snapshot.currencyCode,
      rates,
    )
    if (!convertible) continue

    const dayKey = day.toISOString().slice(0, 10)
    const inCurrent = day >= rangeStart
    if (inCurrent) {
      rangeCents += usdCents
      dailyCurrent.set(dayKey, (dailyCurrent.get(dayKey) ?? 0) + usdCents)

      const connector = connectorLookup.get(snapshot.connectorId)
      const productId = connector?.product?.id
      if (productId) {
        rangeProductTotals.set(
          productId,
          (rangeProductTotals.get(productId) ?? 0) + usdCents,
        )
      }
    } else if (previousRangeStart) {
      previousRangeCents += usdCents
    }
  }

  const trend = Array.from(dailyCurrent.entries())
    .map(([date, valueCents]) => ({
      date,
      label: formatLabel(new Date(`${date}T00:00:00Z`)),
      valueCents,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const latestDayCents = trend.length
    ? (trend[trend.length - 1]?.valueCents ?? 0)
    : 0

  const providerShare: AdminRevenueProviderShare[] = Array.from(
    providerTotals.entries(),
  )
    .map(([provider, revenueCents]) => ({
      provider,
      revenueCents,
      share: allTimeCents > 0 ? revenueCents / allTimeCents : 0,
    }))
    .sort((a, b) => b.revenueCents - a.revenueCents)

  // Prefer range-based product ordering if available, otherwise fall back to all-time totals.
  const topProducts: AdminRevenueTopProduct[] = (
    rangeProductTotals.size > 0
      ? Array.from(rangeProductTotals.entries()).map(
          ([productId, revenueCents]) => {
            const product = productLookup.get(productId)
            return {
              productId,
              name: product?.name ?? null,
              slug: product?.slug ?? null,
              revenueCents,
            }
          },
        )
      : Array.from(topProductTotals.values())
  ).sort((a, b) => b.revenueCents - a.revenueCents)

  // Time-to-revenue pacing (USD-convertible connectors only)
  const paceThresholds = [
    { label: "0->1k", fromCents: 0, toCents: 100_000 },
    { label: "1k->10k", fromCents: 100_000, toCents: 1_000_000 },
    { label: "10k->100k", fromCents: 1_000_000, toCents: 10_000_000 },
    { label: "100k->1m", fromCents: 10_000_000, toCents: 100_000_000 },
  ] as const

  type SnapshotRow = {
    connectorId: string
    periodStart: Date
    currencyCode: string
    allTimeRevenueCents: number | null
  }

  const allSnapshots = (await prisma.paymentRevenueSnapshot.findMany({
    select: {
      connectorId: true,
      periodStart: true,
      currencyCode: true,
      allTimeRevenueCents: true,
    },
    orderBy: { periodStart: "asc" },
  })) as SnapshotRow[]

  type PaceAccumulator = {
    totalDays: number
    samples: number
  }

  const paceMap = new Map<number, PaceAccumulator>()
  for (const threshold of paceThresholds) {
    paceMap.set(threshold.toCents, { totalDays: 0, samples: 0 })
  }

  const snapshotsByConnector = new Map<string, SnapshotRow[]>()
  for (const snap of allSnapshots) {
    const list = snapshotsByConnector.get(snap.connectorId) || []
    list.push(snap)
    snapshotsByConnector.set(snap.connectorId, list)
  }

  for (const [connectorId, snaps] of snapshotsByConnector.entries()) {
    const connector = connectorLookup.get(connectorId)
    if (!connector) continue

    const timeline = snaps
      .map((snap) => {
        const { usdCents, convertible } = asUsd(
          snap.allTimeRevenueCents ?? 0,
          snap.currencyCode,
          rates,
        )
        return {
          date: snap.periodStart,
          usdCents,
          convertible,
        }
      })
      .filter((snap) => snap.convertible)
      .sort((a, b) => a.date.getTime() - b.date.getTime())

    if (timeline.length === 0) continue

    const reached = new Map<number, Date>()
    for (const point of timeline) {
      for (const threshold of paceThresholds) {
        if (
          point.usdCents >= threshold.toCents &&
          !reached.has(threshold.toCents)
        ) {
          reached.set(threshold.toCents, point.date)
        }
      }
    }

    const segmentStartDate = timeline[0].date
    for (const threshold of paceThresholds) {
      const hitDate = reached.get(threshold.toCents)
      if (!hitDate) continue
      const fromReachedDate =
        threshold.fromCents === 0
          ? segmentStartDate
          : (reached.get(threshold.fromCents) ?? segmentStartDate)
      const days = Math.max(
        0,
        Math.round(
          (hitDate.getTime() - fromReachedDate.getTime()) / MS_PER_DAY,
        ),
      )
      const acc = paceMap.get(threshold.toCents)
      if (acc) {
        acc.totalDays += days
        acc.samples += 1
        paceMap.set(threshold.toCents, acc)
      }
    }
  }

  const pace = paceThresholds.map((threshold) => {
    const acc = paceMap.get(threshold.toCents)
    const avgDays = acc && acc.samples > 0 ? acc.totalDays / acc.samples : null
    return {
      label: threshold.label,
      fromCents: threshold.fromCents,
      toCents: threshold.toCents,
      avgDays,
      samples: acc?.samples ?? 0,
    }
  })

  return {
    currency: "USD",
    totals: {
      allTimeCents,
      rangeCents,
      previousRangeCents,
      latestDayCents,
    },
    coverage: {
      totalConnectors: connectors.length,
      convertibleConnectors,
      withRevenue: connectorsWithRevenue,
      errors: connectors.filter(
        (c: (typeof connectors)[number]) =>
          c.status === PaymentConnectorStatus.error,
      ).length,
      lastSyncedAt: lastSyncedAt ? lastSyncedAt.toISOString() : null,
    },
    providerShare,
    topProducts,
    trend,
    unconvertedConnectorIds,
    pace,
  }
}

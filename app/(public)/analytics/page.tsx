import { format, subDays } from "date-fns"
import {
  Activity,
  Clock3,
  DollarSign,
  MousePointer2,
  TrendingUp,
  Users,
} from "lucide-react"

import {
  BrowserIcon,
  deviceIcon,
  FlagIcon,
  formatDuration,
  formatPercent,
  OsIcon,
  ValueBarRow,
} from "@/components/molecules/AnalyticsShared"
import { TrafficTimeseriesChart } from "@/components/molecules/TrafficTimeseriesChart"
import { AnalyticsListCard } from "@/components/molecules/AnalyticsListCard"
import { AnalyticsMetricCard } from "@/components/molecules/AnalyticsMetricCard"
import { LiveVisitorsPill } from "@/components/molecules/LiveVisitorsPill"
import { CoreStructuredData } from "@/components/seo/CoreStructuredData"
import prisma from "@/lib/prisma"
import { buildPageMetadata } from "@/lib/metadata"
import { ANALYTICS_PATH, HOME_PATH } from "@/lib/routes"
import { getAnalyticsProvider } from "@/lib/server/analytics/store"
import {
  convertToUsdCents,
  getUsdConversionRates,
} from "@/lib/server/payments/currency"
import { siteConfig } from "@/lib/siteConfig"
import { PaymentConnectorStatus } from "@/lib/vendor/prisma/client"

const PAGE_TITLE = "Analytics"
export const revalidate = 300

const numberFormatter = new Intl.NumberFormat("en-US")

function formatCurrency(amountCents: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format((amountCents || 0) / 100)
  } catch {
    return `$${((amountCents || 0) / 100).toFixed(0)}`
  }
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

function computeDelta(current: number, previous: number) {
  if (!Number.isFinite(previous) || previous === 0) return null
  const delta = ((current - previous) / previous) * 100
  return delta
}

function referrerLabel(value: string) {
  if (value === "direct" || value === "Direct / none") return "Direct"
  const cleaned = value
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .trim()
  const domain = cleaned.split(/[/#?]/)[0]
  return domain || value
}

async function getVerifiedRevenueTotals({
  rangeStart,
  rangeEnd,
  previousRangeStart,
  previousRangeEnd,
}: {
  rangeStart: Date
  rangeEnd: Date
  previousRangeStart: Date
  previousRangeEnd: Date
}) {
  const ratesPromise = getUsdConversionRates()

  const whereBase = {
    connector: {
      verifiedAt: { not: null },
      status: PaymentConnectorStatus.active,
    },
  } as const

  const [currentSnapshots, previousSnapshots, rates] = await Promise.all([
    prisma.paymentRevenueSnapshot.findMany({
      where: {
        ...whereBase,
        periodStart: { gte: rangeStart, lt: addDays(rangeEnd, 1) },
      },
      select: { periodRevenueCents: true, currencyCode: true },
    }),
    prisma.paymentRevenueSnapshot.findMany({
      where: {
        ...whereBase,
        periodStart: {
          gte: previousRangeStart,
          lt: addDays(previousRangeEnd, 1),
        },
      },
      select: { periodRevenueCents: true, currencyCode: true },
    }),
    ratesPromise,
  ])

  const sumUsd = (
    snapshots: { periodRevenueCents: number | null; currencyCode: string }[],
  ) =>
    snapshots.reduce((total, snapshot) => {
      const { usdCents, rateUsed } = convertToUsdCents(
        snapshot.periodRevenueCents ?? 0,
        snapshot.currencyCode,
        rates,
      )
      const currency = (snapshot.currencyCode || "USD").toUpperCase()
      const convertible = currency === "USD" || rateUsed !== null
      return convertible ? total + usdCents : total
    }, 0)

  return {
    currency: "USD",
    rangeCents: sumUsd(currentSnapshots),
    previousRangeCents: sumUsd(previousSnapshots),
  }
}

export const metadata = buildPageMetadata({
  title: PAGE_TITLE,
  description:
    "Live Shipyard performance for the past 30 days with top products, referrers, and engagement signals.",
})

export default async function AnalyticsPage() {
  const rangeEnd = subDays(new Date(), 0)
  const rangeStart = subDays(rangeEnd, 29)
  const prevRangeEnd = subDays(rangeStart, 1)
  const prevRangeStart = subDays(prevRangeEnd, 29)
  const rangeStartUtc = startOfUtcDay(rangeStart)
  const rangeEndUtc = startOfUtcDay(rangeEnd)
  const prevRangeStartUtc = startOfUtcDay(prevRangeStart)
  const prevRangeEndUtc = startOfUtcDay(prevRangeEnd)
  const analyticsProvider = getAnalyticsProvider("db")

  const [snapshot, previousSnapshot, realtimeVisitors, verifiedRevenue] =
    await Promise.all([
      analyticsProvider.getSiteAnalyticsSnapshot({ topProductLimit: 8 }),
      analyticsProvider.getSiteAnalyticsSnapshot({
        topProductLimit: 8,
        dateRange: {
          startDate: format(prevRangeStart, "yyyy-MM-dd"),
          endDate: format(prevRangeEnd, "yyyy-MM-dd"),
        },
      }),
      analyticsProvider.getRealtimeVisitors(),
      getVerifiedRevenueTotals({
        rangeStart: rangeStartUtc,
        rangeEnd: rangeEndUtc,
        previousRangeStart: prevRangeStartUtc,
        previousRangeEnd: prevRangeEndUtc,
      }),
    ])

  const productSlugs = snapshot.topProductPages
    .map((page) => page.slug?.toLowerCase())
    .filter((slug): slug is string => Boolean(slug))

  const products =
    productSlugs.length > 0
      ? await prisma.product.findMany({
          where: { slug: { in: productSlugs } },
          select: {
            slug: true,
            name: true,
            analytics: { select: { upvotes: true } },
          },
        })
      : []

  const productMap = new Map<string, (typeof products)[number]>(
    products.map((product: (typeof products)[number]) => [
      product.slug.toLowerCase(),
      product,
    ]),
  )

  const topProducts = snapshot.topProductPages.map((page) => {
    const slug = page.slug?.toLowerCase()
    const product = slug ? productMap.get(slug) : null
    return {
      ...page,
      name: product?.name ?? slug ?? page.path,
      upvotes: product?.analytics?.upvotes ?? null,
    }
  })

  const rangeLabel = `${format(rangeStart, "MMM d")} – ${format(rangeEnd, "MMM d")}`
  const totalProductViews = topProducts.reduce((sum, p) => sum + p.pageViews, 0)
  const newVisitorShare =
    snapshot.uniqueVisitors > 0
      ? (snapshot.newUsers / snapshot.uniqueVisitors) * 100
      : 0
  const returningVisitorShare = Math.max(0, 100 - newVisitorShare)

  const deltas = {
    views: computeDelta(snapshot.pageViews, previousSnapshot.pageViews),
    sessions: computeDelta(snapshot.sessions, previousSnapshot.sessions),
    visitors: computeDelta(
      snapshot.uniqueVisitors,
      previousSnapshot.uniqueVisitors,
    ),
    bounce: computeDelta(snapshot.bounceRate, previousSnapshot.bounceRate),
    duration: computeDelta(
      snapshot.averageSessionDuration,
      previousSnapshot.averageSessionDuration,
    ),
    pagesPerSession: computeDelta(
      snapshot.pagesPerSession,
      previousSnapshot.pagesPerSession,
    ),
    engagementRate: computeDelta(
      snapshot.engagementRate,
      previousSnapshot.engagementRate,
    ),
    revenue: computeDelta(
      verifiedRevenue.rangeCents,
      verifiedRevenue.previousRangeCents,
    ),
  }

  const valueBarRowClassName =
    "border border-slate-200 bg-white px-3 py-2 shadow-sm"

  return (
    <>
      <CoreStructuredData
        scriptKeyPrefix="analytics"
        webPage={{ path: ANALYTICS_PATH, name: PAGE_TITLE }}
        breadcrumbs={{
          items: [
            { name: "Home", path: HOME_PATH },
            { name: PAGE_TITLE, path: ANALYTICS_PATH },
          ],
        }}
      />
      <main className="bg-slate-50 text-slate-900">
        <div className="mx-auto max-w-7xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
          <header className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <h1 className="text-3xl font-semibold sm:text-4xl">
                {siteConfig.name} Traffic Snapshot
              </h1>
              <LiveVisitorsPill initialVisitors={realtimeVisitors} />
            </div>
            <p className="text-sm text-slate-600">{rangeLabel}</p>
          </header>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <AnalyticsMetricCard
              label="Views"
              value={numberFormatter.format(snapshot.pageViews)}
              delta={deltas.views}
              icon={<TrendingUp className="h-4 w-4" aria-hidden />}
              helper="Pageviews across the site."
            />
            <AnalyticsMetricCard
              label="Visits"
              value={numberFormatter.format(snapshot.sessions)}
              delta={deltas.sessions}
              icon={<MousePointer2 className="h-4 w-4" aria-hidden />}
              helper="Sessions started on the site."
            />
            <AnalyticsMetricCard
              label="Visitors"
              value={numberFormatter.format(snapshot.uniqueVisitors)}
              delta={deltas.visitors}
              icon={<Users className="h-4 w-4" aria-hidden />}
              helper="Estimated unique people visiting the site."
            />
            <AnalyticsMetricCard
              label="Bounce rate"
              value={formatPercent(snapshot.bounceRate)}
              delta={deltas.bounce}
              icon={<Activity className="h-4 w-4" aria-hidden />}
              helper="Share of visits with a single pageview before exit."
            />
            <AnalyticsMetricCard
              label="Visit duration"
              value={formatDuration(snapshot.averageSessionDuration, {
                padMinutes: true,
              })}
              delta={deltas.duration}
              icon={<Clock3 className="h-4 w-4" aria-hidden />}
              helper="Average time spent on site during a visit."
            />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <AnalyticsMetricCard
              label="Pages per session"
              value={snapshot.pagesPerSession.toFixed(2)}
              delta={deltas.pagesPerSession}
              icon={<MousePointer2 className="h-4 w-4" aria-hidden />}
              helper="Average number of pages viewed during a visit."
            />
            <AnalyticsMetricCard
              label="Engaged session rate"
              value={formatPercent(snapshot.engagementRate)}
              delta={deltas.engagementRate}
              icon={<Activity className="h-4 w-4" aria-hidden />}
              helper="Share of visits marked engaged (10s+, 2+ views, or a conversion)."
            />
            <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-600">
                  New vs returning
                </div>
                <div className="text-xs text-slate-500">Visitors</div>
              </div>
              <ValueBarRow
                value={newVisitorShare}
                max={100}
                className={valueBarRowClassName}
                left={
                  <div className="flex items-center gap-2 truncate">
                    <span className="h-2 w-2 rounded-full bg-sky-400" />
                    <span className="text-sm font-medium text-slate-900">
                      New
                    </span>
                  </div>
                }
                right={
                  <span className="text-sm font-semibold text-slate-700">
                    {formatPercent(newVisitorShare)}
                  </span>
                }
                tone="blue"
              />
              <ValueBarRow
                value={returningVisitorShare}
                max={100}
                className={valueBarRowClassName}
                left={
                  <div className="flex items-center gap-2 truncate">
                    <span className="h-2 w-2 rounded-full bg-indigo-400" />
                    <span className="text-sm font-medium text-slate-900">
                      Returning
                    </span>
                  </div>
                }
                right={
                  <span className="text-sm font-semibold text-slate-700">
                    {formatPercent(returningVisitorShare)}
                  </span>
                }
                tone="indigo"
              />
            </div>
            <AnalyticsMetricCard
              label="Verified revenue"
              value={formatCurrency(
                verifiedRevenue.rangeCents,
                verifiedRevenue.currency,
              )}
              delta={deltas.revenue}
              icon={<DollarSign className="h-4 w-4" aria-hidden />}
              helper="Revenue from connected providers with verified payouts."
            />
          </div>

          <section className="mt-8 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Visitors vs page views</h2>
            </div>
            <TrafficTimeseriesChart
              points={snapshot.timeseries}
              height={280}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              emptyClassName="flex h-64 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white text-sm text-slate-500"
              emptyLabel="Not enough data yet."
            />
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span>Source: Shipyard analytics</span>
              <span className="h-1 w-1 rounded-full bg-slate-300" aria-hidden />
              <span>Updated {new Date().toLocaleString()}</span>
            </div>
          </section>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <AnalyticsListCard
              title="Product Pages"
              items={topProducts.map((product) => {
                const share =
                  totalProductViews > 0
                    ? (product.pageViews / totalProductViews) * 100
                    : 0
                return {
                  key: product.path,
                  value: share,
                  tone: "indigo",
                  left: (
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-slate-900">
                        {product.name}
                      </div>
                      <div className="truncate text-xs text-slate-500">
                        {product.path}
                      </div>
                    </div>
                  ),
                  right: (
                    <div className="text-right">
                      <div className="text-sm font-semibold text-slate-700">
                        {formatPercent(share)}
                      </div>
                      <div className="text-xs text-slate-500">
                        {numberFormatter.format(product.pageViews)} views
                      </div>
                    </div>
                  ),
                }
              })}
              max={100}
              listClassName="space-y-4"
              emptyLabel="No product traffic recorded in this window yet."
              valueBarRowProps={{ className: valueBarRowClassName }}
            />

            <AnalyticsListCard
              title="Referrers"
              items={snapshot.referrers.map((referrer) => ({
                key: referrer.referrer,
                value: referrer.views,
                left: (
                  <span className="truncate font-medium text-slate-900">
                    {referrerLabel(referrer.referrer)}
                  </span>
                ),
                right: (
                  <span className="text-sm font-semibold text-slate-700">
                    {formatPercent(referrer.share)}
                  </span>
                ),
              }))}
              listClassName="space-y-3"
              emptyLabel="Waiting for referral data."
              valueBarRowProps={{ className: valueBarRowClassName }}
            />
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <AnalyticsListCard
              title="Countries"
              items={snapshot.countries.map((country) => ({
                key: country.country,
                value: country.visitors,
                tone: "blue",
                left: (
                  <div className="flex items-center gap-2 truncate">
                    <FlagIcon
                      code={country.code}
                      name={country.country}
                      variant="image"
                      className="shrink-0"
                    />
                    <span className="truncate font-medium text-slate-900">
                      {country.country}
                    </span>
                  </div>
                ),
                right: (
                  <span className="text-sm font-semibold text-slate-700">
                    {formatPercent(country.share)}
                  </span>
                ),
              }))}
              listClassName="space-y-3"
              emptyLabel="No country data yet."
              valueBarRowProps={{ className: valueBarRowClassName }}
            />

            <AnalyticsListCard
              title="Cities"
              items={snapshot.cities.map((city) => ({
                key: `${city.city}-${city.region ?? ""}-${city.country ?? ""}`,
                value: city.visitors,
                tone: "blue",
                left: (
                  <div className="flex items-center gap-2 truncate">
                    <FlagIcon
                      code={city.code}
                      name={city.city}
                      variant="image"
                      className="shrink-0"
                    />
                    <div className="min-w-0 truncate">
                      <div className="truncate font-medium text-slate-900">
                        {city.city}
                      </div>
                      <div className="truncate text-xs text-slate-500">
                        {[city.region, city.country]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    </div>
                  </div>
                ),
                right: (
                  <span className="text-sm font-semibold text-slate-700">
                    {formatPercent(city.share)}
                  </span>
                ),
              }))}
              listClassName="space-y-3"
              emptyLabel="No city data yet."
              valueBarRowProps={{ className: valueBarRowClassName }}
            />
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            <AnalyticsListCard
              title="Browsers"
              items={snapshot.browsers.map((browser) => ({
                key: browser.browser,
                value: browser.visitors,
                tone: "indigo",
                left: (
                  <div className="flex items-center gap-2 truncate">
                    <BrowserIcon name={browser.browser} />
                    <span className="truncate font-medium text-slate-900">
                      {browser.browser}
                    </span>
                  </div>
                ),
                right: (
                  <span className="text-sm font-semibold text-slate-700">
                    {formatPercent(browser.share)}
                  </span>
                ),
              }))}
              listClassName="space-y-3"
              emptyLabel="No browser data yet."
              valueBarRowProps={{ className: valueBarRowClassName }}
            />

            <AnalyticsListCard
              title="Operating systems"
              items={snapshot.operatingSystems.map((os) => ({
                key: os.os,
                value: os.visitors,
                tone: "blue",
                left: (
                  <div className="flex items-center gap-2 truncate">
                    <OsIcon name={os.os} />
                    <span className="truncate font-medium text-slate-900">
                      {os.os}
                    </span>
                  </div>
                ),
                right: (
                  <span className="text-sm font-semibold text-slate-700">
                    {formatPercent(os.share)}
                  </span>
                ),
              }))}
              listClassName="space-y-3"
              emptyLabel="No OS data yet."
              valueBarRowProps={{ className: valueBarRowClassName }}
            />

            <AnalyticsListCard
              title="Devices"
              items={snapshot.devices.map((device) => ({
                key: device.deviceCategory,
                value: device.visitors,
                tone: "indigo",
                left: (
                  <div className="flex items-center gap-2 truncate capitalize">
                    {deviceIcon(device.deviceCategory)}
                    <span className="truncate font-medium text-slate-900">
                      {device.deviceCategory}
                    </span>
                  </div>
                ),
                right: (
                  <span className="text-sm font-semibold text-slate-700">
                    {formatPercent(device.share)}
                  </span>
                ),
              }))}
              listClassName="space-y-3"
              emptyLabel="No device data yet."
              valueBarRowProps={{ className: valueBarRowClassName }}
            />
          </div>

          <div className="mt-10 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
            <div>
              Data is aggregated/anonymized and excludes PII. Admin/internal
              traffic is filtered out. See our{" "}
              <a
                href="/legal/privacy-policy"
                className="font-semibold text-slate-900 underline-offset-4 hover:underline"
              >
                Privacy Policy
              </a>
              .
            </div>
          </div>
        </div>
      </main>
    </>
  )
}

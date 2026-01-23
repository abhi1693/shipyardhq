import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import {
  format,
  startOfDay,
  startOfWeek,
  startOfMonth,
  startOfYear,
  subDays,
  subMonths,
  differenceInCalendarDays,
} from "date-fns"
import {
  BrowserIcon,
  deviceIcon,
  FlagIcon,
  formatDuration,
  formatPercent,
  OsIcon,
} from "@/components/molecules/AnalyticsShared"
import { requireManageableProduct } from "@/lib/server/productAccess"
import {
  MEMBER_PRODUCTS_PATH,
  memberProductPath,
  productPath,
  memberProductUpgradePath,
} from "@/lib/routes"
import {
  getProductAnalyticsRecord,
  resolveProductAnalyticsAccess,
} from "@/lib/server/analytics/productAnalytics"
import { type GaDateRange } from "@/lib/server/analytics/googleAnalytics"
import { getAnalyticsProvider } from "@/lib/server/analytics/store"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"
import { ObjectPageLayout } from "@/components/layout/object-view/page-layout"
import {
  Activity,
  Clock3,
  MousePointer2,
  TrendingUp,
  Users,
} from "lucide-react"

import { ProductAnalyticsRangeDropdown } from "@/components/molecules/ProductAnalyticsRangeDropdown"
import { AnalyticsBarChart } from "@/components/molecules/AnalyticsBarChart"
import { AnalyticsListCard } from "@/components/molecules/AnalyticsListCard"
import { AnalyticsMetricCard } from "@/components/molecules/AnalyticsMetricCard"
import { AnalyticsValueList } from "@/components/molecules/AnalyticsValueList"
import { TrafficTimeseriesChart } from "@/components/molecules/TrafficTimeseriesChart"
import { Link2 } from "lucide-react"
import { Button } from "@/components/atoms/button"
import { getRevenueVerificationRankingNotice } from "@/lib/server/analytics/revenueVerificationNotice"

type RangeKey =
  | "today"
  | "24h"
  | "this-week"
  | "7d"
  | "this-month"
  | "30d"
  | "90d"
  | "this-year"
  | "6m"
  | "12m"
  | "all-time"

type RangeOption = {
  value: RangeKey
  label: string
}

type ResolvedRange = {
  key: RangeKey
  label: string
  dateRange: GaDateRange
}

const DEFAULT_RANGE: RangeKey = "7d"

const RANGE_OPTIONS: RangeOption[] = [
  { value: "today", label: "Today" },
  { value: "24h", label: "Last 24 hours" },
  { value: "this-week", label: "This week" },
  { value: "7d", label: "Last 7 days" },
  { value: "this-month", label: "This month" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "this-year", label: "This year" },
  { value: "6m", label: "Last 6 months" },
  { value: "12m", label: "Last 12 months" },
  { value: "all-time", label: "All time" },
]

function formatGaDate(date: Date) {
  return format(date, "yyyy-MM-dd")
}

function resolvePreviousRange(dateRange: GaDateRange): GaDateRange {
  const start = startOfDay(new Date(dateRange.startDate))
  const end = startOfDay(new Date(dateRange.endDate))
  const spanDays = Math.max(1, differenceInCalendarDays(end, start) + 1)
  const prevEnd = subDays(start, 1)
  const prevStart = subDays(prevEnd, spanDays - 1)
  return { startDate: formatGaDate(prevStart), endDate: formatGaDate(prevEnd) }
}

function computeDelta(current: number, previous: number) {
  if (!Number.isFinite(previous) || previous === 0) return null
  return ((current - previous) / previous) * 100
}

function UpgradeRequiredCard({
  title,
  description,
  href,
  className,
}: {
  title: string
  description?: string
  href: string
  className?: string
}) {
  const baseClass = "rounded-xl border border-slate-200 bg-white/90 shadow-sm"
  return (
    <Card className={className ? `${baseClass} ${className}` : baseClass}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-slate-900">{title}</CardTitle>
        {description ? (
          <CardDescription className="text-sm text-muted-foreground">
            {description}
          </CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center gap-3 py-8 text-center">
        <p className="text-sm text-slate-700">
          Upgrade your plan to unlock advanced analytics for this product.
        </p>
        <Button asChild size="sm">
          <Link href={href}>Upgrade to view</Link>
        </Button>
      </CardContent>
    </Card>
  )
}

function resolveRange(
  raw: string | null | undefined,
  productCreatedAt: Date,
): ResolvedRange {
  const now = startOfDay(new Date())
  const selected = RANGE_OPTIONS.find((option) => option.value === raw)
  const key = selected?.value ?? DEFAULT_RANGE
  const label = selected?.label ?? "Last 7 days"

  const buildRange = (): GaDateRange => {
    switch (key) {
      case "today": {
        return { startDate: formatGaDate(now), endDate: formatGaDate(now) }
      }
      case "24h": {
        const start = startOfDay(subDays(now, 1))
        return { startDate: formatGaDate(start), endDate: formatGaDate(now) }
      }
      case "this-week": {
        const start = startOfWeek(now)
        return { startDate: formatGaDate(start), endDate: formatGaDate(now) }
      }
      case "7d": {
        const start = startOfDay(subDays(now, 6))
        return { startDate: formatGaDate(start), endDate: formatGaDate(now) }
      }
      case "this-month": {
        const start = startOfMonth(now)
        return { startDate: formatGaDate(start), endDate: formatGaDate(now) }
      }
      case "30d": {
        const start = startOfDay(subDays(now, 29))
        return { startDate: formatGaDate(start), endDate: formatGaDate(now) }
      }
      case "90d": {
        const start = startOfDay(subDays(now, 89))
        return { startDate: formatGaDate(start), endDate: formatGaDate(now) }
      }
      case "this-year": {
        const start = startOfYear(now)
        return { startDate: formatGaDate(start), endDate: formatGaDate(now) }
      }
      case "6m": {
        const start = startOfMonth(subMonths(now, 5))
        return { startDate: formatGaDate(start), endDate: formatGaDate(now) }
      }
      case "12m": {
        const start = startOfMonth(subMonths(now, 11))
        return { startDate: formatGaDate(start), endDate: formatGaDate(now) }
      }
      case "all-time":
      default: {
        const start = startOfDay(productCreatedAt)
        return { startDate: formatGaDate(start), endDate: formatGaDate(now) }
      }
    }
  }

  return { key, label, dateRange: buildRange() }
}

function buildProductPagePaths(slug: string) {
  const base = productPath(slug)
  return [base, `${base}/`]
}

export default async function ProductAnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ range?: string }>
}) {
  const { slug } = await params
  const sp = await searchParams
  const { product: manageableProduct } = await requireManageableProduct(slug, {
    unauthorizedRedirect: null,
    missingRedirect: null,
  })

  const product = await getProductAnalyticsRecord(manageableProduct.id)

  if (!product) {
    return notFound()
  }

  const { hasBasicAnalytics, hasAdvancedAnalytics } =
    resolveProductAnalyticsAccess(product)

  if (!hasBasicAnalytics) {
    redirect(memberProductPath(product.slug))
  }

  const resolvedRange = resolveRange(sp?.range, product.createdAt)
  const previousRange = resolvePreviousRange(resolvedRange.dateRange)
  const rankingNoticePromise = getRevenueVerificationRankingNotice({
    productId: product.id,
  }).catch(() => null)
  const analyticsProvider = getAnalyticsProvider("cache")

  const [gaTraffic, gaTrafficPrevious, rankingNotice] = await Promise.all([
    analyticsProvider.getProductTraffic({
      pagePaths: buildProductPagePaths(product.slug),
      dateRange: resolvedRange.dateRange,
      includeAdvanced: hasAdvancedAnalytics,
    }),
    analyticsProvider.getProductTraffic({
      pagePaths: buildProductPagePaths(product.slug),
      dateRange: previousRange,
      includeAdvanced: hasAdvancedAnalytics,
    }),
    rankingNoticePromise,
  ])
  const upvotes = product.analytics?.upvotes ?? 0
  const formatter = new Intl.NumberFormat("en-US")
  const formatPercentOneDecimal = (value: number) =>
    formatPercent(value, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  const newVisitorShare =
    gaTraffic.uniqueVisitors > 0
      ? (gaTraffic.newUsers / gaTraffic.uniqueVisitors) * 100
      : 0
  const returningVisitorShare = Math.max(100 - newVisitorShare, 0)
  const newVisitorSharePrev =
    gaTrafficPrevious.uniqueVisitors > 0
      ? (gaTrafficPrevious.newUsers / gaTrafficPrevious.uniqueVisitors) * 100
      : 0
  const newVisitorDelta = computeDelta(newVisitorShare, newVisitorSharePrev)
  const metricDeltas = {
    views: computeDelta(gaTraffic.pageViews, gaTrafficPrevious.pageViews),
    visits: computeDelta(gaTraffic.sessions, gaTrafficPrevious.sessions),
    visitors: computeDelta(
      gaTraffic.uniqueVisitors,
      gaTrafficPrevious.uniqueVisitors,
    ),
    bounce: computeDelta(gaTraffic.bounceRate, gaTrafficPrevious.bounceRate),
    duration: computeDelta(
      gaTraffic.averageSessionDuration,
      gaTrafficPrevious.averageSessionDuration,
    ),
  }

  const referrersSorted = gaTraffic.referrers
  const browsersSorted = gaTraffic.browsers
  const osSorted = gaTraffic.operatingSystems
  const devicesSorted = gaTraffic.devices
  const countriesSorted = gaTraffic.countries
  const citiesSorted = gaTraffic.cities
  const totalCountryVisitors =
    gaTraffic.uniqueVisitors > 0
      ? gaTraffic.uniqueVisitors
      : countriesSorted.reduce((sum, country) => sum + country.visitors, 0)
  const totalCityVisitors =
    gaTraffic.uniqueVisitors > 0
      ? gaTraffic.uniqueVisitors
      : citiesSorted.reduce((sum, city) => sum + city.visitors, 0)
  const channelSorted = gaTraffic.referrerCategories
  const showAdvanced = hasAdvancedAnalytics
  const upgradeHref = memberProductUpgradePath(product.slug)
  const valueBarRowProps = {
    className: "bg-slate-50",
    barClassName: "bg-blue-200",
    minPercent: 6,
  }

  return (
    <ObjectPageLayout
      heading={{
        id: product.slug,
        title: `${product.name} — Analytics`,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        slug: product.id,
        subtitle: "Analytics",
      }}
      overview={[]}
      basePath={MEMBER_PRODUCTS_PATH.slice(1)}
      headingActionsLeft={null}
      headingActionsRight={
        <ProductAnalyticsRangeDropdown
          options={RANGE_OPTIONS}
          value={resolvedRange.key}
          defaultValue={DEFAULT_RANGE}
        />
      }
      relationships={
        <div className="space-y-6">
          {rankingNotice ? (
            <div className="rounded-xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-900 shadow-sm">
              {rankingNotice}
            </div>
          ) : null}
          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <AnalyticsMetricCard
              label="Views"
              value={formatter.format(gaTraffic.pageViews)}
              helper="Page views for the selected range"
              delta={metricDeltas.views}
              icon={<TrendingUp className="h-4 w-4" aria-hidden />}
            />
            <AnalyticsMetricCard
              label="Visits"
              value={formatter.format(gaTraffic.sessions)}
              helper="Sessions"
              delta={metricDeltas.visits}
              icon={<MousePointer2 className="h-4 w-4" aria-hidden />}
            />
            <AnalyticsMetricCard
              label="Visitors"
              value={formatter.format(gaTraffic.uniqueVisitors)}
              helper="Unique visitors"
              delta={metricDeltas.visitors}
              icon={<Users className="h-4 w-4" aria-hidden />}
            />
            <AnalyticsMetricCard
              label="Bounce rate"
              value={formatPercent(gaTraffic.bounceRate)}
              helper="Bounce rate for the selected range"
              delta={metricDeltas.bounce}
              icon={<Activity className="h-4 w-4" aria-hidden />}
            />
            <AnalyticsMetricCard
              label="Visit duration"
              value={formatDuration(gaTraffic.averageSessionDuration, {
                padMinutes: true,
              })}
              helper="Average session duration"
              delta={metricDeltas.duration}
              icon={<Clock3 className="h-4 w-4" aria-hidden />}
            />
            <AnalyticsMetricCard
              label="Upvotes"
              value={formatter.format(upvotes)}
              helper="All time"
            />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="rounded-xl border border-slate-200 bg-white/90 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-slate-900">
                  Views & visitors
                </CardTitle>
                <CardDescription className="text-sm text-muted-foreground">
                  {resolvedRange.label}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <TrafficTimeseriesChart
                  points={gaTraffic.timeseries}
                  height={320}
                  emptyLabel="Not enough data for this range."
                  emptyClassName="flex h-80 items-center justify-center text-sm text-muted-foreground"
                  className="rounded-lg border border-slate-100 bg-white"
                />
              </CardContent>
            </Card>
            <Card className="rounded-xl border border-slate-200 bg-white/90 shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base text-slate-900">
                      New vs returning
                    </CardTitle>
                    <CardDescription className="text-sm text-muted-foreground">
                      {resolvedRange.label}
                    </CardDescription>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <div>New: {formatPercentOneDecimal(newVisitorShare)}</div>
                    <div>
                      Returning:{" "}
                      {formatPercentOneDecimal(returningVisitorShare)}
                    </div>
                    {newVisitorDelta !== null ? (
                      <div className="text-[11px] text-foreground">
                        Δ new: {formatPercentOneDecimal(newVisitorDelta)}
                      </div>
                    ) : null}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <AnalyticsBarChart
                  className="min-h-[260px]"
                  data={[
                    {
                      segment: "Visitors",
                      newVisitors: Math.max(newVisitorShare, 0),
                      returningVisitors: Math.max(returningVisitorShare, 0),
                    },
                  ]}
                  config={{
                    newVisitors: { label: "New", color: "#0ea5e9" },
                    returningVisitors: {
                      label: "Returning",
                      color: "#6366f1",
                    },
                  }}
                  bars={[
                    { dataKey: "newVisitors", barProps: { radius: 6 } },
                    {
                      dataKey: "returningVisitors",
                      barProps: { radius: 6 },
                    },
                  ]}
                  showLegend
                  xAxis={{ dataKey: "segment" }}
                  yAxis={{
                    domain: [0, 100],
                  }}
                  grid={{ strokeDasharray: "4 4" }}
                />
              </CardContent>
            </Card>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {showAdvanced ? (
              <AnalyticsListCard
                title="Top referrers"
                description="Most viewed sources this range"
                items={referrersSorted.map((ref) => ({
                  key: ref.referrer,
                  value: ref.views,
                  left: (
                    <span className="font-medium text-slate-900 truncate">
                      {ref.referrer}
                    </span>
                  ),
                  right: (
                    <div className="flex items-center gap-3 text-xs text-slate-700">
                      <span className="font-semibold">
                        {formatPercentOneDecimal(ref.share)}
                      </span>
                    </div>
                  ),
                }))}
                listClassName="space-y-2"
                emptyLabel="Not enough data for this range."
                emptyClassName="flex h-24 items-center justify-center text-sm text-muted-foreground"
                valueBarRowProps={valueBarRowProps}
                cardClassName="rounded-xl border border-slate-200 bg-white/90 shadow-sm"
                headerClassName="pb-2 px-4"
                contentClassName="pt-2"
                titleClassName="text-base text-slate-900"
                descriptionClassName="text-sm text-muted-foreground"
              />
            ) : (
              <UpgradeRequiredCard
                title="Top referrers"
                description="Most viewed sources this range"
                href={upgradeHref}
              />
            )}
            {showAdvanced ? (
              <AnalyticsListCard
                title="Traffic channels"
                description="Channel mix for this range"
                items={channelSorted.map((channel) => ({
                  key: channel.category,
                  value: channel.views,
                  left: (
                    <div className="flex items-center gap-2 truncate">
                      <Link2 className="h-4 w-4 text-slate-400" />
                      <span className="font-medium text-slate-900 truncate capitalize">
                        {channel.category}
                      </span>
                    </div>
                  ),
                  right: (
                    <div className="flex items-center gap-3 text-xs text-slate-700">
                      <span className="font-semibold">
                        {formatPercentOneDecimal(channel.share)}
                      </span>
                    </div>
                  ),
                }))}
                listClassName="space-y-2"
                emptyLabel="Not enough data for this range."
                emptyClassName="flex h-24 items-center justify-center text-sm text-muted-foreground"
                valueBarRowProps={valueBarRowProps}
                cardClassName="rounded-xl border border-slate-200 bg-white/90 shadow-sm"
                headerClassName="pb-2 px-4"
                contentClassName="pt-2"
                titleClassName="text-base text-slate-900"
                descriptionClassName="text-sm text-muted-foreground"
              />
            ) : (
              <UpgradeRequiredCard
                title="Traffic channels"
                description="Channel mix for this range"
                href={upgradeHref}
              />
            )}
          </div>
          <div className="grid gap-4 xl:grid-cols-3">
            {showAdvanced ? (
              <AnalyticsListCard
                title="Top operating systems"
                description="Most used OS by visitors"
                items={osSorted.map((os) => ({
                  key: os.os,
                  value: os.visitors,
                  left: (
                    <>
                      <OsIcon name={os.os} />
                      <span className="font-medium text-slate-900 truncate">
                        {os.os}
                      </span>
                    </>
                  ),
                  right: (
                    <span className="text-xs font-semibold text-slate-700">
                      {formatPercentOneDecimal(
                        gaTraffic.uniqueVisitors > 0
                          ? (os.visitors / gaTraffic.uniqueVisitors) * 100
                          : 0,
                      )}
                    </span>
                  ),
                }))}
                listClassName="space-y-2"
                emptyLabel="Not enough data for this range."
                emptyClassName="flex h-24 items-center justify-center text-sm text-muted-foreground"
                valueBarRowProps={valueBarRowProps}
                cardClassName="rounded-xl border border-slate-200 bg-white/90 shadow-sm"
                headerClassName="pb-2"
                contentClassName="pt-2"
                titleClassName="text-base text-slate-900"
                descriptionClassName="text-sm text-muted-foreground"
              />
            ) : (
              <UpgradeRequiredCard
                title="Top operating systems"
                description="Most used OS by visitors"
                href={upgradeHref}
              />
            )}
            {showAdvanced ? (
              <AnalyticsListCard
                title="Top devices"
                description="Most used devices by visitors"
                items={devicesSorted.map((device) => ({
                  key: device.deviceCategory,
                  value: device.visitors,
                  left: (
                    <>
                      {deviceIcon(device.deviceCategory)}
                      <span className="font-medium text-slate-900 truncate capitalize">
                        {device.deviceCategory}
                      </span>
                    </>
                  ),
                  right: (
                    <span className="text-xs font-semibold text-slate-700">
                      {formatPercentOneDecimal(
                        gaTraffic.uniqueVisitors > 0
                          ? (device.visitors / gaTraffic.uniqueVisitors) * 100
                          : 0,
                      )}
                    </span>
                  ),
                }))}
                listClassName="space-y-2"
                emptyLabel="Not enough data for this range."
                emptyClassName="flex h-24 items-center justify-center text-sm text-muted-foreground"
                valueBarRowProps={valueBarRowProps}
                cardClassName="rounded-xl border border-slate-200 bg-white/90 shadow-sm"
                headerClassName="pb-2"
                contentClassName="pt-2"
                titleClassName="text-base text-slate-900"
                descriptionClassName="text-sm text-muted-foreground"
              />
            ) : (
              <UpgradeRequiredCard
                title="Top devices"
                description="Most used devices by visitors"
                href={upgradeHref}
              />
            )}
            {showAdvanced ? (
              <AnalyticsListCard
                title="Top browsers"
                description="Most used browsers by visitors"
                items={browsersSorted.map((browser) => ({
                  key: browser.browser,
                  value: browser.visitors,
                  left: (
                    <>
                      <BrowserIcon name={browser.browser} />
                      <span className="font-medium text-slate-900 truncate">
                        {browser.browser}
                      </span>
                    </>
                  ),
                  right: (
                    <span className="text-xs font-semibold text-slate-700">
                      {formatPercentOneDecimal(
                        gaTraffic.uniqueVisitors > 0
                          ? (browser.visitors / gaTraffic.uniqueVisitors) * 100
                          : 0,
                      )}
                    </span>
                  ),
                }))}
                listClassName="space-y-2"
                emptyLabel="Not enough data for this range."
                emptyClassName="flex h-24 items-center justify-center text-sm text-muted-foreground"
                valueBarRowProps={valueBarRowProps}
                cardClassName="rounded-xl border border-slate-200 bg-white/90 shadow-sm"
                headerClassName="pb-2"
                contentClassName="pt-2"
                titleClassName="text-base text-slate-900"
                descriptionClassName="text-sm text-muted-foreground"
              />
            ) : (
              <UpgradeRequiredCard
                title="Top browsers"
                description="Most used browsers by visitors"
                href={upgradeHref}
              />
            )}
          </div>
          {showAdvanced ? (
            <Card className="rounded-xl border border-slate-200 bg-white/90 shadow-sm">
              <div className="grid gap-px lg:grid-cols-2 lg:divide-x lg:divide-slate-200">
                <div className="p-4 lg:p-6">
                  <CardHeader className="pb-2 px-0">
                    <CardTitle className="text-base text-slate-900">
                      Visitors by country
                    </CardTitle>
                    <CardDescription className="text-sm text-muted-foreground">
                      Most active countries this range
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-2 px-0">
                    <AnalyticsValueList
                      items={countriesSorted.map((country) => ({
                        key: country.country,
                        value: country.visitors,
                        left: (
                          <>
                            <FlagIcon
                              code={country.code}
                              name={country.country}
                              variant="image"
                            />
                            <span className="font-medium text-slate-900 truncate">
                              {country.country}
                            </span>
                          </>
                        ),
                        right: (
                          <span className="text-xs font-semibold text-slate-700">
                            {formatPercentOneDecimal(
                              totalCountryVisitors > 0
                                ? (country.visitors / totalCountryVisitors) *
                                    100
                                : 0,
                            )}
                          </span>
                        ),
                      }))}
                      className="space-y-2"
                      emptyLabel="Not enough data for this range."
                      emptyClassName="flex h-24 items-center justify-center text-sm text-muted-foreground"
                      valueBarRowProps={valueBarRowProps}
                    />
                  </CardContent>
                </div>
                <div className="p-4 lg:p-6">
                  <CardHeader className="pb-2 px-0">
                    <CardTitle className="text-base text-slate-900">
                      Visitors by cities
                    </CardTitle>
                    <CardDescription className="text-sm text-muted-foreground">
                      Most active cities this range
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-2 px-0">
                    <AnalyticsValueList
                      items={citiesSorted.map((city) => ({
                        key: `${city.city}-${city.region}-${city.country}`,
                        value: city.visitors,
                        left: (
                          <>
                            <FlagIcon
                              code={city.code ?? undefined}
                              name={city.country ?? city.city}
                              variant="image"
                            />
                            <div className="min-w-0">
                              <span className="font-medium text-slate-900 truncate block">
                                {city.city}
                              </span>
                              <span className="text-xs text-slate-500 truncate">
                                {[city.region, city.country]
                                  .filter(Boolean)
                                  .join(", ")}
                              </span>
                            </div>
                          </>
                        ),
                        right: (
                          <span className="text-xs font-semibold text-slate-700">
                            {formatPercentOneDecimal(
                              totalCityVisitors > 0
                                ? (city.visitors / totalCityVisitors) * 100
                                : 0,
                            )}
                          </span>
                        ),
                      }))}
                      className="space-y-2"
                      emptyLabel="Not enough data for this range."
                      emptyClassName="flex h-24 items-center justify-center text-sm text-muted-foreground"
                      valueBarRowProps={valueBarRowProps}
                    />
                  </CardContent>
                </div>
              </div>
            </Card>
          ) : (
            <UpgradeRequiredCard
              title="Geography"
              description="Top countries and cities for this product"
              href={upgradeHref}
            />
          )}
        </div>
      }
    />
  )
}

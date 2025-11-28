import { notFound, redirect } from "next/navigation"
import {
  format,
  startOfDay,
  startOfWeek,
  startOfMonth,
  startOfYear,
  subDays,
  subMonths,
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
} from "@/lib/routes"
import {
  getProductAnalyticsRecord,
  resolveProductAnalyticsAccess,
} from "@/lib/server/analytics/productAnalytics"
import {
  type GaDateRange,
  getProductTrafficFromGa,
} from "@/lib/server/analytics/googleAnalytics"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"
import { ObjectPageLayout } from "@/components/layout/object-view/page-layout"
import { ProductAnalyticsRangeDropdown } from "@/components/molecules/ProductAnalyticsRangeDropdown"
import { AnalyticsPieChart } from "@/components/molecules/AnalyticsPieChart"
import { AnalyticsValueList } from "@/components/molecules/AnalyticsValueList"
import { AnalyticsListCard } from "@/components/molecules/AnalyticsListCard"
import { TrafficTimeseriesChart } from "@/components/molecules/TrafficTimeseriesChart"
import { Link2 } from "lucide-react"

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

function StatCard({
  title,
  value,
  helper,
}: {
  title: string
  value: string
  helper?: string
}) {
  return (
    <Card className="rounded-xl border border-slate-200 bg-white/90 shadow-sm">
      <CardHeader className="pb-2">
        <CardDescription className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
          {title}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-2xl font-semibold text-slate-900">{value}</div>
        {helper ? (
          <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
        ) : null}
      </CardContent>
    </Card>
  )
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
  const gaTraffic = await getProductTrafficFromGa({
    pagePaths: buildProductPagePaths(product.slug),
    dateRange: resolvedRange.dateRange,
    includeAdvanced: hasAdvancedAnalytics,
  })
  const upvotes = product.analytics?.upvotes ?? 0
  const formatter = new Intl.NumberFormat("en-US")
  const formatPercentOneDecimal = (value: number) =>
    formatPercent(value, { minimumFractionDigits: 1, maximumFractionDigits: 1 })

  const referrersSorted = [...gaTraffic.referrers].sort(
    (a, b) => b.views - a.views,
  )
  const browsersSorted = [...gaTraffic.browsers].sort(
    (a, b) => b.visitors - a.visitors,
  )
  const osSorted = [...gaTraffic.operatingSystems].sort(
    (a, b) => b.visitors - a.visitors,
  )
  const devicesSorted = [...gaTraffic.devices].sort(
    (a, b) => b.visitors - a.visitors,
  )
  const countriesSorted = [...gaTraffic.countries].sort(
    (a, b) => b.visitors - a.visitors,
  )
  const citiesSorted = [...gaTraffic.cities].sort(
    (a, b) => b.visitors - a.visitors,
  )
  const channelSorted = [...gaTraffic.referrerCategories].sort(
    (a, b) => b.views - a.views,
  )
  const showAdvanced = hasAdvancedAnalytics
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
          <div className="flex justify-end">
            <ProductAnalyticsRangeDropdown
              options={RANGE_OPTIONS}
              value={resolvedRange.key}
              defaultValue={DEFAULT_RANGE}
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <StatCard
              title="Page views"
              value={formatter.format(gaTraffic.pageViews)}
              helper={resolvedRange.label}
            />
            <StatCard
              title="Unique visitors"
              value={formatter.format(gaTraffic.uniqueVisitors)}
            />
            <StatCard
              title="Total sessions"
              value={formatter.format(gaTraffic.sessions)}
            />
            <StatCard
              title="Bounce rate"
              value={formatPercentOneDecimal(gaTraffic.bounceRate)}
            />
            <StatCard
              title="Avg. session duration"
              value={formatDuration(gaTraffic.averageSessionDuration)}
            />
            <StatCard title="Upvotes" value={formatter.format(upvotes)} />
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
                <CardTitle className="text-base text-slate-900">
                  Upvotes & reviews
                </CardTitle>
                <CardDescription className="text-sm text-muted-foreground">
                  Distribution for this range
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <AnalyticsPieChart
                  data={[
                    { label: "Upvotes", value: upvotes },
                    { label: "Reviews", value: 0 },
                  ]}
                  dataKey="value"
                  nameKey="label"
                  config={{
                    upvotes: { label: "Upvotes", color: "#0ea5e9" },
                    reviews: { label: "Reviews", color: "#6366f1" },
                  }}
                  cells={[
                    { fill: "#0ea5e9" },
                    { fill: "#6366f1" },
                  ]}
                  innerRadius={60}
                  outerRadius={80}
                  showLegend
                  className="border-none p-0 shadow-none"
                />
              </CardContent>
            </Card>
          </div>
          {showAdvanced ? (
            <>
              <div className="grid gap-4 lg:grid-cols-2">
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
              </div>
              <div className="grid gap-4 xl:grid-cols-3">
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
              </div>
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
                              {formatPercentOneDecimal(country.share)}
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
                                  {[city.region, city.country].filter(Boolean).join(", ")}
                                </span>
                              </div>
                            </>
                          ),
                          right: (
                            <span className="text-xs font-semibold text-slate-700">
                              {formatPercentOneDecimal(
                                gaTraffic.uniqueVisitors > 0
                                  ? (city.visitors / gaTraffic.uniqueVisitors) * 100
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
            </>
          ) : null}
        </div>
      }
    />
  )
}

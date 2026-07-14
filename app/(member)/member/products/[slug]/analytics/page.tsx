import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import {
  BrowserIcon,
  deviceIcon,
  FlagIcon,
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
import { getAnalyticsProvider } from "@/lib/server/analytics/store"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"
import { ObjectPageLayout } from "@/components/layout/object-view/page-layout"
import { Bot, MousePointer2, Sparkles, TrendingUp } from "lucide-react"

import { AnalyticsListCard } from "@/components/molecules/AnalyticsListCard"
import { AnalyticsMetricCard } from "@/components/molecules/AnalyticsMetricCard"
import { AnalyticsValueList } from "@/components/molecules/AnalyticsValueList"
import { AiCrawlerTimeseriesChart } from "@/components/molecules/AiCrawlerTimeseriesChart"
import { TrafficTimeseriesChart } from "@/components/molecules/TrafficTimeseriesChart"
import { Button } from "@/components/atoms/button"
import {
  ANALYTICS_REPORTING_WINDOW_LABEL,
  getAnalyticsReportingWindow,
  getPreviousAnalyticsReportingWindow,
} from "@/lib/analytics/reportingWindow"
import {
  buildProductAiCrawlerAttention,
  getProductAiCrawlerAttention,
  type ProductAiCrawlerAttention,
} from "@/lib/server/analytics/productAiCrawlerAttention"

function computeDelta(current: number, previous: number) {
  if (!Number.isFinite(previous) || previous === 0) return null
  return ((current - previous) / previous) * 100
}

function AiAnalyticsUpgradeCard({ href }: { href: string }) {
  return (
    <Card className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <CardHeader className="border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
            <Bot className="size-5" aria-hidden />
          </div>
          <div>
            <CardTitle className="text-base text-slate-900">
              AI crawler attention
            </CardTitle>
            <CardDescription className="mt-1 text-sm text-muted-foreground">
              Automated discovery activity for this product
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col items-start justify-between gap-5 p-5 sm:flex-row sm:items-center">
        <div className="max-w-2xl">
          <p className="text-sm font-medium text-slate-900">
            See how AI crawlers discover your product.
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Track crawler request volume, attention share, daily activity, and
            AI crawler types alongside browser and location insights.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href={href}>Unlock AI insights</Link>
        </Button>
      </CardContent>
    </Card>
  )
}

function ProductAiCrawlerAttentionCard({
  attention,
  rangeLabel,
}: {
  attention: ProductAiCrawlerAttention
  rangeLabel: string
}) {
  const formatter = new Intl.NumberFormat("en-US")
  const formatShare = (value: number) =>
    formatPercent(value, { maximumFractionDigits: 1 })
  const categoryMax = Math.max(
    1,
    ...attention.categories.map((category) => category.requests),
  )

  return (
    <Card className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <CardHeader className="border-b border-slate-100">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
              <Bot className="size-5" aria-hidden />
            </div>
            <div>
              <CardTitle className="text-base text-slate-900">
                AI crawler attention
              </CardTitle>
              <CardDescription className="mt-1 text-sm text-muted-foreground">
                {rangeLabel}
              </CardDescription>
            </div>
          </div>
          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-700">
            <Sparkles className="size-4" aria-hidden />
            Known AI crawler traffic
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid border-b border-slate-100 sm:grid-cols-3">
          <div className="p-5">
            <p className="text-xs font-medium text-slate-500">AI requests</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">
              {formatter.format(attention.totalRequests)}
            </p>
          </div>
          <div className="border-t border-slate-100 p-5 sm:border-l sm:border-t-0">
            <p className="text-xs font-medium text-slate-500">
              Share of product traffic
            </p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">
              {formatShare(attention.shareOfProductTraffic)}
            </p>
          </div>
          <div className="border-t border-slate-100 p-5 sm:border-l sm:border-t-0">
            <p className="text-xs font-medium text-slate-500">Active days</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">
              {formatter.format(attention.activeDays)}
            </p>
          </div>
        </div>
        <div className="grid lg:grid-cols-[1.5fr_1fr]">
          <div className="p-5 lg:border-r lg:border-slate-100">
            <p className="mb-3 text-sm font-semibold text-slate-900">
              Attention over time
            </p>
            <AiCrawlerTimeseriesChart points={attention.timeseries} />
          </div>
          <div className="border-t border-slate-100 p-5 lg:border-t-0">
            <p className="mb-3 text-sm font-semibold text-slate-900">
              AI crawler types
            </p>
            <AnalyticsValueList
              items={attention.categories.map((category) => ({
                key: category.category,
                value: category.requests,
                left: (
                  <span className="truncate font-medium text-slate-900">
                    {category.category}
                  </span>
                ),
                right: (
                  <span className="text-xs font-semibold text-slate-700">
                    {formatter.format(category.requests)}
                  </span>
                ),
                tone: "indigo" as const,
              }))}
              max={categoryMax}
              emptyLabel="No AI crawler activity in this range."
              emptyClassName="h-52"
              valueBarRowProps={{
                className: "bg-slate-50",
                barClassName: "bg-violet-300",
                minPercent: 6,
              }}
            />
          </div>
        </div>
        {attention.managedLabels.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-5 py-4">
            <span className="text-xs font-medium text-slate-500">
              Managed labels
            </span>
            {attention.managedLabels.map((label) => (
              <span
                key={label}
                className="rounded bg-violet-50 px-2 py-1 text-xs font-medium text-violet-700"
              >
                {label}
              </span>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

function buildProductPagePaths(slug: string) {
  const base = productPath(slug)
  return [base, `${base}/`]
}

export default async function ProductAnalyticsPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
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

  const reportingWindow = getAnalyticsReportingWindow()
  const previousWindow = getPreviousAnalyticsReportingWindow(reportingWindow)
  const analyticsProvider = getAnalyticsProvider("cache")

  const [traffic, previousTraffic] = await Promise.all([
    analyticsProvider.getProductTraffic({
      pagePaths: buildProductPagePaths(product.slug),
      dateRange: reportingWindow,
      includeAdvanced: hasAdvancedAnalytics,
    }),
    analyticsProvider.getProductTraffic({
      pagePaths: buildProductPagePaths(product.slug),
      dateRange: previousWindow,
      includeAdvanced: hasAdvancedAnalytics,
    }),
  ])
  const aiAttention = hasAdvancedAnalytics
    ? await getProductAiCrawlerAttention({
        productSlug: product.slug,
        dateRange: reportingWindow,
        totalProductRequests: traffic.pageViews,
      }).catch((error) => {
        console.error("[analytics] failed to load product AI attention", {
          productId: product.id,
          error,
        })
        return buildProductAiCrawlerAttention({
          rows: [],
          totalProductRequests: traffic.pageViews,
          dateRange: reportingWindow,
        })
      })
    : null
  const upvotes = product.analytics?.upvotes ?? 0
  const formatter = new Intl.NumberFormat("en-US")
  const formatPercentOneDecimal = (value: number) =>
    formatPercent(value, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  const metricDeltas = {
    views: computeDelta(traffic.pageViews, previousTraffic.pageViews),
    visits: computeDelta(
      traffic.uniqueVisitors,
      previousTraffic.uniqueVisitors,
    ),
  }

  const browsersSorted = traffic.browsers
  const osSorted = traffic.operatingSystems
  const devicesSorted = traffic.devices
  const countriesSorted = traffic.countries
  const totalCountryViews =
    traffic.pageViews > 0
      ? traffic.pageViews
      : countriesSorted.reduce((sum, country) => sum + country.visitors, 0)
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
        subtitle: "Analytics",
        showIdentifier: false,
      }}
      overview={[]}
      basePath={MEMBER_PRODUCTS_PATH.slice(1)}
      headingActionsLeft={null}
      relationships={
        <div className="space-y-6">
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <AnalyticsMetricCard
              label="Views"
              value={formatter.format(traffic.pageViews)}
              helper={`Page views · ${ANALYTICS_REPORTING_WINDOW_LABEL}`}
              delta={metricDeltas.views}
              icon={<TrendingUp className="h-4 w-4" aria-hidden />}
            />
            <AnalyticsMetricCard
              label="Visitors"
              value={formatter.format(traffic.uniqueVisitors)}
              helper={`Visits · ${ANALYTICS_REPORTING_WINDOW_LABEL}`}
              delta={metricDeltas.visits}
              icon={<MousePointer2 className="h-4 w-4" aria-hidden />}
            />
            <AnalyticsMetricCard
              label="Upvotes"
              value={formatter.format(upvotes)}
              helper="All time"
            />
          </div>
          <div>
            <Card className="rounded-xl border border-slate-200 bg-white/90 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-slate-900">
                  Views & visitors
                </CardTitle>
                <CardDescription className="text-sm text-muted-foreground">
                  {ANALYTICS_REPORTING_WINDOW_LABEL}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <TrafficTimeseriesChart
                  points={traffic.timeseries}
                  height={320}
                  emptyLabel="Not enough data for this range."
                  emptyClassName="flex h-80 items-center justify-center text-sm text-muted-foreground"
                  className="rounded-lg border border-slate-100 bg-white"
                />
              </CardContent>
            </Card>
          </div>
          {aiAttention ? (
            <ProductAiCrawlerAttentionCard
              attention={aiAttention}
              rangeLabel={ANALYTICS_REPORTING_WINDOW_LABEL}
            />
          ) : (
            <AiAnalyticsUpgradeCard href={upgradeHref} />
          )}
          {showAdvanced ? (
            <>
              <div className="grid gap-4 xl:grid-cols-3">
                <AnalyticsListCard
                  title="Top operating systems"
                  description="Most used operating systems"
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
                          traffic.pageViews > 0
                            ? (os.visitors / traffic.pageViews) * 100
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
                  description="Most used device types"
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
                          traffic.pageViews > 0
                            ? (device.visitors / traffic.pageViews) * 100
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
                  description="Most used browsers"
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
                          traffic.pageViews > 0
                            ? (browser.visitors / traffic.pageViews) * 100
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
              <Card className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="p-4 lg:p-6">
                  <CardHeader className="pb-2 px-0">
                    <CardTitle className="text-base text-slate-900">
                      Visits by country
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
                              totalCountryViews > 0
                                ? (country.visitors / totalCountryViews) * 100
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
              </Card>
            </>
          ) : null}
        </div>
      }
    />
  )
}

import { Suspense } from "react"
import { connection } from "next/server"
import { format } from "date-fns"

import {
  AnalyticsPublicDashboard,
  type PublicAnalyticsRankedItem,
} from "@/components/molecules/AnalyticsPublicDashboard"
import { CoreStructuredData } from "@/components/seo/CoreStructuredData"
import prisma from "@/lib/prisma"
import { buildPageMetadata } from "@/lib/metadata"
import { ANALYTICS_PATH, HOME_PATH, productPath } from "@/lib/routes"
import { cacheGetOrSet } from "@/lib/server/cache"
import { getAnalyticsProvider } from "@/lib/server/analytics/store"
import { buildPublicDiscoveryProductWhere } from "@/lib/products/public-discovery"
import { BRAND_NAME } from "@/lib/brand"
import {
  ANALYTICS_REPORTING_WINDOW_DAYS,
  getAnalyticsReportingWindow,
  getPreviousAnalyticsReportingWindow,
} from "@/lib/analytics/reportingWindow"

const PAGE_TITLE = "Analytics"
const ANALYTICS_PAGE_TOP_PRODUCT_LIMIT = 8
const ANALYTICS_PAGE_CACHE_TTL_SECONDS = 60 * 60 * 24

function computeDelta(current: number, previous: number) {
  if (!Number.isFinite(previous) || previous === 0) return null
  return ((current - previous) / previous) * 100
}

export const metadata = buildPageMetadata({
  title: PAGE_TITLE,
  description: `See ${BRAND_NAME}'s traffic volume, visits, hourly activity, browser traffic, verified bots and crawlers, geography, and device traffic.`,
  canonical: ANALYTICS_PATH,
})

async function getCachedAnalyticsPageData({
  rangeStartDate,
  rangeEndDate,
  prevRangeStartDate,
  prevRangeEndDate,
}: {
  rangeStartDate: string
  rangeEndDate: string
  prevRangeStartDate: string
  prevRangeEndDate: string
}) {
  return cacheGetOrSet({
    key: [
      "analytics:page:traffic-snapshot:v7",
      `${ANALYTICS_REPORTING_WINDOW_DAYS}d`,
      rangeStartDate,
      rangeEndDate,
      prevRangeStartDate,
      prevRangeEndDate,
      `top${ANALYTICS_PAGE_TOP_PRODUCT_LIMIT}`,
    ],
    ttlSeconds: ANALYTICS_PAGE_CACHE_TTL_SECONDS,
    onError: (error) => {
      console.error("[analytics] failed to read/write page cache", { error })
    },
    loader: async () => {
      const analyticsProvider = getAnalyticsProvider("cache")
      const [snapshot, previousSnapshot] = await Promise.all([
        analyticsProvider.getSiteAnalyticsSnapshot({
          topProductLimit: ANALYTICS_PAGE_TOP_PRODUCT_LIMIT,
          dateRange: {
            startDate: rangeStartDate,
            endDate: rangeEndDate,
          },
        }),
        analyticsProvider.getSiteAnalyticsSnapshot({
          topProductLimit: ANALYTICS_PAGE_TOP_PRODUCT_LIMIT,
          dateRange: {
            startDate: prevRangeStartDate,
            endDate: prevRangeEndDate,
          },
        }),
      ])

      const productSlugs = snapshot.topProductPages
        .map((page) => page.slug?.toLowerCase())
        .filter((slug): slug is string => Boolean(slug))
      const products =
        productSlugs.length > 0
          ? await prisma.product.findMany({
              where: buildPublicDiscoveryProductWhere({
                slug: { in: productSlugs },
              }),
              select: { slug: true, name: true },
            })
          : []
      const productMap = new Map(
        products.map((product) => [product.slug.toLowerCase(), product]),
      )
      const topProducts = snapshot.topProductPages.flatMap((page) => {
        const slug = page.slug?.toLowerCase()
        const product = slug ? productMap.get(slug) : null
        if (!slug || !product) return []
        return [{ ...page, slug: product.slug, name: product.name }]
      })

      return { snapshot, previousSnapshot, topProducts }
    },
  })
}

function PageFallback() {
  return (
    <div className="min-h-[720px] bg-[#f5f6f8]">
      <div className="mx-auto max-w-[1480px] animate-pulse px-3 py-5 sm:px-5 lg:px-6">
        <div className="mb-4 h-12 w-56 rounded-md bg-[#e6e9ed]" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div
              key={index}
              className="h-[158px] rounded-lg border border-[#dfe3e8] bg-white"
            />
          ))}
        </div>
        <div className="mt-3 h-[375px] rounded-lg border border-[#dfe3e8] bg-white" />
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<PageFallback />}>
      <AnalyticsPageContent />
    </Suspense>
  )
}

async function AnalyticsPageContent() {
  await connection()

  const reportingWindow = getAnalyticsReportingWindow()
  const previousReportingWindow =
    getPreviousAnalyticsReportingWindow(reportingWindow)

  const [{ snapshot, previousSnapshot, topProducts }, recentViews] =
    await Promise.all([
      getCachedAnalyticsPageData({
        rangeStartDate: reportingWindow.startDate,
        rangeEndDate: reportingWindow.endDate,
        prevRangeStartDate: previousReportingWindow.startDate,
        prevRangeEndDate: previousReportingWindow.endDate,
      }),
      getAnalyticsProvider("cache").getRealtimeVisitors(),
    ])

  const currentRatio =
    snapshot.sessions > 0 ? snapshot.pageViews / snapshot.sessions : 0
  const previousRatio =
    previousSnapshot.sessions > 0
      ? previousSnapshot.pageViews / previousSnapshot.sessions
      : 0
  const products: PublicAnalyticsRankedItem[] = topProducts.map((product) => ({
    key: product.path,
    label: product.name,
    value: product.pageViews,
    href: productPath(product.slug),
  }))

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
      <AnalyticsPublicDashboard
        windowDays={reportingWindow.days}
        rangeLabel={`${format(reportingWindow.start, "MMM d")} - ${format(
          reportingWindow.end,
          "MMM d, yyyy",
        )}`}
        updatedAt={format(new Date(), "MMM d, h:mm a")}
        requests={snapshot.pageViews}
        visits={snapshot.sessions}
        requestsDelta={computeDelta(
          snapshot.pageViews,
          previousSnapshot.pageViews,
        )}
        visitsDelta={computeDelta(snapshot.sessions, previousSnapshot.sessions)}
        ratioDelta={computeDelta(currentRatio, previousRatio)}
        initialRecentViews={recentViews}
        points={snapshot.timeseries.map((point) => ({
          date: point.date,
          label: point.label,
          requests: point.pageViews,
          visits: point.uniqueVisitors,
        }))}
        hourlyActivity={snapshot.hourlyActivity}
        products={products}
        countries={snapshot.countries.map((country) => ({
          key: `${country.code ?? ""}:${country.country}`,
          label: country.country,
          value: country.visitors,
          code: country.code,
        }))}
        trafficComposition={{
          ...snapshot.trafficComposition,
          verifiedCategories:
            snapshot.trafficComposition.verifiedCategories.map((category) => ({
              key: category.category,
              label: category.category,
              value: category.requests,
            })),
        }}
        browsers={snapshot.browsers.map((browser) => ({
          key: browser.browser,
          label: browser.browser,
          value: browser.visitors,
        }))}
        operatingSystems={snapshot.operatingSystems.map((os) => ({
          key: os.os,
          label: os.os,
          value: os.visitors,
        }))}
        devices={snapshot.devices.map((device) => ({
          key: device.deviceCategory,
          label: device.deviceCategory,
          value: device.visitors,
        }))}
      />
    </>
  )
}

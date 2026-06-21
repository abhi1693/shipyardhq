import Link from "next/link"
import type { ReactNode } from "react"
import { format, subDays } from "date-fns"
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  Building2,
  Clock3,
  Compass,
  Globe2,
  Link2,
  Monitor,
  MousePointer2,
  Navigation,
  Smartphone,
  Sparkles,
  Star,
  TrendingUp,
  User,
  Zap,
} from "lucide-react"

import {
  BrowserIcon,
  FlagIcon,
  formatDuration,
  formatPercent,
  OsIcon,
} from "@/components/molecules/AnalyticsShared"
import { LiveVisitorsPill } from "@/components/molecules/LiveVisitorsPill"
import { CoreStructuredData } from "@/components/seo/CoreStructuredData"
import prisma from "@/lib/prisma"
import { buildPageMetadata } from "@/lib/metadata"
import {
  ANALYTICS_PATH,
  HOME_PATH,
  LEGAL_PRIVACY_PATH,
  productPath,
} from "@/lib/routes"
import { cacheGetOrSet } from "@/lib/server/cache"
import { getAnalyticsProvider } from "@/lib/server/analytics/store"
import { siteConfig } from "@/lib/siteConfig"
import { BRAND_NAME } from "@/lib/brand"
import { cn } from "@/lib/utils"

const PAGE_TITLE = "Analytics"
export const revalidate = 300

const ANALYTICS_PAGE_TOP_PRODUCT_LIMIT = 8
const ANALYTICS_PAGE_CACHE_TTL_SECONDS = 60 * 60 * 24
const ANALYTICS_PAGE_IN_PROCESS_TTL_MS = 60_000
const numberFormatter = new Intl.NumberFormat("en-US")

function computeDelta(current: number, previous: number) {
  if (!Number.isFinite(previous) || previous === 0) return null
  return ((current - previous) / previous) * 100
}

function referrerLabel(value: string) {
  if (value === "direct" || value === "Direct / none") return "(direct)"
  const cleaned = value
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .trim()
  const domain = cleaned.split(/[/#?]/)[0]
  return domain || value
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.min(100, Math.max(0, value))
}

function formatDelta(value: number | null) {
  if (value == null || !Number.isFinite(value)) return "Last 30d"
  const sign = value > 0 ? "+" : ""
  return `${sign}${value.toFixed(1)}%`
}

function titleCase(value: string) {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => `${word[0]?.toUpperCase() ?? ""}${word.slice(1)}`)
    .join(" ")
}

function MetricCard({
  label,
  value,
  delta,
  icon,
}: {
  label: string
  value: string
  delta: number | null
  icon: ReactNode
}) {
  const isPositive = delta == null || delta >= 0
  const TrendIcon = isPositive ? ArrowUp : ArrowDown

  return (
    <div className="group rounded-lg border border-[#E2E8F0] bg-white p-5 transition-all hover:border-[#0051d5] hover:shadow-md">
      <div className="mb-2 flex items-start justify-between gap-3">
        <span className="text-xs font-semibold text-[#43474c] group-hover:text-black">
          {label}
        </span>
        <span className="text-[#74777d]">{icon}</span>
      </div>
      <div className="text-2xl font-semibold leading-8 text-[#0b1c30]">
        {value}
      </div>
      <div
        className={cn(
          "mt-1 flex items-center gap-1 text-xs font-semibold",
          isPositive ? "text-[#16a34a]" : "text-[#ba1a1a]",
        )}
      >
        <TrendIcon className="size-3" aria-hidden />
        <span>{formatDelta(delta)}</span>
      </div>
    </div>
  )
}

function SmallMetricCard({
  label,
  value,
  delta,
  icon,
}: {
  label: string
  value: string
  delta: number | null
  icon: ReactNode
}) {
  return (
    <div className="rounded-lg border border-[#E2E8F0] bg-white p-5">
      <div className="mb-2 flex items-start justify-between gap-3">
        <span className="text-xs font-semibold text-[#43474c]">{label}</span>
        <span className="text-[#74777d]">{icon}</span>
      </div>
      <div className="text-lg font-semibold leading-6 text-[#0b1c30]">
        {value}
      </div>
      <div
        className={cn(
          "mt-1 text-xs font-semibold",
          delta == null || delta >= 0 ? "text-[#16a34a]" : "text-[#ba1a1a]",
        )}
      >
        {formatDelta(delta)}
      </div>
    </div>
  )
}

function TrafficSnapshotChart({
  points,
}: {
  points: Array<{
    label: string
    pageViews: number
    uniqueVisitors: number
  }>
}) {
  const visiblePoints = points.slice(-15)
  const maxValue = Math.max(
    1,
    ...visiblePoints.map((point) =>
      Math.max(point.pageViews, point.uniqueVisitors),
    ),
  )
  const hasTraffic = visiblePoints.some(
    (point) => point.pageViews > 0 || point.uniqueVisitors > 0,
  )

  return (
    <div className="flex h-full flex-col justify-between rounded-lg border border-[#E2E8F0] bg-white p-6 pb-20 md:pb-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold leading-6 text-[#0b1c30]">
          Visitors vs Page Views
        </h2>
        <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-[#43474c]">
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-[#0051d5]" />
            Page views
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-[#16a34a]" />
            Visitors
          </div>
        </div>
      </div>

      {hasTraffic ? (
        <div className="relative flex h-48 w-full items-end justify-between gap-1 overflow-visible pt-4">
          <div
            className="pointer-events-none absolute inset-0 flex flex-col justify-between opacity-10"
            aria-hidden
          >
            <div className="border-t border-[#0b1c30]" />
            <div className="border-t border-[#0b1c30]" />
            <div className="border-t border-[#0b1c30]" />
            <div className="border-t border-[#0b1c30]" />
          </div>
          {visiblePoints.map((point, index) => {
            const pageViewsHeight = clampPercent(
              (point.pageViews / maxValue) * 100,
            )
            const visitorsHeight = clampPercent(
              (point.uniqueVisitors / maxValue) * 100,
            )
            const tooltipId = `traffic-tooltip-${index}`
            const tooltipPositionClass =
              index < 2
                ? "left-0"
                : index > visiblePoints.length - 3
                  ? "right-0"
                  : "left-1/2 -translate-x-1/2"

            return (
              <div
                key={`${point.label}-${point.pageViews}-${point.uniqueVisitors}`}
                className="group relative h-full flex-1 rounded-t outline-none focus-visible:ring-2 focus-visible:ring-[#0051d5]/40"
                tabIndex={0}
                aria-describedby={tooltipId}
                aria-label={`${point.label}: ${numberFormatter.format(
                  point.pageViews,
                )} page views and ${numberFormatter.format(
                  point.uniqueVisitors,
                )} visitors`}
              >
                <div
                  className="absolute bottom-0 left-0 right-0 rounded-t bg-[#0051d5]/10 transition-colors group-hover:bg-[#0051d5]/20 group-focus-visible:bg-[#0051d5]/20"
                  style={{ height: `${Math.max(6, pageViewsHeight)}%` }}
                />
                <div
                  className="absolute bottom-0 left-0 right-0 rounded-t bg-[#16a34a]/60 transition-colors group-hover:bg-[#16a34a] group-focus-visible:bg-[#16a34a]"
                  style={{ height: `${Math.max(8, visitorsHeight)}%` }}
                />
                <div
                  id={tooltipId}
                  role="tooltip"
                  className={cn(
                    "pointer-events-none absolute top-2 z-20 hidden w-max min-w-40 rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-left shadow-lg group-hover:block group-focus-visible:block",
                    tooltipPositionClass,
                  )}
                >
                  <div className="mb-1 text-xs font-semibold text-[#0b1c30]">
                    {point.label}
                  </div>
                  <div className="flex items-center justify-between gap-5 text-[11px] leading-[14px] text-[#43474c]">
                    <span className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-[#0051d5]" />
                      Page views
                    </span>
                    <span className="font-semibold text-[#0b1c30]">
                      {numberFormatter.format(point.pageViews)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-5 text-[11px] leading-[14px] text-[#43474c]">
                    <span className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-[#16a34a]" />
                      Visitors
                    </span>
                    <span className="font-semibold text-[#0b1c30]">
                      {numberFormatter.format(point.uniqueVisitors)}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-[#E2E8F0] text-sm text-[#74777d]">
          Not enough data yet.
        </div>
      )}

      <div className="mt-4 flex justify-between px-1 text-[11px] font-medium leading-[14px] text-[#74777d]">
        {visiblePoints.length > 0 ? (
          <>
            <span>{visiblePoints[0]?.label}</span>
            <span>
              {visiblePoints[Math.floor(visiblePoints.length / 3)]?.label}
            </span>
            <span>
              {visiblePoints[Math.floor((visiblePoints.length * 2) / 3)]?.label}
            </span>
            <span>{visiblePoints[visiblePoints.length - 1]?.label}</span>
          </>
        ) : (
          <span>Last 30 days</span>
        )}
      </div>
    </div>
  )
}

function ShareBar({
  value,
  color = "bg-[#0051d5]",
  track = "bg-[#eff4ff]",
  className,
}: {
  value: number
  color?: string
  track?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        "h-1.5 w-full overflow-hidden rounded-full",
        track,
        className,
      )}
    >
      <div
        className={cn("h-full rounded-full", color)}
        style={{ width: `${clampPercent(value)}%` }}
      />
    </div>
  )
}

function SectionCard({
  title,
  icon,
  children,
  className,
}: {
  title: string
  icon?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-lg border border-[#E2E8F0] bg-white p-6",
        className,
      )}
    >
      <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold leading-6 text-[#0b1c30]">
        {icon ? <span className="text-[#0051d5]">{icon}</span> : null}
        {title}
      </h3>
      {children}
    </div>
  )
}

function EmptyList({ label }: { label: string }) {
  return (
    <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-[#E2E8F0] text-sm text-[#74777d]">
      {label}
    </div>
  )
}

function ProductPagesCard({
  products,
  totalViews,
}: {
  products: Array<{
    path: string
    slug: string | null
    pageViews: number
    name: string
  }>
  totalViews: number
}) {
  return (
    <SectionCard
      title="Product Pages"
      icon={<Star className="size-4" aria-hidden />}
    >
      {products.length > 0 ? (
        <div className="space-y-4">
          {products.slice(0, 4).map((product) => {
            const share =
              totalViews > 0 ? (product.pageViews / totalViews) * 100 : 0
            const content = (
              <>
                <div className="mb-1 flex items-start justify-between gap-3">
                  <span className="truncate pr-2 text-xs font-semibold text-[#0b1c30] group-hover:text-[#0051d5]">
                    {product.name}
                  </span>
                  <span className="shrink-0 text-[11px] font-bold leading-[14px] text-[#0b1c30]">
                    {formatPercent(share)}
                  </span>
                </div>
                <ShareBar value={share} className="mt-2 h-1" />
              </>
            )

            return product.slug ? (
              <Link
                key={product.path}
                href={productPath(product.slug)}
                className="group block"
              >
                {content}
              </Link>
            ) : (
              <div key={product.path} className="group">
                {content}
              </div>
            )
          })}
        </div>
      ) : (
        <EmptyList label="No product traffic recorded in this window yet." />
      )}
    </SectionCard>
  )
}

function ReferrersCard({
  referrers,
}: {
  referrers: Array<{ referrer: string; share: number }>
}) {
  return (
    <SectionCard
      title="Referrers"
      icon={<Link2 className="size-4" aria-hidden />}
    >
      {referrers.length > 0 ? (
        <div className="space-y-4">
          {referrers.slice(0, 4).map((referrer) => (
            <div
              key={referrer.referrer}
              className="group flex items-center justify-between gap-3"
            >
              <span className="truncate text-xs font-semibold text-[#0b1c30] group-hover:text-[#0051d5]">
                {referrerLabel(referrer.referrer)}
              </span>
              <div className="flex shrink-0 items-center gap-3">
                <span className="text-[11px] font-medium leading-[14px] text-[#74777d]">
                  {formatPercent(referrer.share)}
                </span>
                <ShareBar value={referrer.share} className="w-16" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyList label="Waiting for referral data." />
      )}
    </SectionCard>
  )
}

function CountriesCard({
  countries,
}: {
  countries: Array<{
    country: string
    code?: string | null
    share: number
  }>
}) {
  return (
    <SectionCard
      title="Countries"
      icon={<Globe2 className="size-4" aria-hidden />}
    >
      {countries.length > 0 ? (
        <div className="space-y-4">
          {countries.slice(0, 4).map((country) => (
            <div
              key={country.country}
              className="flex items-center justify-between gap-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <FlagIcon
                  code={country.code}
                  name={country.country}
                  className="shrink-0"
                />
                <span className="truncate text-xs font-semibold text-[#0b1c30]">
                  {country.country}
                </span>
              </div>
              <span className="shrink-0 text-[11px] font-bold leading-[14px] text-[#0b1c30]">
                {formatPercent(country.share)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <EmptyList label="No country data yet." />
      )}
    </SectionCard>
  )
}

function CitiesCard({
  cities,
}: {
  cities: Array<{
    city: string
    region?: string | null
    country?: string | null
    share: number
  }>
}) {
  return (
    <SectionCard
      title="Cities"
      icon={<Building2 className="size-4" aria-hidden />}
    >
      {cities.length > 0 ? (
        <div className="space-y-4">
          {cities.slice(0, 4).map((city) => (
            <div
              key={`${city.city}-${city.region ?? ""}-${city.country ?? ""}`}
            >
              <div className="mb-1 flex items-center justify-between gap-3">
                <span className="truncate text-xs font-semibold text-[#0b1c30]">
                  {city.city}
                </span>
                <span className="shrink-0 text-[11px] font-bold leading-[14px] text-[#0b1c30]">
                  {formatPercent(city.share)}
                </span>
              </div>
              <p className="truncate text-[10px] font-semibold uppercase leading-[14px] tracking-[0.02em] text-[#74777d]">
                {[city.region, city.country].filter(Boolean).join(" - ") ||
                  "Location not set"}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <EmptyList label="No city data yet." />
      )}
    </SectionCard>
  )
}

function SystemStatsCard({
  title,
  items,
}: {
  title: string
  items: Array<{
    key: string
    label: string
    share: number
    icon: ReactNode
  }>
}) {
  return (
    <SectionCard title={title}>
      {items.length > 0 ? (
        <div className="space-y-5">
          {items.slice(0, 3).map((item) => (
            <div key={item.key} className="flex items-center gap-4">
              <span className="flex size-5 shrink-0 items-center justify-center text-[#0051d5]">
                {item.icon}
              </span>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center justify-between gap-3">
                  <span className="truncate text-xs font-semibold text-[#0b1c30]">
                    {item.label}
                  </span>
                  <span className="shrink-0 text-[11px] font-medium leading-[14px] text-[#43474c]">
                    {formatPercent(item.share)}
                  </span>
                </div>
                <ShareBar value={item.share} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyList label={`No ${title.toLowerCase()} data yet.`} />
      )}
    </SectionCard>
  )
}

function NewVsReturningCard({
  newVisitorShare,
  returningVisitorShare,
}: {
  newVisitorShare: number
  returningVisitorShare: number
}) {
  return (
    <div className="rounded-lg border border-[#E2E8F0] bg-white p-6">
      <h2 className="mb-6 text-lg font-semibold leading-6 text-[#0b1c30]">
        New vs Returning
      </h2>
      <div className="space-y-6">
        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-sm text-[#0b1c30]">
              <span className="size-2 rounded-full bg-[#0051d5]" />
              New
            </span>
            <span className="text-xs font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">
              {formatPercent(newVisitorShare)}
            </span>
          </div>
          <ShareBar value={newVisitorShare} className="h-2" />
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-sm text-[#0b1c30]">
              <span className="size-2 rounded-full bg-[#c4c6cd]" />
              Returning
            </span>
            <span className="text-xs font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">
              {formatPercent(returningVisitorShare)}
            </span>
          </div>
          <ShareBar
            value={returningVisitorShare}
            color="bg-[#c4c6cd]"
            className="h-2"
          />
        </div>
      </div>
    </div>
  )
}

export const metadata = buildPageMetadata({
  title: PAGE_TITLE,
  description: `Track launch performance on ${BRAND_NAME} with product views, referrers, traffic sources, top apps, and engagement signals.`,
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
      "analytics:page:traffic-snapshot:v1",
      rangeStartDate,
      rangeEndDate,
      prevRangeStartDate,
      prevRangeEndDate,
      `top${ANALYTICS_PAGE_TOP_PRODUCT_LIMIT}`,
    ],
    ttlSeconds: ANALYTICS_PAGE_CACHE_TTL_SECONDS,
    inProcessTtlMs: ANALYTICS_PAGE_IN_PROCESS_TTL_MS,
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
              where: { slug: { in: productSlugs } },
              select: {
                slug: true,
                name: true,
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
        }
      })

      return { snapshot, previousSnapshot, topProducts }
    },
  })
}

export default async function AnalyticsPage() {
  const rangeEnd = subDays(new Date(), 1)
  const rangeStart = subDays(rangeEnd, 29)
  const prevRangeEnd = subDays(rangeStart, 1)
  const prevRangeStart = subDays(prevRangeEnd, 29)
  const rangeStartDate = format(rangeStart, "yyyy-MM-dd")
  const rangeEndDate = format(rangeEnd, "yyyy-MM-dd")
  const prevRangeStartDate = format(prevRangeStart, "yyyy-MM-dd")
  const prevRangeEndDate = format(prevRangeEnd, "yyyy-MM-dd")
  const analyticsProvider = getAnalyticsProvider("cache")

  const [{ snapshot, previousSnapshot, topProducts }, realtimeVisitors] =
    await Promise.all([
      getCachedAnalyticsPageData({
        rangeStartDate,
        rangeEndDate,
        prevRangeStartDate,
        prevRangeEndDate,
      }),
      analyticsProvider.getRealtimeVisitors(),
    ])

  const rangeLabel = `${format(rangeStart, "MMM d")} - ${format(
    rangeEnd,
    "MMM d, yyyy",
  )}`
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
  }

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
      <div className="bg-[#f8f9ff] text-[#0b1c30]">
        <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6">
          <header className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h1 className="text-2xl font-bold leading-8 text-[#0b1c30] sm:text-[32px] sm:leading-10">
                {siteConfig.name} Traffic Snapshot
              </h1>
              <p className="mt-1 text-sm leading-5 text-[#43474c]">
                {rangeLabel}
              </p>
            </div>
            <LiveVisitorsPill initialVisitors={realtimeVisitors} />
          </header>

          <section className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-5">
            <MetricCard
              label="Views"
              value={numberFormatter.format(snapshot.pageViews)}
              delta={deltas.views}
              icon={<BarChart3 className="size-5" aria-hidden />}
            />
            <MetricCard
              label="Visits"
              value={numberFormatter.format(snapshot.sessions)}
              delta={deltas.sessions}
              icon={<Navigation className="size-5" aria-hidden />}
            />
            <MetricCard
              label="Visitors"
              value={numberFormatter.format(snapshot.uniqueVisitors)}
              delta={deltas.visitors}
              icon={<User className="size-5" aria-hidden />}
            />
            <MetricCard
              label="Bounce rate"
              value={formatPercent(snapshot.bounceRate)}
              delta={deltas.bounce}
              icon={<TrendingUp className="size-5" aria-hidden />}
            />
            <MetricCard
              label="Visit duration"
              value={formatDuration(snapshot.averageSessionDuration, {
                padMinutes: true,
              })}
              delta={deltas.duration}
              icon={<Clock3 className="size-5" aria-hidden />}
            />
          </section>

          <section className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-12">
            <div className="space-y-3 md:col-span-3">
              <SmallMetricCard
                label="Pages per session"
                value={snapshot.pagesPerSession.toFixed(2)}
                delta={deltas.pagesPerSession}
                icon={<Compass className="size-5" aria-hidden />}
              />
              <SmallMetricCard
                label="Engaged session rate"
                value={formatPercent(snapshot.engagementRate)}
                delta={deltas.engagementRate}
                icon={<Zap className="size-5" aria-hidden />}
              />
            </div>
            <div className="md:col-span-6">
              <TrafficSnapshotChart points={snapshot.timeseries} />
            </div>
            <div className="md:col-span-3">
              <NewVsReturningCard
                newVisitorShare={newVisitorShare}
                returningVisitorShare={returningVisitorShare}
              />
            </div>
          </section>

          <section className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-4">
            <ProductPagesCard
              products={topProducts}
              totalViews={totalProductViews}
            />
            <ReferrersCard referrers={snapshot.referrers} />
            <CountriesCard countries={snapshot.countries} />
            <CitiesCard cities={snapshot.cities} />
          </section>

          <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <SystemStatsCard
              title="Browsers"
              items={snapshot.browsers.map((browser) => ({
                key: browser.browser,
                label: browser.browser,
                share: browser.share,
                icon: <BrowserIcon name={browser.browser} />,
              }))}
            />
            <SystemStatsCard
              title="Operating Systems"
              items={snapshot.operatingSystems.map((os) => ({
                key: os.os,
                label: os.os,
                share: os.share,
                icon: <OsIcon name={os.os} />,
              }))}
            />
            <SystemStatsCard
              title="Devices"
              items={snapshot.devices.map((device) => ({
                key: device.deviceCategory,
                label: titleCase(device.deviceCategory),
                share: device.share,
                icon: device.deviceCategory.toLowerCase().includes("mobile") ? (
                  <Smartphone className="size-4" aria-hidden />
                ) : device.deviceCategory.toLowerCase().includes("desktop") ? (
                  <Monitor className="size-4" aria-hidden />
                ) : (
                  <MousePointer2 className="size-4" aria-hidden />
                ),
              }))}
            />
          </section>

          <p className="mt-6 text-center text-[11px] font-medium leading-[14px] text-[#74777d]">
            Data is aggregated/anonymized and excludes PII. Admin/internal
            traffic is filtered out. See our{" "}
            <Link
              href={LEGAL_PRIVACY_PATH}
              className="underline underline-offset-2 hover:text-[#0051d5]"
            >
              Privacy Policy
            </Link>
            .
          </p>

          <div className="mt-4 flex justify-center gap-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-[#74777d]">
            <Sparkles className="size-4 text-[#0051d5]" aria-hidden />
            <span>Updated {new Date().toLocaleString()}</span>
          </div>
        </div>
      </div>
    </>
  )
}

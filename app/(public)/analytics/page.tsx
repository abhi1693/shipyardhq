import type { ReactNode } from "react"
import { format, subDays } from "date-fns"
import {
  Activity,
  Globe2,
  Clock3,
  Laptop,
  Monitor,
  MousePointer2,
  MapPin,
  Smartphone,
  Tablet,
  TrendingUp,
  Users,
} from "lucide-react"

import { AnalyticsLineChart } from "@/components/molecules/AnalyticsLineChart"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"
import { LiveVisitorsPill } from "@/components/molecules/LiveVisitorsPill"
import { CoreStructuredData } from "@/components/seo/CoreStructuredData"
import prisma from "@/lib/prisma"
import { buildPageMetadata } from "@/lib/metadata"
import { ANALYTICS_PATH, HOME_PATH } from "@/lib/routes"
import {
  getRealtimeVisitorsFromGa,
  getSiteAnalyticsSnapshot,
} from "@/lib/server/analytics/googleAnalytics"
import { siteConfig } from "@/lib/siteConfig"

const PAGE_TITLE = "Analytics"
export const revalidate = 300

const numberFormatter = new Intl.NumberFormat("en-US")
const percentFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
})

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "—"
  const total = Math.round(seconds)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = total % 60
  if (hours > 0) return `${hours}h ${minutes.toString().padStart(2, "0")}m`
  if (minutes > 0) return `${minutes}m ${secs.toString().padStart(2, "0")}s`
  return `${secs}s`
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) return "—"
  return `${percentFormatter.format(value)}%`
}

function computeDelta(current: number, previous: number) {
  if (!Number.isFinite(previous) || previous === 0) return null
  const delta = ((current - previous) / previous) * 100
  return delta
}

function flagEmoji(code?: string | null) {
  if (!code || code.length !== 2) return "🌐"
  const upper = code.toUpperCase()
  const first = upper.codePointAt(0)
  const second = upper.codePointAt(1)
  if (!first || !second) return "🌐"
  return String.fromCodePoint(0x1f1e6 + (first - 65), 0x1f1e6 + (second - 65))
}

function FlagIcon({ code, name }: { code?: string | null; name: string }) {
  const emoji = flagEmoji(code)
  return (
    <span className="text-lg" title={name} aria-label={name}>
      {emoji}
    </span>
  )
}

function BrowserIcon({ name }: { name: string }) {
  const key = name.toLowerCase()
  if (key.includes("chrome")) {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4">
        <circle cx="12" cy="12" r="10" fill="#ea4335" />
        <path d="M12 12 6 6a10 10 0 0 1 12 2" fill="#fbbc04" />
        <path d="M12 12 6 18a10 10 0 0 1-1-12" fill="#34a853" />
        <circle cx="12" cy="12" r="4" fill="#fff" />
        <circle cx="12" cy="12" r="2.6" fill="#4285f4" />
      </svg>
    )
  }
  if (key.includes("safari")) {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4">
        <circle cx="12" cy="12" r="10" fill="#0ea5e9" />
        <polygon points="12,5 9,15 12,12 15,9" fill="#fff" />
        <polygon points="12,19 15,9 12,12 9,15" fill="#f43f5e" />
      </svg>
    )
  }
  if (key.includes("firefox")) {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4">
        <path
          d="M12 2c5.5 0 9.5 4.3 9 9.5-.5 5.2-5 8.5-9.7 8.5-5 0-8.9-3.7-8.9-8.5C2.4 8.2 5 5 8 4c-.2.7-.2 1.7.4 2.5 1.2-1.3 2.8-1.9 4.8-1.9Z"
          fill="#f97316"
        />
        <path d="M9 7c-.4 1.4.3 2.6 1.6 3 1.7.6 3.5-.6 3.6-2.4" fill="#fbbf24" />
      </svg>
    )
  }
  if (key.includes("edge")) {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4">
        <path
          d="M4 15c0-5.5 6.5-9.5 12-6.6-.7-.2-1.6-.2-2.5.3C11 10.5 10.2 14 12 16c-3 0-5-.5-5-3Z"
          fill="#0ea5e9"
        />
        <path d="M12 16c0 2.5 2.2 4 4.5 4 2.3 0 3.8-1.3 4.5-3.5" fill="#22c55e" />
      </svg>
    )
  }
  if (key.includes("opera")) {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4">
        <circle cx="12" cy="12" r="10" fill="#e60023" />
        <ellipse cx="12" cy="12" rx="4" ry="7" fill="#fff" />
      </svg>
    )
  }
  if (key.includes("brave")) {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4">
        <path
          d="M6 4 4 7l2 9 6 4 6-4 2-9-2-3H6Z"
          fill="#f97316"
          stroke="#ea580c"
          strokeWidth="0.5"
        />
      </svg>
    )
  }
  return <Globe2 className="h-4 w-4 text-slate-400" />
}

function OsIcon({ name }: { name: string }) {
  const key = name.toLowerCase()
  if (key.includes("mac") || key.includes("ios")) {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4">
        <path
          d="M16 2s-1.5.1-2.6 1.6C12.4 5 12.7 6 13 6.5c.4.4 1.2 1.2 2.4 1 0 0 .1-1.5 1.2-2.7C17.7 3.6 18.7 3 19.4 3c0 0-.4-1-1.8-1-.9 0-1.6.4-1.6.4Z"
          fill="#0f172a"
        />
        <path
          d="M12.5 7.8C11 7 9.4 7.2 8.2 7.8 6.6 8.6 6 10.4 6 11.6c0 1.6.6 3 1.2 4 .8 1.4 1.6 2.4 2.8 2.4 1 0 1.5-.6 2.6-.6 1.2 0 1.5.6 2.6.6 1.2 0 2-.9 2.8-2.3.6-1.1 1-2.3 1-3.2a4.4 4.4 0 0 0-2.2-3.7c-1.4-.8-3-.7-3.7-.3-.3.2-.7.4-1.1.4-.3 0-.7-.2-1-.4Z"
          fill="#0f172a"
        />
      </svg>
    )
  }
  if (key.includes("windows")) {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4">
        <path d="M3 4.5 11 3v8H3v-6.5Z" fill="#2563eb" />
        <path d="M3 12.5h8v8l-8-1.1v-6.9Z" fill="#2563eb" />
        <path d="M13 3.2 21 2v9h-8V3.2Z" fill="#2563eb" />
        <path d="M13 12.8h8V22l-8-1.2v-8Z" fill="#2563eb" />
      </svg>
    )
  }
  if (key.includes("android")) {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4">
        <rect x="6" y="7" width="12" height="10" rx="2" fill="#16a34a" />
        <circle cx="10" cy="10" r="0.8" fill="#fff" />
        <circle cx="14" cy="10" r="0.8" fill="#fff" />
      </svg>
    )
  }
  if (key.includes("linux")) {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4">
        <path
          d="M9 5c0-1.1.9-2 2-2h2c1.1 0 2 .9 2 2v10H9V5Z"
          fill="#0f172a"
        />
        <path d="M8 15h8l-1 3H9l-1-3Z" fill="#f59e0b" />
      </svg>
    )
  }
  return <Laptop className="h-4 w-4 text-slate-400" />
}

function deviceIcon(deviceCategory: string) {
  const key = deviceCategory.toLowerCase()
  if (key.includes("desktop")) return <Monitor className="h-4 w-4 text-slate-400" />
  if (key.includes("mobile")) return <Smartphone className="h-4 w-4 text-slate-400" />
  if (key.includes("tablet")) return <Tablet className="h-4 w-4 text-slate-400" />
  return <MousePointer2 className="h-4 w-4 text-slate-400" />
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

export const metadata = buildPageMetadata({
  title: PAGE_TITLE,
  description:
    "Live Shipyard performance for the past 30 days—pulled directly from Google Analytics with top products, referrers, and engagement signals.",
})

export default async function AnalyticsPage() {
  const rangeEnd = subDays(new Date(), 0)
  const rangeStart = subDays(rangeEnd, 29)
  const prevRangeEnd = subDays(rangeStart, 1)
  const prevRangeStart = subDays(prevRangeEnd, 29)

  const [snapshot, previousSnapshot, realtimeVisitors] = await Promise.all([
    getSiteAnalyticsSnapshot({ topProductLimit: 8 }),
    getSiteAnalyticsSnapshot({
      topProductLimit: 8,
      dateRange: {
        startDate: format(prevRangeStart, "yyyy-MM-dd"),
        endDate: format(prevRangeEnd, "yyyy-MM-dd"),
      },
    }),
    getRealtimeVisitorsFromGa(),
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
    products.map((product: (typeof products)[number]) => [product.slug.toLowerCase(), product]),
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
  const newVisitorShare = snapshot.uniqueVisitors > 0 ? (snapshot.newUsers / snapshot.uniqueVisitors) * 100 : 0
  const returningVisitorShare = Math.max(0, 100 - newVisitorShare)
  const maxRefViews = Math.max(0, ...snapshot.referrers.map((ref) => ref.views))
  const maxCountryVisitors = Math.max(0, ...snapshot.countries.map((c) => c.visitors))
  const maxCityVisitors = Math.max(0, ...snapshot.cities.map((c) => c.visitors))
  const maxBrowserVisitors = Math.max(0, ...snapshot.browsers.map((b) => b.visitors))
  const maxOsVisitors = Math.max(0, ...snapshot.operatingSystems.map((o) => o.visitors))
  const maxDeviceVisitors = Math.max(0, ...snapshot.devices.map((d) => d.visitors))
  const hasTimeseries = snapshot.timeseries.length > 0

  const deltas = {
    views: computeDelta(snapshot.pageViews, previousSnapshot.pageViews),
    sessions: computeDelta(snapshot.sessions, previousSnapshot.sessions),
    visitors: computeDelta(snapshot.uniqueVisitors, previousSnapshot.uniqueVisitors),
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

  const chartConfig = {
    pageViews: { label: "Page views", color: "#0ea5e9" },
    uniqueVisitors: { label: "Visitors", color: "#a855f7" },
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
      <main className="bg-gradient-to-b from-slate-50 via-white to-white text-slate-900">
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
            <MetricCard
              label="Views"
              value={numberFormatter.format(snapshot.pageViews)}
              delta={deltas.views}
              icon={<TrendingUp className="h-4 w-4" aria-hidden />}
            />
            <MetricCard
              label="Visits"
              value={numberFormatter.format(snapshot.sessions)}
              delta={deltas.sessions}
              icon={<MousePointer2 className="h-4 w-4" aria-hidden />}
            />
            <MetricCard
              label="Visitors"
              value={numberFormatter.format(snapshot.uniqueVisitors)}
              delta={deltas.visitors}
              icon={<Users className="h-4 w-4" aria-hidden />}
            />
            <MetricCard
              label="Bounce rate"
              value={formatPercent(snapshot.bounceRate)}
              delta={deltas.bounce}
              icon={<Activity className="h-4 w-4" aria-hidden />}
            />
            <MetricCard
              label="Visit duration"
              value={formatDuration(snapshot.averageSessionDuration)}
              delta={deltas.duration}
              icon={<Clock3 className="h-4 w-4" aria-hidden />}
            />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <MetricCard
              label="Pages per session"
              value={snapshot.pagesPerSession.toFixed(2)}
              delta={deltas.pagesPerSession}
              icon={<MousePointer2 className="h-4 w-4" aria-hidden />}
            />
            <MetricCard
              label="Engaged session rate"
              value={formatPercent(snapshot.engagementRate)}
              delta={deltas.engagementRate}
              icon={<Activity className="h-4 w-4" aria-hidden />}
            />
            <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-600">New vs returning</div>
                <div className="text-xs text-slate-500">Visitors</div>
              </div>
              <ValueBarRow
                value={newVisitorShare}
                max={100}
                left={
                  <div className="flex items-center gap-2 truncate">
                    <span className="h-2 w-2 rounded-full bg-sky-400" />
                    <span className="text-sm font-medium text-slate-900">New</span>
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
                left={
                  <div className="flex items-center gap-2 truncate">
                    <span className="h-2 w-2 rounded-full bg-indigo-400" />
                    <span className="text-sm font-medium text-slate-900">Returning</span>
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
          </div>

          <section className="mt-8 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Visitors vs page views</h2>
            </div>
            {!hasTimeseries ? (
              <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white text-sm text-slate-500">
                Not enough data yet.
              </div>
            ) : (
              <AnalyticsLineChart
                data={snapshot.timeseries}
                config={chartConfig}
                lines={[
                  { dataKey: "pageViews", strokeWidth: 2 },
                  { dataKey: "uniqueVisitors", strokeWidth: 2 },
                ]}
                height={280}
                showLegend
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              />
            )}
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span>Source: Google Analytics</span>
              <span className="h-1 w-1 rounded-full bg-slate-300" aria-hidden />
              <span>Updated {new Date().toLocaleString()}</span>
            </div>
          </section>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <Card className="border-slate-200 bg-white shadow-sm">
              <CardHeader className="pb-1">
                <CardTitle className="text-lg font-semibold">Product Pages</CardTitle>
              </CardHeader>
              <CardContent className="pt-3">
                {topProducts.length === 0 ? (
                  <div className="flex h-24 items-center justify-center text-sm text-slate-500">
                    No product traffic recorded in this window yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {topProducts.map((product) => (
                      <ValueBarRow
                        key={`${product.slug}-${product.path}`}
                        value={
                          totalProductViews > 0
                            ? (product.pageViews / totalProductViews) * 100
                            : 0
                        }
                        max={100}
                        left={
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-slate-900">{product.name}</div>
                            <div className="truncate text-xs text-slate-500">{product.path}</div>
                          </div>
                        }
                        right={
                          <div className="text-right">
                            <div className="text-sm font-semibold text-slate-700">
                              {formatPercent(
                                totalProductViews > 0
                                  ? (product.pageViews / totalProductViews) * 100
                                  : 0,
                              )}
                            </div>
                            <div className="text-xs text-slate-500">
                              {numberFormatter.format(product.pageViews)} views
                            </div>
                          </div>
                        }
                        tone="indigo"
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white shadow-sm">
              <CardHeader className="pb-1">
                <CardTitle className="text-lg font-semibold">Referrers</CardTitle>
              </CardHeader>
              <CardContent className="pt-3">
                {snapshot.referrers.length === 0 ? (
                  <div className="flex h-24 items-center justify-center text-sm text-slate-500">
                    Waiting for referral data.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {snapshot.referrers.map((referrer) => (
                      <ValueBarRow
                        key={referrer.referrer}
                        value={referrer.views}
                        max={maxRefViews}
                        left={
                          <span className="truncate font-medium text-slate-900">
                            {referrerLabel(referrer.referrer)}
                          </span>
                        }
                        right={
                          <span className="text-sm font-semibold text-slate-700">
                            {formatPercent(referrer.share)}
                          </span>
                        }
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <Card className="border-slate-200 bg-white shadow-sm">
              <CardHeader className="pb-1">
                <CardTitle className="text-lg font-semibold">Countries</CardTitle>
              </CardHeader>
              <CardContent className="pt-3">
                {snapshot.countries.length === 0 ? (
                  <div className="flex h-24 items-center justify-center text-sm text-slate-500">
                    No country data yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {snapshot.countries.map((country) => (
                      <ValueBarRow
                        key={country.country}
                        value={country.visitors}
                        max={maxCountryVisitors}
                        left={
                          <div className="flex items-center gap-2 truncate">
                            <FlagIcon code={country.code} name={country.country} />
                            <span className="truncate font-medium text-slate-900">{country.country}</span>
                          </div>
                        }
                        right={
                          <span className="text-sm font-semibold text-slate-700">
                            {formatPercent(country.share)}
                          </span>
                        }
                        tone="blue"
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white shadow-sm">
              <CardHeader className="pb-1">
                <CardTitle className="text-lg font-semibold">Cities</CardTitle>
              </CardHeader>
              <CardContent className="pt-3">
                {snapshot.cities.length === 0 ? (
                  <div className="flex h-24 items-center justify-center text-sm text-slate-500">
                    No city data yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {snapshot.cities.map((city) => (
                      <ValueBarRow
                        key={`${city.city}-${city.region ?? ""}-${city.country ?? ""}`}
                        value={city.visitors}
                        max={maxCityVisitors}
                        left={
                          <div className="flex items-center gap-2 truncate">
                            <FlagIcon code={city.code} name={city.city} />
                            <div className="min-w-0 truncate">
                              <div className="truncate font-medium text-slate-900">{city.city}</div>
                              <div className="truncate text-xs text-slate-500">
                                {[city.region, city.country].filter(Boolean).join(" · ")}
                              </div>
                            </div>
                          </div>
                        }
                        right={
                          <span className="text-sm font-semibold text-slate-700">
                            {formatPercent(city.share)}
                          </span>
                        }
                        tone="blue"
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            <Card className="border-slate-200 bg-white shadow-sm">
              <CardHeader className="pb-1">
                <CardTitle className="text-lg font-semibold">Browsers</CardTitle>
              </CardHeader>
              <CardContent className="pt-3">
                {snapshot.browsers.length === 0 ? (
                  <div className="flex h-24 items-center justify-center text-sm text-slate-500">
                    No browser data yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {snapshot.browsers.map((browser) => (
                      <ValueBarRow
                        key={browser.browser}
                        value={browser.visitors}
                        max={maxBrowserVisitors}
                        left={
                          <div className="flex items-center gap-2 truncate">
                            <BrowserIcon name={browser.browser} />
                            <span className="truncate font-medium text-slate-900">{browser.browser}</span>
                          </div>
                        }
                        right={
                          <span className="text-sm font-semibold text-slate-700">
                            {formatPercent(browser.share)}
                          </span>
                        }
                        tone="indigo"
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white shadow-sm">
              <CardHeader className="pb-1">
                <CardTitle className="text-lg font-semibold">Operating systems</CardTitle>
              </CardHeader>
              <CardContent className="pt-3">
                {snapshot.operatingSystems.length === 0 ? (
                  <div className="flex h-24 items-center justify-center text-sm text-slate-500">
                    No OS data yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {snapshot.operatingSystems.map((os) => (
                      <ValueBarRow
                        key={os.os}
                        value={os.visitors}
                        max={maxOsVisitors}
                        left={
                          <div className="flex items-center gap-2 truncate">
                            <OsIcon name={os.os} />
                            <span className="truncate font-medium text-slate-900">{os.os}</span>
                          </div>
                        }
                        right={
                          <span className="text-sm font-semibold text-slate-700">
                            {formatPercent(os.share)}
                          </span>
                        }
                        tone="blue"
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white shadow-sm">
              <CardHeader className="pb-1">
                <CardTitle className="text-lg font-semibold">Devices</CardTitle>
              </CardHeader>
              <CardContent className="pt-3">
                {snapshot.devices.length === 0 ? (
                  <div className="flex h-24 items-center justify-center text-sm text-slate-500">
                    No device data yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {snapshot.devices.map((device) => (
                      <ValueBarRow
                        key={device.deviceCategory}
                        value={device.visitors}
                        max={maxDeviceVisitors}
                        left={
                          <div className="flex items-center gap-2 truncate capitalize">
                            {deviceIcon(device.deviceCategory)}
                            <span className="truncate font-medium text-slate-900">
                              {device.deviceCategory}
                            </span>
                          </div>
                        }
                        right={
                          <span className="text-sm font-semibold text-slate-700">
                            {formatPercent(device.share)}
                          </span>
                        }
                        tone="indigo"
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="mt-10 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
            <div>
              Data is aggregated/anonymized and excludes PII. Admin/internal traffic is filtered out. See our{" "}
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

function MetricCard({
  label,
  value,
  delta,
  icon,
}: {
  label: string
  value: string
  delta?: number | null
  icon?: ReactNode
}) {
  const trendLabel =
    delta != null ? `${delta > 0 ? "+" : ""}${delta.toFixed(1)}%` : null
  const isPositive = delta != null ? delta >= 0 : null
  const trendColor = isPositive != null ? (isPositive ? "text-emerald-700" : "text-rose-700") : "text-slate-600"
  const trendBg = isPositive != null ? (isPositive ? "bg-emerald-50" : "bg-rose-50") : "bg-slate-50"

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-600">{label}</div>
          <div className="mt-2 text-3xl font-semibold text-slate-900">{value}</div>
          {trendLabel ? (
            <div className={`mt-2 inline-flex items-center gap-2 rounded-md px-2.5 py-1 ${trendBg}`}>
              <span className={`text-xs font-semibold ${trendColor}`}>{trendLabel}</span>
            </div>
          ) : null}
        </div>
        {icon ? (
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-800">
            {icon}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function ValueBarRow({
  value,
  max,
  left,
  right,
  tone = "blue",
}: {
  value: number
  max: number
  left: ReactNode
  right?: ReactNode
  tone?: "blue" | "indigo"
}) {
  const safeMax = max > 0 ? max : value || 1
  const pct = Math.min(100, Math.max(0, (value / safeMax) * 100))
  const barColor = tone === "indigo" ? "bg-indigo-200" : "bg-sky-200"

  return (
    <div className="relative overflow-hidden rounded-md border border-slate-200 bg-white px-3 py-2 shadow-sm">
      <div
        className={`absolute inset-y-0 left-0 ${barColor}`}
        style={{ width: `${pct}%` }}
        aria-hidden
      />
      <div className="relative flex items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2 truncate">{left}</div>
        {right ? <div className="shrink-0 text-right">{right}</div> : null}
      </div>
    </div>
  )
}

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
} from "date-fns"
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
import { Button } from "@/components/atoms/button"
import { ObjectPageLayout } from "@/components/layout/object-view/page-layout"
import { ProductAnalyticsRangeDropdown } from "@/components/molecules/ProductAnalyticsRangeDropdown"
import { ProductTrafficChart } from "@/components/molecules/ProductTrafficChart"
import { AnalyticsPieChart } from "@/components/molecules/AnalyticsPieChart"
import {
  ArrowLeft,
  ExternalLink,
  Globe2,
  Laptop,
  MonitorSmartphone,
  MousePointer2,
  Monitor,
  Smartphone,
  Tablet,
  Link2,
  MessageCircle,
  Rocket,
} from "lucide-react"

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

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "—"
  const totalSeconds = Math.round(seconds)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const secs = totalSeconds % 60
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  if (minutes > 0) {
    return `${minutes}m ${secs.toString().padStart(2, "0")}s`
  }
  return `${secs}s`
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) return "—"
  return `${value.toFixed(1)}%`
}

function buildProductPagePaths(slug: string) {
  const base = productPath(slug)
  return [base, `${base}/`]
}

function flagEmoji(code?: string | null) {
  if (!code || code.length !== 2) return "🌐"
  const upper = code.toUpperCase()
  const first = upper.codePointAt(0)
  const second = upper.codePointAt(1)
  if (!first || !second) return "🌐"
  return String.fromCodePoint(
    0x1f1e6 + (first - 65),
    0x1f1e6 + (second - 65),
  )
}

function FlagIcon({
  code,
  name,
}: {
  code?: string | null
  name: string
}) {
  const emoji = flagEmoji(code)
  if (code && code.length === 2) {
    const lower = code.toLowerCase()
    return (
      <span className="inline-flex h-4 w-6 overflow-hidden rounded-sm ring-1 ring-slate-200/80">
        <img
          src={`https://flagcdn.com/w40/${lower}.png`}
          alt={`${name} flag`}
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
        />
      </span>
    )
  }
  return <span className="text-lg">{emoji}</span>
}

type BadgeConfig = { label: string; bg: string; color?: string }

function browserBadge(browser: string): BadgeConfig {
  const key = browser.toLowerCase()
  if (key.includes("chrome")) return { label: "Chrome", bg: "#e8f0fe", color: "#1a73e8" }
  if (key.includes("safari")) return { label: "Safari", bg: "#e5f0ff", color: "#2563eb" }
  if (key.includes("firefox")) return { label: "Firefox", bg: "#fff1e6", color: "#d45d13" }
  if (key.includes("edge")) return { label: "Edge", bg: "#e6f3ff", color: "#0a94ff" }
  if (key.includes("opera")) return { label: "Opera", bg: "#ffecee", color: "#e60023" }
  if (key.includes("brave")) return { label: "Brave", bg: "#fff4e5", color: "#e86f13" }
  return { label: browser || "Unknown", bg: "#eef2f7", color: "#475569" }
}

function osBadge(os: string): BadgeConfig {
  const key = os.toLowerCase()
  if (key.includes("mac")) return { label: os, bg: "#f0f4ff", color: "#3b82f6" }
  if (key.includes("ios")) return { label: os, bg: "#f0f4ff", color: "#2563eb" }
  if (key.includes("windows")) return { label: os, bg: "#eaf5ff", color: "#0ea5e9" }
  if (key.includes("android")) return { label: os, bg: "#e9f7ef", color: "#16a34a" }
  if (key.includes("linux")) return { label: os, bg: "#f5f5f4", color: "#6b7280" }
  return { label: os || "Unknown", bg: "#eef2f7", color: "#475569" }
}

function deviceIcon(deviceCategory: string) {
  const key = deviceCategory.toLowerCase()
  if (key.includes("desktop")) return <Monitor className="h-4 w-4 text-slate-400" />
  if (key.includes("mobile")) return <Smartphone className="h-4 w-4 text-slate-400" />
  if (key.includes("tablet")) return <Tablet className="h-4 w-4 text-slate-400" />
  return <MousePointer2 className="h-4 w-4 text-slate-400" />
}

function Badge({ label, bg, color }: BadgeConfig) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold"
      style={{ backgroundColor: bg, color: color ?? "#0f172a" }}
    >
      {label}
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

function ValueBarRow({
  value,
  max,
  left,
  right,
}: {
  value: number
  max: number
  left: React.ReactNode
  right?: React.ReactNode
}) {
  const safeMax = max > 0 ? max : 1
  const pct = Math.min(100, Math.max(6, (value / safeMax) * 100))
  return (
    <div className="relative overflow-hidden rounded-md bg-slate-50 px-3 py-2">
      <div
        className="absolute inset-y-0 left-0 rounded-md bg-blue-200"
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
  const maxRefViews =
    gaTraffic.referrers.reduce((max, item) => Math.max(max, item.views), 0) || 1
  const maxBrowserVisitors =
    gaTraffic.browsers.reduce((max, item) => Math.max(max, item.visitors), 0) ||
    1
  const maxOsVisitors =
    gaTraffic.operatingSystems.reduce(
      (max, item) => Math.max(max, item.visitors),
      0,
    ) || 1
  const maxDeviceVisitors =
    gaTraffic.devices.reduce((max, item) => Math.max(max, item.visitors), 0) ||
    1
  const maxCountryVisitors =
    gaTraffic.countries.reduce((max, item) => Math.max(max, item.visitors), 0) ||
    1
  const maxCityVisitors =
    gaTraffic.cities.reduce((max, item) => Math.max(max, item.visitors), 0) || 1

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
  const hasTrafficData = gaTraffic.timeseries.some(
    (point) => point.pageViews > 0 || point.uniqueVisitors > 0,
  )
  const hasEngagementData = upvotes > 0

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
              value={formatPercent(gaTraffic.bounceRate)}
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
                {!hasTrafficData ? (
                  <div className="flex h-80 items-center justify-center text-sm text-muted-foreground">
                    Not enough data for this range.
                  </div>
                ) : (
                  <ProductTrafficChart points={gaTraffic.timeseries} />
                )}
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
                <Card className="rounded-xl border border-slate-200 bg-white/90 shadow-sm">
                  <CardHeader className="pb-2 px-4">
                    <CardTitle className="text-base text-slate-900">
                      Top referrers
                    </CardTitle>
                    <CardDescription className="text-sm text-muted-foreground">
                      Most viewed sources this range
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-2">
                    {gaTraffic.referrers.length === 0 ? (
                      <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
                        Not enough data for this range.
                      </div>
                    ) : (
                      <ul className="space-y-2">
                        {referrersSorted.map((ref) => (
                          <li key={ref.referrer}>
                            <ValueBarRow
                              value={ref.views}
                              max={maxRefViews}
                              left={
                                <span className="font-medium text-slate-900 truncate">
                                  {ref.referrer}
                                </span>
                              }
                              right={
                                <div className="flex items-center gap-3 text-xs text-slate-700">
                                  <span className="font-semibold">
                                    {formatPercent(ref.share)}
                                  </span>
                                </div>
                              }
                            />
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
                <Card className="rounded-xl border border-slate-200 bg-white/90 shadow-sm">
                  <CardHeader className="pb-2 px-4">
                    <CardTitle className="text-base text-slate-900">
                      Traffic channels
                    </CardTitle>
                    <CardDescription className="text-sm text-muted-foreground">
                      Channel mix for this range
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-2">
                    {gaTraffic.referrerCategories.length === 0 ? (
                      <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
                        Not enough data for this range.
                      </div>
                    ) : (
                      <ul className="space-y-2">
                        {channelSorted.map((channel) => (
                          <li key={channel.category}>
                            <ValueBarRow
                              value={channel.views}
                              max={maxRefViews}
                              left={
                                <div className="flex items-center gap-2 truncate">
                                  <Link2 className="h-4 w-4 text-slate-400" />
                                  <span className="font-medium text-slate-900 truncate capitalize">
                                    {channel.category}
                                  </span>
                                </div>
                              }
                              right={
                                <div className="flex items-center gap-3 text-xs text-slate-700">
                                  <span className="font-semibold">
                                    {formatPercent(channel.share)}
                                  </span>
                                </div>
                              }
                            />
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              </div>
              <div className="grid gap-4 xl:grid-cols-3">
                <Card className="rounded-xl border border-slate-200 bg-white/90 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base text-slate-900">
                      Top operating systems
                    </CardTitle>
                    <CardDescription className="text-sm text-muted-foreground">
                      Most used OS by visitors
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-2">
                    {gaTraffic.operatingSystems.length === 0 ? (
                      <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
                        Not enough data for this range.
                      </div>
                    ) : (
                      <ul className="space-y-2">
                        {osSorted.map((os) => (
                          <li key={os.os}>
                            <ValueBarRow
                              value={os.visitors}
                              max={maxOsVisitors}
                              left={
                                <>
                                  <OsIcon name={os.os} />
                                  <span className="font-medium text-slate-900 truncate">
                                    {os.os}
                                  </span>
                                </>
                              }
                              right={
                                <span className="text-xs font-semibold text-slate-700">
                                  {formatPercent(
                                    gaTraffic.uniqueVisitors > 0
                                      ? (os.visitors / gaTraffic.uniqueVisitors) *
                                        100
                                      : 0,
                                  )}
                                </span>
                              }
                            />
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
                <Card className="rounded-xl border border-slate-200 bg-white/90 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base text-slate-900">
                      Top devices
                    </CardTitle>
                    <CardDescription className="text-sm text-muted-foreground">
                      Most used devices by visitors
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-2">
                    {gaTraffic.devices.length === 0 ? (
                      <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
                        Not enough data for this range.
                      </div>
                    ) : (
                      <ul className="space-y-2">
                        {devicesSorted.map((device) => (
                          <li key={device.deviceCategory}>
                            <ValueBarRow
                              value={device.visitors}
                              max={maxDeviceVisitors}
                              left={
                                <>
                                  {deviceIcon(device.deviceCategory)}
                                  <span className="font-medium text-slate-900 truncate capitalize">
                                    {device.deviceCategory}
                                  </span>
                                </>
                              }
                              right={
                                <span className="text-xs font-semibold text-slate-700">
                                  {formatPercent(
                                    gaTraffic.uniqueVisitors > 0
                                      ? (device.visitors /
                                          gaTraffic.uniqueVisitors) *
                                        100
                                      : 0,
                                  )}
                                </span>
                              }
                            />
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
                <Card className="rounded-xl border border-slate-200 bg-white/90 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base text-slate-900">
                      Top browsers
                    </CardTitle>
                    <CardDescription className="text-sm text-muted-foreground">
                      Most used browsers by visitors
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-2">
                    {gaTraffic.browsers.length === 0 ? (
                      <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
                        Not enough data for this range.
                      </div>
                    ) : (
                      <ul className="space-y-2">
                        {browsersSorted.map((browser) => (
                          <li key={browser.browser}>
                            <ValueBarRow
                              value={browser.visitors}
                              max={maxBrowserVisitors}
                              left={
                                <>
                                  <BrowserIcon name={browser.browser} />
                                  <span className="font-medium text-slate-900 truncate">
                                    {browser.browser}
                                  </span>
                                </>
                              }
                              right={
                                <span className="text-xs font-semibold text-slate-700">
                                  {formatPercent(
                                    gaTraffic.uniqueVisitors > 0
                                      ? (browser.visitors /
                                          gaTraffic.uniqueVisitors) *
                                        100
                                      : 0,
                                  )}
                                </span>
                              }
                            />
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
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
                      {gaTraffic.countries.length === 0 ? (
                        <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
                          Not enough data for this range.
                        </div>
                      ) : (
                        <ul className="space-y-2">
                          {countriesSorted.map((country) => (
                            <li key={country.country}>
                              <ValueBarRow
                                value={country.visitors}
                                max={maxCountryVisitors}
                                left={
                                  <>
                                    <FlagIcon
                                      code={country.code}
                                      name={country.country}
                                    />
                                    <span className="font-medium text-slate-900 truncate">
                                      {country.country}
                                    </span>
                                  </>
                                }
                                right={
                                  <span className="text-xs font-semibold text-slate-700">
                                    {formatPercent(country.share)}
                                  </span>
                                }
                              />
                            </li>
                          ))}
                        </ul>
                      )}
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
                      {gaTraffic.cities.length === 0 ? (
                        <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
                          Not enough data for this range.
                        </div>
                      ) : (
                        <ul className="space-y-2">
                          {citiesSorted.map((city) => (
                            <li
                              key={`${city.city}-${city.region}-${city.country}`}
                            >
                              <ValueBarRow
                                value={city.visitors}
                                max={maxCityVisitors}
                                left={
                                  <>
                                    <FlagIcon
                                      code={city.code ?? undefined}
                                      name={city.country ?? city.city}
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
                                }
                                right={
                                  <span className="text-xs font-semibold text-slate-700">
                                    {formatPercent(
                                      gaTraffic.uniqueVisitors > 0
                                        ? (city.visitors /
                                            gaTraffic.uniqueVisitors) *
                                          100
                                        : 0,
                                    )}
                                  </span>
                                }
                              />
                            </li>
                          ))}
                        </ul>
                      )}
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

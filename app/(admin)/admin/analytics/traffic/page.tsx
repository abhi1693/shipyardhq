import {
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
  subMonths,
} from "date-fns"

import { TrafficTimeseriesChart } from "@/components/molecules/TrafficTimeseriesChart"
import { AnalyticsListCard } from "@/components/molecules/AnalyticsListCard"
import { AnalyticsMetricCard } from "@/components/molecules/AnalyticsMetricCard"
import { ProductAnalyticsRangeDropdown } from "@/components/molecules/ProductAnalyticsRangeDropdown"
import { LiveVisitorsPill } from "@/components/molecules/LiveVisitorsPill"
import {
  BrowserIcon,
  deviceIcon,
  FlagIcon,
  formatDuration,
  formatPercent,
  OsIcon,
  ValueBarRow,
} from "@/components/molecules/AnalyticsShared"
import { type AnalyticsDateRange } from "@/lib/server/analytics/providerTypes"
import { getAnalyticsProvider } from "@/lib/server/analytics/store"

export const dynamic = "force-dynamic"

type SearchParams = { range?: string }

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

const RANGE_OPTIONS: { value: RangeKey; label: string }[] = [
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
const DEFAULT_RANGE: RangeKey = "7d"

function formatGaDate(date: Date) {
  return format(date, "yyyy-MM-dd")
}

function resolveRange(keyRaw: string | null | undefined): {
  key: RangeKey
  label: string
  dateRange: AnalyticsDateRange
} {
  const now = startOfDay(new Date())
  const resolvedKey =
    RANGE_OPTIONS.find((opt) => opt.value === keyRaw)?.value ?? DEFAULT_RANGE
  const label =
    RANGE_OPTIONS.find((opt) => opt.value === resolvedKey)?.label ??
    "Last 7 days"

  const dateRange: AnalyticsDateRange = (() => {
    switch (resolvedKey) {
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
        const start = subDays(now, 6)
        return { startDate: formatGaDate(start), endDate: formatGaDate(now) }
      }
      case "this-month": {
        const start = startOfMonth(now)
        return { startDate: formatGaDate(start), endDate: formatGaDate(now) }
      }
      case "30d": {
        const start = subDays(now, 29)
        return { startDate: formatGaDate(start), endDate: formatGaDate(now) }
      }
      case "90d": {
        const start = subDays(now, 89)
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
        const start = startOfMonth(subMonths(now, 23))
        return { startDate: formatGaDate(start), endDate: formatGaDate(now) }
      }
    }
  })()

  return { key: resolvedKey, label, dateRange }
}

function previousRange(range: AnalyticsDateRange): AnalyticsDateRange {
  const end = startOfDay(new Date(range.startDate))
  const spanDays = diffDays(range) + 1
  const start = subDays(end, spanDays)
  return {
    startDate: format(start, "yyyy-MM-dd"),
    endDate: format(subDays(end, 1), "yyyy-MM-dd"),
  }
}

function diffDays(range: AnalyticsDateRange) {
  const start = startOfDay(new Date(range.startDate))
  const end = startOfDay(new Date(range.endDate))
  const ms = end.getTime() - start.getTime()
  return Math.max(Math.round(ms / (1000 * 60 * 60 * 24)), 0)
}

function computeDelta(current: number, previous: number) {
  if (!Number.isFinite(previous) || previous === 0) return null
  return ((current - previous) / previous) * 100
}

const numberFormatter = new Intl.NumberFormat("en-US")

export default async function TrafficAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams
  const resolvedRange = resolveRange(sp?.range)
  const selectedRange = resolvedRange.key
  const dateRange = resolvedRange.dateRange
  const prevRange = previousRange(dateRange)
  const analyticsProvider = getAnalyticsProvider("db")
  const realtimeProvider = getAnalyticsProvider("cache")

  const [snapshot, previousSnapshot, realtimeVisitors] = await Promise.all([
    analyticsProvider.getSiteAnalyticsSnapshot({
      dateRange,
      topProductLimit: 10,
    }),
    analyticsProvider.getSiteAnalyticsSnapshot({
      dateRange: prevRange,
      topProductLimit: 10,
    }),
    realtimeProvider.getRealtimeVisitors(),
  ])

  const startLabel = format(new Date(dateRange.startDate), "MMM d")
  const endLabel = format(new Date(dateRange.endDate), "MMM d")
  const rangeLabel = `${startLabel} – ${endLabel}`

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

  const totalProductViews = snapshot.topProductPages.reduce(
    (sum, page) => sum + page.pageViews,
    0,
  )

  const newVisitorShare =
    snapshot.uniqueVisitors > 0
      ? (snapshot.newUsers / snapshot.uniqueVisitors) * 100
      : 0
  const returningVisitorShare = Math.max(0, 100 - newVisitorShare)

  const valueBarRowClassName =
    "border border-slate-200 bg-white px-3 py-2 shadow-sm"

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            Traffic analytics
          </h1>
          <p className="text-xs text-slate-500">{rangeLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <LiveVisitorsPill initialVisitors={realtimeVisitors} />
          <ProductAnalyticsRangeDropdown
            options={RANGE_OPTIONS}
            value={selectedRange}
            defaultValue={DEFAULT_RANGE}
          />
        </div>
      </div>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.28em] text-muted-foreground">
          Key signals
        </h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <AnalyticsMetricCard
            label="Views"
            value={numberFormatter.format(snapshot.pageViews)}
            delta={deltas.views}
            helper="Page views in range"
          />
          <AnalyticsMetricCard
            label="Sessions"
            value={numberFormatter.format(snapshot.sessions)}
            delta={deltas.sessions}
            helper="Sessions"
          />
          <AnalyticsMetricCard
            label="Visitors"
            value={numberFormatter.format(snapshot.uniqueVisitors)}
            delta={deltas.visitors}
            helper="Unique visitors"
          />
          <AnalyticsMetricCard
            label="Bounce rate"
            value={formatPercent(snapshot.bounceRate)}
            delta={deltas.bounce}
            helper="Range average"
          />
          <AnalyticsMetricCard
            label="Avg. session duration"
            value={formatDuration(snapshot.averageSessionDuration, {
              padMinutes: true,
            })}
            delta={deltas.duration}
            helper="Range average"
          />
          <AnalyticsMetricCard
            label="Pages / session"
            value={snapshot.pagesPerSession.toFixed(2)}
            delta={deltas.pagesPerSession}
            helper="Engagement depth"
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.28em] text-muted-foreground">
          Engagement mix
        </h2>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-700">
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
            <p className="mt-3 text-xs text-slate-500">
              Delta vs prev window:{" "}
              {deltas.engagementRate !== null &&
              deltas.engagementRate !== undefined
                ? `${deltas.engagementRate > 0 ? "+" : ""}${deltas.engagementRate.toFixed(1)}%`
                : "—"}
            </p>
          </div>
          <AnalyticsMetricCard
            label="Engagement rate"
            value={formatPercent(snapshot.engagementRate)}
            delta={deltas.engagementRate}
            helper="Engaged sessions / sessions"
          />
          <AnalyticsMetricCard
            label="New visitors"
            value={numberFormatter.format(snapshot.newUsers)}
            delta={computeDelta(snapshot.newUsers, previousSnapshot.newUsers)}
            helper="New users metric"
          />
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            Velocity
          </h2>
          <span className="text-xs text-slate-500">{rangeLabel}</span>
        </div>
        <TrafficTimeseriesChart
          points={snapshot.timeseries}
          height={300}
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          emptyClassName="flex h-64 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white text-sm text-slate-500"
          emptyLabel="Not enough data yet."
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <AnalyticsListCard
          title="Top product pages"
          description="Share of site views by destination"
          items={snapshot.topProductPages.map((page) => ({
            key: page.path,
            value:
              totalProductViews > 0
                ? (page.pageViews / totalProductViews) * 100
                : page.shareOfViews,
            tone: "indigo",
            left: (
              <div className="min-w-0">
                <div className="truncate font-semibold text-slate-900">
                  {page.slug ?? page.path}
                </div>
                <div className="truncate text-xs text-slate-500">
                  {page.path}
                </div>
              </div>
            ),
            right: (
              <div className="text-right">
                <div className="text-sm font-semibold text-slate-700">
                  {formatPercent(page.shareOfViews)}
                </div>
                <div className="text-xs text-slate-500">
                  {numberFormatter.format(page.pageViews)} views
                </div>
              </div>
            ),
          }))}
          max={100}
          listClassName="space-y-4"
          emptyLabel="No product traffic recorded in this window yet."
          valueBarRowProps={{ className: valueBarRowClassName }}
        />

        <AnalyticsListCard
          title="Referrers"
          description="Top sources delivering traffic"
          items={snapshot.referrers.map((referrer) => ({
            key: referrer.referrer,
            value: referrer.views,
            left: (
              <span className="truncate font-medium text-slate-900">
                {referrer.referrer}
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
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <AnalyticsListCard
          title="Countries"
          description="Visitor distribution by country"
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
          description="Top cities this range"
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
                    {[city.region, city.country].filter(Boolean).join(" · ")}
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
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <AnalyticsListCard
          title="Browsers"
          description="Most used browsers"
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
          description="Visitor OS breakdown"
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
          description="Device mix"
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
      </section>
    </div>
  )
}

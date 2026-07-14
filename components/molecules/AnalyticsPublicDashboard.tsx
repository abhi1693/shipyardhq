"use client"

import Link from "next/link"
import { useEffect, useMemo, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  ArrowDown,
  ArrowUp,
  BadgeCheck,
  Monitor,
  MonitorSmartphone,
  MousePointer2,
  Smartphone,
} from "lucide-react"

import {
  BrowserIcon,
  FlagIcon,
  OsIcon,
} from "@/components/molecules/AnalyticsShared"
import { useVisibilityGate } from "@/hooks/use-visibility-gate"
import { cn } from "@/lib/utils"

const numberFormatter = new Intl.NumberFormat("en-US")
const compactFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 2,
})
const HEATMAP_LOW_COLOR = [235, 244, 255] as const
const HEATMAP_HIGH_COLOR = [20, 99, 213] as const

export type PublicAnalyticsPoint = {
  date: string
  label: string
  requests: number
  visits: number
}

export type PublicAnalyticsRankedItem = {
  key: string
  label: string
  value: number
  href?: string
  code?: string | null
}

export type PublicHourlyActivityPoint = {
  weekday: number
  weekdayLabel: string
  hour: number
  requests: number
  visits: number
}

type HeatmapTooltipState = {
  weekdayLabel: string
  hourLabel: string
  visits: number
  left: number
  top: number
  arrowLeft: number
  placement: "above" | "below"
}

export type PublicTrafficComposition = {
  totalRequests: number
  browserRequests: number
  verifiedAutomatedRequests: number
  otherRequests: number
  verifiedCategories: PublicAnalyticsRankedItem[]
}

export type AnalyticsPublicDashboardProps = {
  windowDays: number
  rangeLabel: string
  updatedAt: string
  requests: number
  visits: number
  requestsDelta: number | null
  visitsDelta: number | null
  ratioDelta: number | null
  initialRecentViews: number
  points: PublicAnalyticsPoint[]
  hourlyActivity: PublicHourlyActivityPoint[]
  products: PublicAnalyticsRankedItem[]
  countries: PublicAnalyticsRankedItem[]
  trafficComposition: PublicTrafficComposition
  browsers: PublicAnalyticsRankedItem[]
  operatingSystems: PublicAnalyticsRankedItem[]
  devices: PublicAnalyticsRankedItem[]
}

type TooltipPayload = {
  color?: string
  dataKey?: string | number
  name?: string | number
  value?: string | number
}

function titleCase(value: string) {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => `${word[0]?.toUpperCase() ?? ""}${word.slice(1)}`)
    .join(" ")
}

function formatCompact(value: number) {
  if (!Number.isFinite(value)) return "0"
  return value >= 1_000
    ? compactFormatter.format(value)
    : numberFormatter.format(value)
}

function heatmapColor(intensity: number) {
  const boundedIntensity = Math.min(1, Math.max(0, intensity))
  return `rgb(${HEATMAP_LOW_COLOR.map((channel, index) =>
    Math.round(
      channel + (HEATMAP_HIGH_COLOR[index]! - channel) * boundedIntensity,
    ),
  ).join(", ")})`
}

function formatDelta(value: number | null, windowDays: number) {
  if (value == null || !Number.isFinite(value)) {
    return `${windowDays}-day window`
  }
  const sign = value > 0 ? "+" : ""
  return `${sign}${value.toFixed(1)}%`
}

function DashboardPanel({
  title,
  meta,
  children,
  className,
}: {
  title: string
  meta?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-lg border border-[#dfe3e8] bg-white",
        className,
      )}
    >
      <header className="flex h-11 items-center justify-between gap-3 border-b border-[#dfe3e8] px-4">
        <h2 className="truncate text-[13px] font-medium text-[#4b5563]">
          {title}
        </h2>
        {meta ? (
          <div className="shrink-0 text-[11px] text-[#7a828d]">{meta}</div>
        ) : null}
      </header>
      {children}
    </section>
  )
}

function MetricSparkline({
  data,
  dataKey,
  color,
}: {
  data: Array<Record<string, number | string>>
  dataKey: string
  color: string
}) {
  return (
    <div className="h-11 w-full" aria-hidden>
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <AreaChart
          data={data}
          margin={{ top: 6, right: 1, bottom: 0, left: 1 }}
        >
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={1.6}
            fill={color}
            fillOpacity={0.09}
            dot={false}
            isAnimationActive
            animationDuration={700}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function MetricPanel({
  label,
  value,
  delta,
  windowDays,
  data,
  dataKey,
  color,
}: {
  label: string
  value: string
  delta: number | null
  windowDays: number
  data: Array<Record<string, number | string>>
  dataKey: string
  color: string
}) {
  const positive = delta == null || delta >= 0
  const DeltaIcon = positive ? ArrowUp : ArrowDown

  return (
    <DashboardPanel title={label}>
      <div className="grid h-[112px] grid-rows-[auto_1fr] px-3.5 pb-1 pt-3">
        <div className="flex items-baseline gap-2">
          <span className="text-[22px] font-semibold leading-7 text-[#17202a]">
            {value}
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-[11px] font-medium",
              delta == null
                ? "text-[#7a828d]"
                : positive
                  ? "text-[#168344]"
                  : "text-[#c53a32]",
            )}
          >
            {delta == null ? null : (
              <DeltaIcon className="size-3" aria-hidden />
            )}
            {formatDelta(delta, windowDays)}
          </span>
        </div>
        <MetricSparkline data={data} dataKey={dataKey} color={color} />
      </div>
    </DashboardPanel>
  )
}

function TrafficTooltip({
  active,
  label,
  payload,
}: {
  active?: boolean
  label?: string
  payload?: TooltipPayload[]
}) {
  if (!active || !payload?.length) return null

  return (
    <div className="min-w-44 rounded-md border border-[#dfe3e8] bg-white px-3 py-2 text-xs shadow-lg">
      <p className="mb-1.5 font-medium text-[#4b5563]">{label}</p>
      {payload.map((entry) => (
        <div
          key={String(entry.dataKey)}
          className="flex items-center justify-between gap-5 py-0.5"
        >
          <span className="flex items-center gap-2 text-[#66707c]">
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            {entry.name}
          </span>
          <span className="font-semibold text-[#17202a]">
            {numberFormatter.format(Number(entry.value ?? 0))}
          </span>
        </div>
      ))}
    </div>
  )
}

function TrafficChart({ points }: { points: PublicAnalyticsPoint[] }) {
  const hasData = points.some((point) => point.requests > 0 || point.visits > 0)

  return (
    <DashboardPanel
      title="Traffic over time"
      meta={
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-[#3788f6]" /> Requests
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-[#1aa251]" /> Visits
          </span>
        </div>
      }
    >
      <div className="h-[330px] px-2 pb-3 pt-5 sm:px-4">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <LineChart
              data={points}
              margin={{ top: 6, right: 14, bottom: 0, left: 0 }}
            >
              <CartesianGrid
                vertical={false}
                stroke="#dfe3e8"
                strokeDasharray="4 4"
              />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#6b7280", fontSize: 11 }}
                tickMargin={12}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#6b7280", fontSize: 11 }}
                tickFormatter={(value) => formatCompact(Number(value))}
                width={48}
              />
              <Tooltip
                cursor={{ stroke: "#9aa3ad", strokeDasharray: "4 4" }}
                content={<TrafficTooltip />}
              />
              <Line
                type="monotone"
                dataKey="requests"
                name="Requests"
                stroke="#3788f6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3, strokeWidth: 0, fill: "#3788f6" }}
                isAnimationActive
                animationDuration={800}
              />
              <Line
                type="monotone"
                dataKey="visits"
                name="Visits"
                stroke="#1aa251"
                strokeWidth={1.8}
                dot={false}
                activeDot={{ r: 3, strokeWidth: 0, fill: "#1aa251" }}
                isAnimationActive
                animationDuration={900}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-[#7a828d]">
            No traffic in this window.
          </div>
        )}
      </div>
    </DashboardPanel>
  )
}

function HourlyActivityHeatmap({
  points,
}: {
  points: PublicHourlyActivityPoint[]
}) {
  const [tooltip, setTooltip] = useState<HeatmapTooltipState | null>(null)
  const hasData = points.some((point) => point.visits > 0)
  const positiveVisits = points
    .map((point) => point.visits)
    .filter((visits) => visits > 0)
  const minVisits = positiveVisits.length > 0 ? Math.min(...positiveVisits) : 0
  const maxVisits = positiveVisits.length > 0 ? Math.max(...positiveVisits) : 0
  const rows = Array.from({ length: 7 }, (_, weekday) => ({
    weekday,
    label:
      points.find((point) => point.weekday === weekday)?.weekdayLabel ?? "",
    points: Array.from({ length: 24 }, (_, hour) =>
      points.find((point) => point.weekday === weekday && point.hour === hour),
    ),
  }))
  const gridTemplateColumns = "72px repeat(24, minmax(24px, 1fr))"

  return (
    <>
      <DashboardPanel title="Hourly activity by weekday" meta="Visits (UTC)">
        {hasData ? (
          <div className="overflow-x-auto p-4 sm:p-5">
            <div className="min-w-[820px]">
              <div
                className="grid items-end gap-1.5"
                style={{ gridTemplateColumns }}
              >
                <span />
                {Array.from({ length: 24 }, (_, hour) => (
                  <span
                    key={hour}
                    className="text-center text-[10px] tabular-nums text-[#7a828d]"
                  >
                    {hour % 3 === 0 ? `${String(hour).padStart(2, "0")}` : ""}
                  </span>
                ))}
              </div>

              <div className="mt-2 space-y-1.5">
                {rows.map((row) => (
                  <div
                    key={row.weekday}
                    className="grid items-center gap-1.5"
                    style={{ gridTemplateColumns }}
                  >
                    <span className="truncate pr-2 text-[11px] font-medium text-[#59636f]">
                      {row.label}
                    </span>
                    {row.points.map((point, hour) => {
                      const visits = point?.visits ?? 0
                      const normalizedVolume =
                        visits > 0 && maxVisits > minVisits
                          ? (visits - minVisits) / (maxVisits - minVisits)
                          : visits > 0
                            ? 0.5
                            : 0
                      const intensity = normalizedVolume ** 0.85
                      const hourLabel = `${String(hour).padStart(2, "0")}:00`
                      const detail = `${row.label} ${hourLabel} UTC: ${numberFormatter.format(visits)} visits`

                      return (
                        <span
                          key={hour}
                          className="group relative h-7"
                          aria-label={detail}
                          role="img"
                          onMouseEnter={(event) => {
                            const rect =
                              event.currentTarget.getBoundingClientRect()
                            const tooltipWidth = 168
                            const viewportPadding = 8
                            const cellCenter = rect.left + rect.width / 2
                            const left = Math.min(
                              Math.max(
                                viewportPadding,
                                cellCenter - tooltipWidth / 2,
                              ),
                              window.innerWidth -
                                tooltipWidth -
                                viewportPadding,
                            )
                            const placement = rect.top >= 92 ? "above" : "below"

                            setTooltip({
                              weekdayLabel: row.label,
                              hourLabel,
                              visits,
                              left,
                              top:
                                placement === "above"
                                  ? rect.top - 8
                                  : rect.bottom + 8,
                              arrowLeft: Math.min(
                                tooltipWidth - 14,
                                Math.max(14, cellCenter - left),
                              ),
                              placement,
                            })
                          }}
                          onMouseLeave={() => setTooltip(null)}
                        >
                          <span
                            className="absolute inset-0 rounded-sm bg-[#edf0f3] transition-transform duration-150 group-hover:scale-110"
                            style={
                              visits > 0
                                ? {
                                    backgroundColor: heatmapColor(intensity),
                                  }
                                : undefined
                            }
                          />
                        </span>
                      )
                    })}
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-end gap-1.5 text-[10px] tabular-nums text-[#7a828d]">
                <span>{formatCompact(minVisits)}</span>
                {[0, 0.25, 0.5, 0.75, 1].map((intensity) => (
                  <span
                    key={intensity}
                    className="size-3 rounded-sm"
                    style={{
                      backgroundColor: heatmapColor(intensity),
                    }}
                  />
                ))}
                <span>{formatCompact(maxVisits)}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex min-h-48 items-center justify-center px-5 text-center text-xs text-[#7a828d]">
            No hourly visit activity in this window.
          </div>
        )}
      </DashboardPanel>
      {tooltip
        ? createPortal(
            <div
              className="pointer-events-none fixed z-[100] w-[168px] rounded-md border border-[#d8dde4] bg-white px-3 py-2.5 text-[#202936] shadow-[0_8px_24px_rgba(23,32,42,0.18)]"
              style={{
                left: tooltip.left,
                top: tooltip.top,
                transform:
                  tooltip.placement === "above"
                    ? "translateY(-100%)"
                    : undefined,
              }}
              aria-hidden
              data-heatmap-tooltip
            >
              <div className="flex items-center justify-between gap-3 border-b border-[#eef0f2] pb-2 text-[11px] font-medium">
                <span>{tooltip.weekdayLabel}</span>
                <span className="tabular-nums text-[#68727e]">
                  {tooltip.hourLabel} UTC
                </span>
              </div>
              <div className="mt-2 grid grid-cols-[auto_1fr_auto] items-center gap-x-2 text-[11px]">
                <span className="size-2 rounded-full bg-[#1aa251]" />
                <span className="text-[#68727e]">Visits</span>
                <strong className="font-semibold tabular-nums">
                  {numberFormatter.format(tooltip.visits)}
                </strong>
              </div>
              <span
                className={cn(
                  "absolute size-2 rotate-45 border-[#d8dde4] bg-white",
                  tooltip.placement === "above"
                    ? "-bottom-1 border-b border-r"
                    : "-top-1 border-l border-t",
                )}
                style={{ left: tooltip.arrowLeft - 4 }}
              />
            </div>,
            document.body,
          )
        : null}
    </>
  )
}

function RankedRows({
  items,
  icon,
  emptyLabel,
  limit = 8,
}: {
  items: PublicAnalyticsRankedItem[]
  icon?: (item: PublicAnalyticsRankedItem) => ReactNode
  emptyLabel: string
  limit?: number
}) {
  const visibleItems = items.slice(0, limit)
  const maxValue = Math.max(1, ...visibleItems.map((item) => item.value))

  if (visibleItems.length === 0) {
    return (
      <div className="flex min-h-48 items-center justify-center px-5 text-center text-xs text-[#7a828d]">
        {emptyLabel}
      </div>
    )
  }

  return (
    <div className="space-y-3.5 p-4">
      {visibleItems.map((item) => {
        const row = (
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(72px,130px)_64px] items-center gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              {icon ? (
                <span className="flex size-5 shrink-0 items-center justify-center text-[#59636f]">
                  {icon(item)}
                </span>
              ) : null}
              <span className="truncate text-xs font-medium text-[#202936]">
                {item.label}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[#e5e7e9]">
              <div
                className="h-full rounded-full bg-[#1473e6] transition-[width] duration-700 ease-out"
                style={{
                  width: `${Math.max(1, (item.value / maxValue) * 100)}%`,
                }}
              />
            </div>
            <span className="text-right text-xs font-medium tabular-nums text-[#202936]">
              {formatCompact(item.value)}
            </span>
          </div>
        )

        return item.href ? (
          <Link
            key={item.key}
            href={item.href}
            className="block rounded-sm outline-none hover:bg-[#f6f8fa] focus-visible:ring-2 focus-visible:ring-[#3788f6]"
          >
            {row}
          </Link>
        ) : (
          <div key={item.key}>{row}</div>
        )
      })}
    </div>
  )
}

function TrafficCompositionPanel({
  composition,
}: {
  composition: PublicTrafficComposition
}) {
  const segments = [
    {
      key: "browser",
      label: "Browser traffic",
      value: composition.browserRequests + composition.otherRequests,
      color: "#1aa251",
      icon: MonitorSmartphone,
    },
    {
      key: "verified",
      label: "Verified bots & crawlers",
      value: composition.verifiedAutomatedRequests,
      color: "#3788f6",
      icon: BadgeCheck,
    },
  ]
  const segmentTotal = segments.reduce((sum, segment) => sum + segment.value, 0)
  const total = Math.max(composition.totalRequests, segmentTotal)
  const percentage = (value: number) =>
    total > 0 ? Math.max(0, (value / total) * 100) : 0

  return (
    <DashboardPanel
      title="Traffic composition"
      meta={`${formatCompact(total)} total requests`}
    >
      <div className="p-4 sm:p-5">
        <div
          className="flex h-3 w-full overflow-hidden rounded-full bg-[#edf0f3]"
          role="img"
          aria-label="Request share by traffic type"
        >
          {segments.map((segment) => (
            <span
              key={segment.key}
              className="h-full transition-[width] duration-700 ease-out"
              style={{
                width: `${percentage(segment.value)}%`,
                backgroundColor: segment.color,
              }}
            />
          ))}
        </div>

        <div className="mt-5 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          {segments.map((segment) => {
            const Icon = segment.icon
            return (
              <div key={segment.key} className="min-w-0">
                <div className="flex items-center gap-3">
                  <span
                    className="flex size-8 shrink-0 items-center justify-center rounded-md"
                    style={{
                      backgroundColor: `${segment.color}18`,
                      color: segment.color,
                    }}
                  >
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-[#202936]">
                      {segment.label}
                    </p>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-xl font-semibold tabular-nums text-[#17202a]">
                        {formatCompact(segment.value)}
                      </span>
                      <span className="text-xs font-medium tabular-nums text-[#68727e]">
                        {percentage(segment.value).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </DashboardPanel>
  )
}

function deviceIcon(label: string) {
  const normalized = label.toLowerCase()
  if (normalized.includes("mobile")) {
    return <Smartphone className="size-4" aria-hidden />
  }
  if (normalized.includes("desktop")) {
    return <Monitor className="size-4" aria-hidden />
  }
  return <MousePointer2 className="size-4" aria-hidden />
}

export function AnalyticsPublicDashboard({
  windowDays,
  rangeLabel,
  updatedAt,
  requests,
  visits,
  requestsDelta,
  visitsDelta,
  ratioDelta,
  initialRecentViews,
  points,
  hourlyActivity,
  products,
  countries,
  trafficComposition,
  browsers,
  operatingSystems,
  devices,
}: AnalyticsPublicDashboardProps) {
  const [recentViews, setRecentViews] = useState(
    Math.max(0, initialRecentViews),
  )
  const { ref, isActive } = useVisibilityGate<HTMLDivElement>()

  useEffect(() => {
    if (!isActive) return

    let stopped = false
    let timeout: ReturnType<typeof setTimeout> | null = null
    let controller: AbortController | null = null

    const refresh = async () => {
      try {
        controller?.abort()
        controller = new AbortController()
        const response = await fetch("/api/analytics/realtime", {
          cache: "no-store",
          signal: controller.signal,
        })
        if (!response.ok) return
        const payload = (await response.json()) as { views?: number }
        if (!stopped && Number.isFinite(payload.views)) {
          setRecentViews(Math.max(0, payload.views ?? 0))
        }
      } catch {
        // Preserve the last successful count until the next refresh.
      } finally {
        if (!stopped) timeout = setTimeout(refresh, 15_000)
      }
    }

    refresh()
    return () => {
      stopped = true
      controller?.abort()
      if (timeout) clearTimeout(timeout)
    }
  }, [isActive])

  const ratio = visits > 0 ? requests / visits : 0
  const sparklineData = useMemo(
    () =>
      points.map((point) => ({
        label: point.label,
        requests: point.requests,
        visits: point.visits,
        ratio: point.visits > 0 ? point.requests / point.visits : 0,
      })),
    [points],
  )

  return (
    <div ref={ref} className="bg-[#f5f6f8] text-[#17202a]">
      <div className="mx-auto w-full max-w-[1480px] px-3 py-5 sm:px-5 lg:px-6">
        <header className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-[#17202a] sm:text-2xl">
              Traffic analytics
            </h1>
            <p className="mt-1 text-xs text-[#69727d]">{rangeLabel}</p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="hidden text-[#7a828d] sm:inline">
              Updated {updatedAt}
            </span>
            <span className="inline-flex h-9 items-center gap-2 rounded-md border border-[#dfe3e8] bg-white px-3 font-medium text-[#26313d]">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#24c875] opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-[#18b867]" />
              </span>
              {numberFormatter.format(recentViews)} views / 5m
            </span>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <MetricPanel
            label="Total Requests"
            value={formatCompact(requests)}
            delta={requestsDelta}
            windowDays={windowDays}
            data={sparklineData}
            dataKey="requests"
            color="#3788f6"
          />
          <MetricPanel
            label="Total Visits"
            value={formatCompact(visits)}
            delta={visitsDelta}
            windowDays={windowDays}
            data={sparklineData}
            dataKey="visits"
            color="#1aa251"
          />
          <MetricPanel
            label="Requests per Visit"
            value={ratio.toFixed(2)}
            delta={ratioDelta}
            windowDays={windowDays}
            data={sparklineData}
            dataKey="ratio"
            color="#7c5ce7"
          />
        </div>

        <div className="mt-3">
          <TrafficChart points={points} />
        </div>

        <div className="mt-3">
          <HourlyActivityHeatmap points={hourlyActivity} />
        </div>

        <div className="mt-3">
          <TrafficCompositionPanel composition={trafficComposition} />
        </div>

        <div
          className={cn(
            "mt-3 grid grid-cols-1 gap-3",
            products.length > 0
              ? "lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.7fr)]"
              : "lg:grid-cols-1",
          )}
        >
          {products.length > 0 ? (
            <DashboardPanel title="Top Product Pages">
              <RankedRows
                items={products}
                emptyLabel="No product page traffic in this window."
                limit={8}
              />
            </DashboardPanel>
          ) : null}
          <DashboardPanel title="Requests by Country">
            <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-x-5">
              <RankedRows
                items={countries.slice(0, 5)}
                icon={(item) => (
                  <FlagIcon
                    code={item.code}
                    name={item.label}
                    variant="image"
                  />
                )}
                emptyLabel="No country data available yet."
                limit={5}
              />
              {countries.length > 5 ? (
                <RankedRows
                  items={countries.slice(5, 10)}
                  icon={(item) => (
                    <FlagIcon
                      code={item.code}
                      name={item.label}
                      variant="image"
                    />
                  )}
                  emptyLabel=""
                  limit={5}
                />
              ) : null}
            </div>
          </DashboardPanel>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
          <DashboardPanel title="Top Browsers">
            <RankedRows
              items={browsers}
              icon={(item) => <BrowserIcon name={item.label} />}
              emptyLabel="No browser data available yet."
            />
          </DashboardPanel>
          <DashboardPanel title="Top Operating Systems">
            <RankedRows
              items={operatingSystems}
              icon={(item) => <OsIcon name={item.label} />}
              emptyLabel="No operating-system data available yet."
            />
          </DashboardPanel>
          <DashboardPanel title="Requests by Device Type">
            <RankedRows
              items={devices.map((device) => ({
                ...device,
                label: titleCase(device.label),
              }))}
              icon={(item) => deviceIcon(item.label)}
              emptyLabel="No device data available yet."
            />
          </DashboardPanel>
        </div>
      </div>
    </div>
  )
}

"use client"

import { useMemo, useState } from "react"
import Link from "next/link"

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  type TooltipProps,
} from "recharts"

import { ChartContainer } from "@/components/atoms/chart"
import PublicContainer from "@/components/layout/PublicContainer"
import { PageSectionHeader } from "@/components/molecules/PageSectionHeader"
import { cn } from "@/lib/utils"
import { categoryPath } from "@/lib/routes"
import type { TrendRadarCategoryMetrics } from "@/lib/trend-radar"

const numberFormatter = new Intl.NumberFormat("en-US")
const percentFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 1,
})

const VIEW_MODES = [
  {
    key: "momentum" as const,
    label: "Momentum Focus",
    description: "Highlights where launches are trending right now.",
    metricKey: "normalizedMomentum" as const,
    statKey: "trendingCount" as const,
    statFormatter: (value: number) =>
      `${numberFormatter.format(value)} trending`,
    secondary: (metric: TrendRadarCategoryMetrics) =>
      metric.momentumPerProduct > 0
        ? `${metric.momentumPerProduct} per launch`
        : "No fresh launches",
    themeColor: "var(--brand-2)",
  },
  {
    key: "depth" as const,
    label: "Depth Focus",
    description: "Shows the densest harbors on Shipyard right now.",
    metricKey: "normalizedDepth" as const,
    statKey: "productCount" as const,
    statFormatter: (value: number) =>
      `${numberFormatter.format(value)} products`,
    secondary: (metric: TrendRadarCategoryMetrics) =>
      metric.catalogShare > 0
        ? `${percentFormatter.format(metric.catalogShare)} of catalog`
        : "New waters",
    themeColor: "var(--brand-1)",
  },
  {
    key: "signal" as const,
    label: "Signal Focus",
    description: "Surfaces categories earning the strongest upvote signal.",
    metricKey: "normalizedSignal" as const,
    statKey: "trendingUpvotes" as const,
    statFormatter: (value: number) =>
      `${numberFormatter.format(value)} upvotes`,
    secondary: (metric: TrendRadarCategoryMetrics) =>
      metric.upvotesPerLaunch > 0
        ? `${metric.upvotesPerLaunch} upvotes / launch`
        : "Signal warming up",
    themeColor: "var(--brand-3)",
  },
]

type ViewModeKey = (typeof VIEW_MODES)[number]["key"]

type ChartDatum = {
  label: string
  momentum: number
  depth: number
  signal: number
  metric: TrendRadarCategoryMetrics
}

interface TrendRadarTooltipProps extends TooltipProps<number, string> {
  mode: (typeof VIEW_MODES)[number]
}

function TrendRadarTooltip({ active, payload, mode }: TrendRadarTooltipProps) {
  if (!active || !payload?.length) return null

  const [entry] = payload
  if (!entry) return null
  const data = entry.payload as ChartDatum | undefined
  if (!data) return null

  const { metric } = data
  const normalizedValue = typeof entry.value === "number" ? entry.value : 0

  const primaryStat = metric[mode.statKey] ?? 0

  return (
    <div className="rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-lg">
      <div className="mb-1 font-semibold text-slate-600">{metric.name}</div>
      <div className="mb-2 flex items-center gap-2 text-slate-500">
        <span
          className="inline-flex h-2 w-2 rounded-full"
          style={{ backgroundColor: mode.themeColor }}
          aria-hidden
        />
        <span className="font-medium">
          {Math.round(normalizedValue)} strength
        </span>
      </div>
      <dl className="space-y-1 text-slate-600">
        <div className="flex items-center justify-between gap-6">
          <dt className="font-medium">{mode.label.replace(/ Focus$/, "")}</dt>
          <dd className="font-semibold text-slate-900">
            {mode.statFormatter(primaryStat)}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-6">
          <dt className="font-medium">Catalog depth</dt>
          <dd>{numberFormatter.format(metric.productCount)} total</dd>
        </div>
        <div className="flex items-center justify-between gap-6">
          <dt className="font-medium">Signal</dt>
          <dd>{mode.secondary(metric)}</dd>
        </div>
      </dl>
    </div>
  )
}

interface InteractiveTrendRadarProps {
  categories: TrendRadarCategoryMetrics[]
  totals: {
    products: number
    trendingProducts: number
    upvotes: number
  }
}

export default function InteractiveTrendRadar({
  categories,
  totals,
}: InteractiveTrendRadarProps) {
  const [modeKey, setModeKey] = useState<ViewModeKey>("momentum")

  const mode = VIEW_MODES.find((item) => item.key === modeKey) ?? VIEW_MODES[0]

  const chartData = useMemo<ChartDatum[]>(
    () =>
      categories.map((category) => ({
        label: category.name,
        momentum: category.normalizedMomentum,
        depth: category.normalizedDepth,
        signal: category.normalizedSignal,
        metric: category,
      })),
    [categories],
  )

  const sortedByMode = useMemo(() => {
    const metricKey = mode.metricKey
    return [...categories].sort(
      (a, b) => (b[metricKey] ?? 0) - (a[metricKey] ?? 0),
    )
  }, [categories, mode.metricKey])

  if (!categories.length) {
    return null
  }

  return (
    <PublicContainer
      as="section"
      paddingY="py-20"
      max="7xl"
      className="relative overflow-hidden border-b bg-background/85 shadow-[0px_50px_120px_-90px_rgba(7,58,104,0.95)] backdrop-blur"
      innerClassName="relative"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-[color:var(--brand-3)/0.35] to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-20"
        style={{
          backgroundImage:
            "radial-gradient(140%_90%_at_85%_110%, rgba(6, 38, 68, 0.24), transparent 78%), radial-gradient(95%_70%_at_10%_20%, rgba(5, 30, 54, 0.2), transparent 70%)",
          maskImage:
            "radial-gradient(90%_100%_at_50%_95%, rgba(0,0,0,0.95), transparent 78%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-30 opacity-25"
        style={{
          backgroundImage:
            "radial-gradient(120%_120%_at_50%_0%, rgba(0, 53, 102, 0.25), transparent 75%)",
        }}
      />

      <div className="relative space-y-10">
        <PageSectionHeader
          eyebrow="Trend Radar"
          title="Chart The Hottest Currents"
          subtitle="Take a scan of where builders and upvotes are concentrating this week."
        />

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
          <ChartContainer
            config={{
              momentum: { label: "Launch Momentum", color: "var(--brand-2)" },
              depth: { label: "Fleet Depth", color: "var(--brand-1)" },
              signal: { label: "Signal Strength", color: "var(--brand-3)" },
            }}
            className="h-full"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {VIEW_MODES.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setModeKey(item.key)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                      mode.key === item.key
                        ? "border-[color:var(--brand-3)/0.5] bg-[color:var(--brand-3)/0.08] text-[color:var(--brand-3)]"
                        : "border-transparent bg-slate-100/60 text-slate-500 hover:bg-slate-100",
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-500">
                Scores scale relative to the hottest category in view.
              </p>
            </div>

            <p className="mt-2 text-sm text-slate-600">{mode.description}</p>

            <div className="mt-6 w-full">
              <ResponsiveContainer width="100%" height={360}>
                <RadarChart data={chartData} outerRadius="80%">
                  <PolarGrid className="stroke-slate-200" />
                  <PolarAngleAxis
                    dataKey="label"
                    tick={{ fill: "#475569", fontSize: 12 }}
                  />
                  <PolarRadiusAxis
                    tick={{ fill: "#94a3b8", fontSize: 10 }}
                    angle={90}
                    domain={[0, 100]}
                    axisLine={false}
                    tickLine={false}
                  />
                  <RechartsTooltip
                    cursor={false}
                    content={<TrendRadarTooltip mode={mode} />}
                  />
                  <Radar
                    name={mode.label}
                    dataKey={
                      mode.metricKey === "normalizedMomentum"
                        ? "momentum"
                        : mode.metricKey === "normalizedDepth"
                          ? "depth"
                          : "signal"
                    }
                    stroke={mode.themeColor}
                    fill={mode.themeColor}
                    fillOpacity={0.18}
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </ChartContainer>

          <aside className="space-y-6 rounded-xl border border-slate-200/70 bg-white/80 p-6 shadow-sm backdrop-blur">
            <div className="space-y-2 text-sm text-slate-600">
              <p>
                Scanning {categories.length} standout categories fueled by{" "}
                {totals.trendingProducts} recent trending launches and{" "}
                {numberFormatter.format(totals.upvotes)} upvotes.
              </p>
              <p>
                Use the lenses to spot where to discover products, or which
                harbors are primed for your next launch.
              </p>
            </div>

            <div className="space-y-3">
              {sortedByMode.map((category, index) => {
                const normalizedValue = category[mode.metricKey]
                const primaryStat = category[mode.statKey]
                const secondaryLabel = mode.secondary(category)

                return (
                  <Link
                    key={category.id}
                    href={categoryPath(category.slug)}
                    className="group block rounded-lg border border-slate-100 bg-white/80 p-3 shadow-sm transition-all hover:border-[color:var(--brand-3)/0.4] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-3)/0.45]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                          <span className="text-xs font-medium text-slate-400">
                            #{index + 1}
                          </span>
                          <span className="transition-colors group-hover:text-[color:var(--brand-3)]">
                            {category.name}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {mode.statFormatter(primaryStat)} · {secondaryLabel}
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-slate-700">
                        {Math.round(normalizedValue)}
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200/70">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.max(4, Math.round(normalizedValue))}%`,
                          background: mode.themeColor,
                          opacity: 0.45,
                        }}
                      />
                    </div>
                  </Link>
                )
              })}
            </div>
          </aside>
        </div>
      </div>
    </PublicContainer>
  )
}

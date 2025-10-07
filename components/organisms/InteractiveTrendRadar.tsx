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
    themeColor: "#2563eb",
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
    themeColor: "#0ea5e9",
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
    themeColor: "#6366f1",
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
  className?: string
}

export default function InteractiveTrendRadar({
  categories,
  totals,
  className,
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
    <section
      className={cn(
        "rounded-3xl border border-border bg-white px-6 py-8 shadow-sm md:px-8",
        className,
      )}
    >
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
          Trend radar
        </span>
        <h3 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
          See which categories are heating up
        </h3>
        <p className="text-sm text-muted-foreground md:text-base">
          Compare momentum, depth, and signal strength to spot where launches
          are gaining traction this week.
        </p>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
        <ChartContainer
          config={{
            momentum: { label: "Launch Momentum", color: "#2563eb" },
            depth: { label: "Catalog Depth", color: "#0ea5e9" },
            signal: { label: "Signal Strength", color: "#6366f1" },
          }}
          className="border border-border/60 bg-muted/20 p-5 shadow-none"
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
                      ? "border-foreground/20 bg-foreground/[0.08] text-foreground"
                      : "border-border bg-white text-muted-foreground hover:text-foreground",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Scores scale to the strongest category in view.
            </p>
          </div>

          <p className="mt-2 text-sm text-muted-foreground">
            {mode.description}
          </p>

          <div className="mt-6 w-full">
            <ResponsiveContainer width="100%" height={340}>
              <RadarChart data={chartData} outerRadius="78%">
                <PolarGrid className="stroke-border/70" />
                <PolarAngleAxis
                  dataKey="label"
                  tick={{ fill: "#4b5563", fontSize: 12 }}
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

        <aside className="space-y-6">
          <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
            <p>
              Tracking {categories.length} standout categories supported by{" "}
              {totals.trendingProducts} trending launches and{" "}
              {numberFormatter.format(totals.upvotes)} upvotes in the last
              window.
            </p>
            <p className="mt-2">
              Use the view toggles to find fertile ground for your launch or
              discover new projects to follow.
            </p>
          </div>

          <div className="space-y-4">
            {sortedByMode.map((category, index) => {
              const normalizedValue = category[mode.metricKey]
              const primaryStat = category[mode.statKey]
              const secondaryLabel = mode.secondary(category)

              return (
                <Link
                  key={category.id}
                  href={categoryPath(category.slug)}
                  className="group flex items-start justify-between gap-4 rounded-2xl border border-border/60 bg-white px-4 py-3 transition hover:border-border hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[--ring]"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <span className="text-xs font-medium text-muted-foreground">
                        #{index + 1}
                      </span>
                      <span className="transition-colors group-hover:text-foreground">
                        {category.name}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {mode.statFormatter(primaryStat)} · {secondaryLabel}
                    </div>
                    <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-foreground/40"
                        style={{
                          width: `${Math.max(6, Math.round(normalizedValue))}%`,
                        }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-foreground/80">
                    {Math.round(normalizedValue)}
                  </span>
                </Link>
              )
            })}
          </div>
        </aside>
      </div>
    </section>
  )
}

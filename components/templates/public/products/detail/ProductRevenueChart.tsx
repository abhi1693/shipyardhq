"use client"

import { useMemo, useState } from "react"

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/select"

import { ShieldCheckIcon } from "lucide-react"

type RevenuePoint = {
  label: string
  periodStart: string
  allTimeRevenueCents: number
  periodRevenueCents: number
}

type RevenueSummary = {
  currencyCode: string
  latestAllTimeRevenueCents: number
  provider?: string
  lastSyncedAt?: string | null
}

function formatCurrency(amountCents: number, currency?: string) {
  const code = currency || "USD"
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      maximumFractionDigits: 0,
    }).format((amountCents || 0) / 100)
  } catch {
    return `$${((amountCents || 0) / 100).toFixed(0)}`
  }
}

export function ProductRevenueChart({
  points,
  summary,
}: {
  points: RevenuePoint[]
  summary: RevenueSummary
}) {
  const currency = summary.currencyCode || "USD"
  const [range, setRange] = useState<
    "24h" | "7d" | "1m" | "3m" | "6m" | "1y" | "all"
  >("all")

  const filtered = useMemo(() => {
    let cutoff: Date | null = null
    if (range !== "all") {
      const now = new Date()
      cutoff = new Date(now)
      if (range === "24h") cutoff.setDate(now.getDate() - 1)
      if (range === "7d") cutoff.setDate(now.getDate() - 7)
      if (range === "1m") cutoff.setMonth(now.getMonth() - 1)
      if (range === "3m") cutoff.setMonth(now.getMonth() - 3)
      if (range === "6m") cutoff.setMonth(now.getMonth() - 6)
      if (range === "1y") cutoff.setFullYear(now.getFullYear() - 1)
    }
    return points
      .filter((p) => (cutoff ? new Date(p.periodStart) >= cutoff : true))
      .map((point) => ({
        date: new Date(point.periodStart),
        label: point.label,
        revenue: point.periodRevenueCents / 100,
      }))
  }, [points, range])

  const aggregated = useMemo(() => {
    const bucketKey = (d: Date) => {
      switch (range) {
        case "24h":
        case "7d":
          return d.toISOString().slice(0, 10) // daily
        case "1m":
        case "3m":
        case "6m": {
          const weekStart = new Date(
            Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
          )
          const day = weekStart.getUTCDay()
          // Normalize to Monday as start of week
          weekStart.setUTCDate(weekStart.getUTCDate() - ((day + 6) % 7))
          return `w-${weekStart.toISOString().slice(0, 10)}`
        }
        case "1y":
        case "all":
        default:
          return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
      }
    }

    const bucketDate = (key: string) => {
      if (key.startsWith("w-")) return new Date(`${key.slice(2)}T00:00:00.000Z`)
      if (key.length === 7) {
        const [year, month] = key.split("-").map(Number)
        return new Date(Date.UTC(year, (month || 1) - 1, 1))
      }
      return new Date(key)
    }

    const byBucket = new Map<
      string,
      { date: Date; revenue: number }
    >()
    for (const point of filtered) {
      const d = point.date
      const key = bucketKey(d)
      const start = bucketDate(key)
      const existing = byBucket.get(key)
      const updated = {
        date: existing?.date ?? start,
        revenue: (existing?.revenue ?? 0) + point.revenue,
      }
      byBucket.set(key, updated)
    }
    return Array.from(byBucket.values()).sort(
      (a, b) => a.date.getTime() - b.date.getTime(),
    )
  }, [filtered, range])

  const formatValue = (value: number) =>
    formatCurrency(Math.round(value * 100), currency)
  const chartData = aggregated.map((point) => ({
    ...point,
    value: point.revenue,
  }))

  const revenueDisplay =
    typeof summary.latestAllTimeRevenueCents === "number"
      ? formatCurrency(summary.latestAllTimeRevenueCents, currency)
      : null

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3">
          <p className="text-lg font-semibold">Verified revenue</p>
          {revenueDisplay ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-semibold text-foreground">
              Total revenue: {revenueDisplay}
            </span>
          ) : null}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
          <Select
            value={range}
            onValueChange={(value) =>
              setRange(
                value as "24h" | "7d" | "1m" | "3m" | "6m" | "1y" | "all",
              )
            }
          >
            <SelectTrigger className="h-10 min-w-[150px] px-3 text-sm font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="w-[180px] text-sm">
              <SelectItem value="24h">Last 24 hours</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="1m">Last 1 month</SelectItem>
              <SelectItem value="3m">Last 3 months</SelectItem>
              <SelectItem value="6m">Last 6 months</SelectItem>
              <SelectItem value="1y">Last 1 year</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="hsl(221, 83%, 53%)"
                  stopOpacity={0.25}
                />
                <stop
                  offset="95%"
                  stopColor="hsl(221, 83%, 53%)"
                  stopOpacity={0.03}
                />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(220, 13%, 90%)"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tickFormatter={(value) =>
                new Intl.DateTimeFormat("en-US", {
                  month: "short",
                  year: "numeric",
                  day:
                    range === "24h" || range === "7d" ? "numeric" : undefined,
                }).format(new Date(value))
              }
              tick={{ fontSize: 11, fill: "hsl(215, 16%, 40%)" }}
            />
            <YAxis
              tickFormatter={(value) => formatValue(Number(value))}
              tick={{ fontSize: 11, fill: "hsl(215, 16%, 40%)" }}
              width={80}
            />
            <Tooltip
              formatter={(value: any) => [
                formatValue(Number(value)),
                "Revenue",
              ]}
              labelFormatter={(label) => {
                const date = new Date(label)
                const isWeekly =
                  range === "1m" || range === "3m" || range === "6m"
                const isMonthly = range === "all" || range === "1y"

                if (isWeekly) {
                  const formatted = new Intl.DateTimeFormat("en-US", {
                    month: "short",
                    day: "numeric",
                  }).format(date)
                  return `Week of ${formatted}`
                }

                const formatted = new Intl.DateTimeFormat("en-US", {
                  month: "short",
                  year: "numeric",
                  day: isMonthly ? undefined : "numeric",
                }).format(date)
                return formatted
              }}
              contentStyle={{
                borderRadius: 10,
                borderColor: "hsl(220, 13%, 85%)",
                boxShadow: "0 8px 20px rgba(15, 23, 42, 0.15)",
                fontSize: 12,
              }}
              itemStyle={{ fontWeight: 700, fontSize: 12, color: "#111" }}
              labelStyle={{ fontWeight: 600, fontSize: 12, color: "#111" }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="hsl(221, 83%, 53%)"
              fillOpacity={1}
              fill="url(#chartFill)"
              strokeWidth={2}
              activeDot={{ r: 4 }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {summary.lastSyncedAt ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ShieldCheckIcon className="h-4 w-4 text-foreground/80" aria-hidden />
          <span>
            All revenue is verified through{" "}
            <span className="font-semibold">
              {summary.provider
                ? summary.provider.charAt(0).toUpperCase() +
                  summary.provider.slice(1)
                : "Connected provider"}
            </span>{" "}
            API keys. Last updated:{" "}
            {new Date(summary.lastSyncedAt).toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      ) : null}
    </section>
  )
}

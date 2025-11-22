"use client"

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

type Point = {
  date: string
  label: string
  valueCents: number
}

function formatCurrency(amountCents: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format((amountCents || 0) / 100)
  } catch {
    return `$${((amountCents || 0) / 100).toFixed(0)}`
  }
}

export function AdminRevenueChart({
  points,
  currency,
}: {
  points: Point[]
  currency: string
}) {
  if (!points.length) {
    return (
      <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
        No revenue recorded for this range.
      </div>
    )
  }

  const chartData = points.map((point) => ({
    ...point,
    value: point.valueCents / 100,
  }))

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="adminRevenueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0.28} />
              <stop offset="95%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0.04} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 90%)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "hsl(215, 16%, 40%)" }}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={(value) => formatCurrency(Number(value) * 100, currency)}
            tick={{ fontSize: 11, fill: "hsl(215, 16%, 40%)" }}
            width={90}
          />
          <Tooltip
            formatter={(value: any) => [formatCurrency(Number(value) * 100, currency), "Revenue"]}
            labelFormatter={(label) => label}
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
            fill="url(#adminRevenueFill)"
            strokeWidth={2}
            activeDot={{ r: 4 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

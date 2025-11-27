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

type TrafficPoint = {
  label: string
  pageViews: number
  uniqueVisitors: number
}

export function ProductTrafficChart({
  points,
}: {
  points: TrafficPoint[]
}) {
  if (!points.length) {
    return null
  }

  return (
    <div className="w-full space-y-3">
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={points}
            margin={{ top: 12, right: 24, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="productViewsFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.28} />
                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient
                id="productVisitorsFill"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.26} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(220, 13%, 90%)"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "hsl(215, 16%, 40%)" }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 11, fill: "hsl(215, 16%, 40%)" }}
              width={60}
              allowDecimals={false}
            />
            <Tooltip
              formatter={(value: any, name) => [
                new Intl.NumberFormat("en-US").format(Number(value) || 0),
                name === "pageViews" ? "Page views" : "Unique visitors",
              ]}
              labelFormatter={(label) => label}
              contentStyle={{
                borderRadius: 10,
                borderColor: "hsl(220, 13%, 85%)",
                boxShadow: "0 8px 20px rgba(15, 23, 42, 0.12)",
                fontSize: 12,
              }}
              itemStyle={{ fontWeight: 600, fontSize: 12, color: "#0f172a" }}
              labelStyle={{ fontWeight: 600, fontSize: 12, color: "#0f172a" }}
            />
            <Area
              type="monotone"
              dataKey="pageViews"
              stroke="#0ea5e9"
              fillOpacity={1}
              fill="url(#productViewsFill)"
              strokeWidth={2}
              activeDot={{ r: 4 }}
              name="pageViews"
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="uniqueVisitors"
              stroke="#6366f1"
              fillOpacity={1}
              fill="url(#productVisitorsFill)"
              strokeWidth={2}
              activeDot={{ r: 4 }}
              name="uniqueVisitors"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-2.5 w-2.5 rounded-full bg-sky-500" />
          <span className="font-medium text-slate-700">Page views</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex h-2.5 w-2.5 rounded-full bg-indigo-500" />
          <span className="font-medium text-slate-700">Unique visitors</span>
        </div>
      </div>
    </div>
  )
}

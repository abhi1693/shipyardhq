"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"
import { ChartContainer, type ChartConfig } from "@/components/atoms/chart"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/atoms/tooltip"
import type { ProductTrafficSummary } from "@/types/analytics"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts"
import { Info } from "lucide-react"

const DEVICE_COLORS: Record<string, string> = {
  desktop: "#2563eb",
  mobile: "#16a34a",
  tablet: "#f97316",
  unknown: "#94a3b8",
}

const COUNTRY_COLORS = ["#2563eb", "#f97316", "#16a34a", "#6366f1", "#ef4444"]

const TREND_COLORS = {
  views: "#2563eb",
  uniqueVisitors: "#0ea5e9",
  clicks: "#f97316",
  upvotes: "#22c55e",
}

const ENGAGEMENT_COLORS = {
  clicks: TREND_COLORS.clicks,
  upvotes: TREND_COLORS.upvotes,
}

function formatPercent(value: number) {
  return `${Math.round(value)}%`
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
    value,
  )
}

interface ProductAnalyticsChartsProps {
  summary: ProductTrafficSummary
}

export function ProductAnalyticsCharts({
  summary,
}: ProductAnalyticsChartsProps) {
  const deviceConfig: ChartConfig = Object.fromEntries(
    summary.deviceBreakdown.map((entry) => [
      entry.device,
      {
        label: entry.label,
        color: DEVICE_COLORS[entry.device] ?? DEVICE_COLORS.unknown,
      },
    ]),
  )

  const topCountries = summary.countryBreakdown.slice(0, 5)
  const topBrowsers = summary.browserBreakdown.slice(0, 8)
  
  const hasUniqueSeries = summary.viewsOverTime.some(
    (point) => point.uniqueVisitors > 0,
  )
  const hasEngagementSeries = summary.engagementOverTime.some(
    (point) => point.clicks > 0 || point.upvotes > 0,
  )

  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-12">
      <Card className="md:col-span-2 xl:col-span-7 border border-slate-200 bg-white/95 shadow-sm">
        <CardHeader className="px-4 pb-0">
          <CardTitle className="flex items-center gap-2">
            Views over time
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className="inline-flex h-5 w-5 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus:ring-2 focus:ring-slate-200/70 focus:ring-offset-2 cursor-help"
                  tabIndex={0}
                  role="button"
                  aria-label="View chart description"
                >
                  <Info className="h-4 w-4" aria-hidden />
                </span>
              </TooltipTrigger>
              <TooltipContent sideOffset={6}>
                Daily view counts for the selected window. Use this to spot
                trends and campaign lift.
              </TooltipContent>
            </Tooltip>
          </CardTitle>
          <CardDescription>
            Last {summary.rangeDays} days vs. previous period
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-5 pt-4">
          <ChartContainer
            config={{
              views: { label: "Views", color: TREND_COLORS.views },
              uniqueVisitors: {
                label: "Unique visitors",
                color: TREND_COLORS.uniqueVisitors,
              },
            }}
            className="min-h-[280px]"
          >
            <ResponsiveContainer width="100%" height={260}>
              <LineChart
                data={summary.viewsOverTime}
                margin={{ left: 4, right: 12 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="label"
                  stroke="currentColor"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="currentColor"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatNumber}
                />
                <Line
                  type="monotone"
                  dataKey="views"
                  stroke="var(--chart-views)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                {hasUniqueSeries ? (
                  <Line
                    type="monotone"
                    dataKey="uniqueVisitors"
                    stroke="var(--chart-uniqueVisitors)"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                ) : null}
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className="md:col-span-1 xl:col-span-5 border border-slate-200 bg-white/95 shadow-sm">
        <CardHeader className="px-4 pb-0">
          <CardTitle className="flex items-center gap-2">
            Device split
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className="inline-flex h-5 w-5 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus:ring-2 focus:ring-slate-200/70 focus:ring-offset-2 cursor-help"
                  tabIndex={0}
                  role="button"
                  aria-label="View device split description"
                >
                  <Info className="h-4 w-4" aria-hidden />
                </span>
              </TooltipTrigger>
              <TooltipContent sideOffset={6}>
                Shows how visitors reach you by device category. Helpful for
                prioritising responsive fixes.
              </TooltipContent>
            </Tooltip>
          </CardTitle>
          <CardDescription>Breakdown by detected device type</CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-5 pt-4">
          <ChartContainer config={deviceConfig} className="min-h-[280px]">
            {summary.deviceBreakdown.length === 0 ? (
              <p className="py-8 text-center text-base text-muted-foreground">
                No device signals on the radar yet. Once traffic sets sail, this
                compass will light up.
              </p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={summary.deviceBreakdown}
                      dataKey="views"
                      nameKey="label"
                      innerRadius={60}
                      strokeWidth={2}
                    >
                      {summary.deviceBreakdown.map((entry) => (
                        <Cell
                          key={entry.device}
                          fill={`var(--chart-${entry.device})`}
                          name={entry.label}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-3">
                  {summary.deviceBreakdown.map((entry) => (
                    <div
                      key={entry.device}
                      className="flex items-center gap-2 text-sm"
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{
                          backgroundColor:
                            entry.device in deviceConfig
                              ? deviceConfig[entry.device]!.color
                              : DEVICE_COLORS.unknown,
                        }}
                      />
                      <span className="text-muted-foreground">
                        {entry.label}
                      </span>
                      <span className="ml-auto font-medium">
                        {formatNumber(entry.views)} (
                        {formatPercent(
                          (entry.views / Math.max(summary.totalViews, 1)) * 100,
                        )}
                        )
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className="md:col-span-2 xl:col-span-7 border border-slate-200 bg-white/95 shadow-sm">
        <CardHeader className="px-4 pb-0">
          <CardTitle className="flex items-center gap-2">
            Clicks & upvotes
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className="inline-flex h-5 w-5 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus:ring-2 focus:ring-slate-200/70 focus:ring-offset-2 cursor-help"
                  tabIndex={0}
                  role="button"
                  aria-label="View engagement chart description"
                >
                  <Info className="h-4 w-4" aria-hidden />
                </span>
              </TooltipTrigger>
              <TooltipContent sideOffset={6}>
                Daily Shipyard engagement—CTA clicks and new upvotes collected
                during the selected window.
              </TooltipContent>
            </Tooltip>
          </CardTitle>
          <CardDescription>
            Last {summary.rangeDays} days of product interactions
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-5 pt-4">
          {hasEngagementSeries ? (
            <ChartContainer
              config={{
                clicks: { label: "Clicks", color: ENGAGEMENT_COLORS.clicks },
                upvotes: { label: "Upvotes", color: ENGAGEMENT_COLORS.upvotes },
              }}
              className="min-h-[280px]"
            >
              <ResponsiveContainer width="100%" height={260}>
                <LineChart
                  data={summary.engagementOverTime}
                  margin={{ left: 4, right: 12 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                  />
                  <XAxis
                    dataKey="label"
                    stroke="currentColor"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="currentColor"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={formatNumber}
                  />
                  <Line
                    type="monotone"
                    dataKey="clicks"
                    stroke="var(--chart-clicks)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="upvotes"
                    stroke="var(--chart-upvotes)"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          ) : (
            <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-10 text-center text-base text-muted-foreground">
              Engagement lines will appear once Shipyard records fresh clicks or
              upvotes for this product.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="md:col-span-1 xl:col-span-5 border border-slate-200 bg-white/95 shadow-sm">
        <CardHeader className="px-4 pb-0">
          <CardTitle className="flex items-center gap-2">
            Browsers
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className="inline-flex h-5 w-5 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus:ring-2 focus:ring-slate-200/70 focus:ring-offset-2 cursor-help"
                  tabIndex={0}
                  role="button"
                  aria-label="View browser distribution description"
                >
                  <Info className="h-4 w-4" aria-hidden />
                </span>
              </TooltipTrigger>
              <TooltipContent sideOffset={6}>
                Browser mix during the range. Helpful for verifying
                compatibility and testing coverage.
              </TooltipContent>
            </Tooltip>
          </CardTitle>
          <CardDescription>
            Top user agents observed in this window
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-5 pt-4">
          {topBrowsers.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-10 text-center text-base text-muted-foreground">
              No browser fleet on the horizon yet. When the crew grows, we’ll
              map their vessels here.
            </p>
          ) : (
            <ChartContainer
              className="min-h-[300px]"
              config={{ views: { label: "Views", color: "#8b5cf6" } }}
            >
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={topBrowsers.map((entry) => ({
                    ...entry,
                    browserLabel: entry.browser || "Unknown",
                  }))}
                  layout="vertical"
                  margin={{ left: 12, right: 12, top: 12, bottom: 12 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    stroke="currentColor"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={formatNumber}
                  />
                  <YAxis
                    type="category"
                    dataKey="browserLabel"
                    stroke="currentColor"
                    fontSize={12}
                    width={110}
                  />
                  <Bar
                    dataKey="views"
                    radius={[0, 4, 4, 0]}
                    fill="var(--chart-views)"
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-7">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Top countries
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className="inline-flex h-5 w-5 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-help"
                  tabIndex={0}
                  role="button"
                  aria-label="View country breakdown description"
                >
                  <Info className="h-4 w-4" aria-hidden />
                </span>
              </TooltipTrigger>
              <TooltipContent sideOffset={6}>
                Leading geographies for recent traffic. Pair with marketing
                campaigns to localise messaging.
              </TooltipContent>
            </Tooltip>
          </CardTitle>
          <CardDescription>Most active visitor locations</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer className="min-h-[280px]">
            {topCountries.length === 0 ? (
              <p className="py-8 text-center text-base text-muted-foreground">
                No ports of call yet—when visitors arrive, we’ll chart their map
                across the globe.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={topCountries}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                  />
                  <XAxis
                    dataKey="country"
                    stroke="currentColor"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="currentColor"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={formatNumber}
                  />
                  <Bar dataKey="views" radius={[4, 4, 0, 0]}>
                    {topCountries.map((entry, index) => (
                      <Cell
                        key={entry.country}
                        fill={COUNTRY_COLORS[index % COUNTRY_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className="lg:col-span-5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Top referrers
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className="inline-flex h-5 w-5 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-help"
                  tabIndex={0}
                  role="button"
                  aria-label="View referrer list description"
                >
                  <Info className="h-4 w-4" aria-hidden />
                </span>
              </TooltipTrigger>
              <TooltipContent sideOffset={6}>
                External sources sending visitors. Use this to double down on
                high-performing partnerships.
              </TooltipContent>
            </Tooltip>
          </CardTitle>
          <CardDescription>
            Top external sources sending visitors
          </CardDescription>
        </CardHeader>
        <CardContent>
          {summary.referrerBreakdown.length === 0 ? (
            <p className="py-8 text-center text-base text-muted-foreground">
              The logbook is empty—no inbound currents detected. Once ships send
              visitors our way, they’ll appear here.
            </p>
          ) : (
            <ul className="space-y-3 text-sm">
              {summary.referrerBreakdown.slice(0, 6).map((entry) => (
                <li key={entry.referrer} className="flex items-center gap-2">
                  <span className="truncate text-muted-foreground">
                    {entry.referrer}
                  </span>
                  <span className="ml-auto font-medium">
                    {formatNumber(entry.views)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

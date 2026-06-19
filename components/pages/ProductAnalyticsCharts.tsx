"use client"

import { type ChartConfig } from "@/components/atoms/chart"
import { AnalyticsChartCard } from "@/components/molecules/AnalyticsChartCard"
import {
  LazyAnalyticsBarChart,
  LazyAnalyticsLineChart,
  LazyAnalyticsPieChart,
  type AnalyticsLineDefinition,
} from "@/components/molecules/LazyAnalyticsCharts"
import type { ProductTrafficSummary } from "@/types/analytics"

const DEVICE_COLORS: Record<string, string> = {
  desktop: "#2563eb",
  mobile: "#16a34a",
  tablet: "#f97316",
  unknown: "#94a3b8",
}

const DEVICE_LABELS: Record<string, string> = {
  desktop: "Desktop",
  mobile: "Mobile",
  tablet: "Tablet",
  unknown: "Unknown device",
}

const COUNTRY_COLORS = ["#2563eb", "#f97316", "#16a34a", "#6366f1", "#ef4444"]

const TREND_COLORS = {
  views: "#2563eb",
  uniqueVisitors: "#0ea5e9",
  upvotes: "#22c55e",
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
  mode?: "basic" | "advanced"
  showUserAgents?: boolean
}

export function ProductAnalyticsCharts({
  summary,
  mode = "advanced",
  showUserAgents = true,
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
  const topUserAgents = showUserAgents
    ? summary.userAgentBreakdown.slice(0, 6)
    : []

  const hasUniqueSeries = summary.viewsOverTime.some(
    (point) => point.uniqueVisitors > 0,
  )
  const hasEngagementSeries = summary.engagementOverTime.some(
    (point) => point.upvotes > 0,
  )

  const getDeviceColor = (device?: string | null) =>
    (device && deviceConfig[device]?.color) ?? DEVICE_COLORS.unknown

  const isAdvanced = mode === "advanced"

  const renderViewsCard = (className?: string) => {
    const chartConfig: ChartConfig = {
      views: { label: "Views", color: TREND_COLORS.views },
    }

    if (hasUniqueSeries) {
      chartConfig.uniqueVisitors = {
        label: "Unique visitors",
        color: TREND_COLORS.uniqueVisitors,
      }
    }

    const lineDefinitions: AnalyticsLineDefinition<
      (typeof summary.viewsOverTime)[number]
    >[] = [{ dataKey: "views" }]

    if (hasUniqueSeries) {
      lineDefinitions.push({
        dataKey: "uniqueVisitors",
        strokeDasharray: "4 4",
      })
    }

    return (
      <AnalyticsChartCard
        className={className}
        title="Views over time"
        description={`Last ${summary.rangeDays} days vs. previous period`}
        tooltip="Daily view counts for the selected window. Use this to spot trends and campaign lift."
        infoLabel="View chart description"
        headerClassName="px-4 pb-0"
        contentClassName="px-4 pb-5 pt-4"
      >
        <LazyAnalyticsLineChart
          className="min-h-[280px]"
          data={summary.viewsOverTime}
          config={chartConfig}
          lines={lineDefinitions}
          yTickFormatter={formatNumber}
          tooltipFormatter={formatNumber}
          cursorStroke="var(--chart-views)"
        />
      </AnalyticsChartCard>
    )
  }

  const renderDeviceCard = (className?: string) => (
    <AnalyticsChartCard
      className={className}
      title="Device split"
      description="Breakdown by detected device type"
      tooltip="Shows how visitors reach you by device category. Helpful for prioritising responsive fixes."
      infoLabel="View device split description"
      headerClassName="px-4 pb-0"
      contentClassName="px-4 pb-5 pt-4"
    >
      {summary.deviceBreakdown.length === 0 ? (
        <p className="py-8 text-center text-base text-muted-foreground">
          No device signals on the radar yet. Once traffic picks up, this
          compass will light up.
        </p>
      ) : (
        <LazyAnalyticsPieChart
          className="min-h-[280px]"
          data={summary.deviceBreakdown}
          config={deviceConfig}
          dataKey="views"
          nameKey="label"
          innerRadius={60}
          strokeWidth={2}
          tooltip={{
            valueFormatter: (value) => {
              if (!summary.totalViews) {
                return formatNumber(value)
              }
              const percent = (value / Math.max(summary.totalViews, 1)) * 100
              return `${formatNumber(value)} (${formatPercent(percent)})`
            },
          }}
          cells={summary.deviceBreakdown.map((entry) => ({
            fill: getDeviceColor(entry.device),
            name: entry.label,
          }))}
          legend={
            <div className="grid grid-cols-2 gap-3">
              {summary.deviceBreakdown.map((entry) => (
                <div
                  key={entry.device}
                  className="flex items-center gap-2 text-sm"
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: getDeviceColor(entry.device) }}
                  />
                  <span className="text-muted-foreground">{entry.label}</span>
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
          }
        />
      )}
    </AnalyticsChartCard>
  )

  const renderEngagementCard = (className?: string) => {
    const lineDefinitions: AnalyticsLineDefinition<
      (typeof summary.engagementOverTime)[number]
    >[] = [{ dataKey: "upvotes" }]

    return (
      <AnalyticsChartCard
        className={className}
        title="Upvotes"
        description={`Last ${summary.rangeDays} days of product interactions`}
        tooltip="Daily Shipyard engagement—new upvotes collected during the selected window."
        infoLabel="View engagement chart description"
        headerClassName="px-4 pb-0"
        contentClassName="px-4 pb-5 pt-4"
      >
        {hasEngagementSeries ? (
          <LazyAnalyticsLineChart
            className="min-h-[280px]"
            data={summary.engagementOverTime}
            config={{
              upvotes: { label: "Upvotes", color: TREND_COLORS.upvotes },
            }}
            lines={lineDefinitions}
            yTickFormatter={formatNumber}
            tooltipFormatter={formatNumber}
            cursorStroke="var(--chart-views)"
          />
        ) : (
          <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-10 text-center text-base text-muted-foreground">
            Engagement lines will appear once Shipyard records fresh upvotes for
            this product.
          </p>
        )}
      </AnalyticsChartCard>
    )
  }

  const renderBrowserCard = (className?: string) => {
    const browserChartData = topBrowsers.map((entry) => ({
      ...entry,
      browserLabel: entry.browser || "Unknown",
    }))

    return (
      <AnalyticsChartCard
        className={className}
        title="Browsers"
        description="Top user agents observed in this window"
        tooltip="Browser mix during the range. Helpful for verifying compatibility and testing coverage."
        infoLabel="View browser distribution description"
        headerClassName="px-4 pb-0"
        contentClassName="px-4 pb-5 pt-4"
      >
        {topBrowsers.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-10 text-center text-base text-muted-foreground">
            No browser breakdown available yet. When traffic grows, we’ll map
            each browser here.
          </p>
        ) : (
          <LazyAnalyticsBarChart
            className="min-h-[300px]"
            data={browserChartData}
            config={{ views: { label: "Views", color: "#8b5cf6" } }}
            layout="vertical"
            height={280}
            margin={{ left: 12, right: 12, top: 12, bottom: 12 }}
            xAxis={{ type: "number", tickFormatter: formatNumber }}
            yAxis={{ type: "category", dataKey: "browserLabel", width: 110 }}
            grid={{ horizontal: false }}
            tooltip={{
              cursor: { fill: "rgba(139, 92, 246, 0.12)" },
              valueFormatter: formatNumber,
            }}
            bars={[{ dataKey: "views", barProps: { radius: [0, 4, 4, 0] } }]}
          />
        )}
      </AnalyticsChartCard>
    )
  }

  const renderUserAgentCard = (className?: string) => {
    const userAgentChartData = topUserAgents.map((entry, index) => {
      const labelParts: string[] = []
      if (entry.browser) labelParts.push(entry.browser)
      if (entry.os) labelParts.push(entry.os)
      const baseLabel =
        labelParts.length > 0 ? labelParts.join(" · ") : "Unknown stack"
      const deviceLabel = DEVICE_LABELS[entry.device] ?? DEVICE_LABELS.unknown
      const combinedLabel =
        entry.device && entry.device !== "unknown"
          ? `${baseLabel} (${deviceLabel})`
          : baseLabel
      return {
        key: `ua-${entry.browser ?? "unknown"}-${entry.os ?? "unknown"}-${entry.device}-${index}`,
        label: combinedLabel,
        views: entry.views,
      }
    })

    return (
      <AnalyticsChartCard
        className={className}
        title="User agents"
        description="Most common browser and OS combinations"
        tooltip="Cross-reference browser and OS pairs to spot compatibility clusters worth testing."
        infoLabel="View user agent distribution description"
        headerClassName="px-4 pb-0"
        contentClassName="px-4 pb-5 pt-4"
      >
        {topUserAgents.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-10 text-center text-base text-muted-foreground">
            User agent combinations will appear as Shipyard records browser and
            OS details for your traffic.
          </p>
        ) : (
          <LazyAnalyticsBarChart
            className="min-h-[300px]"
            data={userAgentChartData}
            config={{ views: { label: "Views", color: "#0ea5e9" } }}
            layout="vertical"
            height={280}
            margin={{ left: 12, right: 12, top: 12, bottom: 12 }}
            xAxis={{ type: "number", tickFormatter: formatNumber }}
            yAxis={{ type: "category", dataKey: "label", width: 160 }}
            grid={{ horizontal: false }}
            tooltip={{
              cursor: { fill: "rgba(14, 165, 233, 0.12)" },
              valueFormatter: formatNumber,
            }}
            bars={[{ dataKey: "views", barProps: { radius: [0, 4, 4, 0] } }]}
          />
        )}
      </AnalyticsChartCard>
    )
  }

  const renderCountriesCard = (className?: string) => (
    <AnalyticsChartCard
      className={className}
      title="Top countries"
      description="Most active visitor locations"
      tooltip="Leading geographies for recent traffic. Pair with marketing campaigns to localise messaging."
      infoLabel="View country breakdown description"
    >
      {topCountries.length === 0 ? (
        <p className="py-8 text-center text-base text-muted-foreground">
          No ports of call yet—when visitors arrive, we’ll chart their map
          across the globe.
        </p>
      ) : (
        <LazyAnalyticsBarChart
          className="min-h-[280px]"
          data={topCountries}
          config={{ views: { label: "Views" } }}
          height={260}
          xAxis={{ dataKey: "country" }}
          yAxis={{ tickFormatter: formatNumber }}
          tooltip={{
            cursor: { fill: "rgba(148, 163, 184, 0.12)" },
            valueFormatter: formatNumber,
          }}
          bars={[
            {
              dataKey: "views",
              barProps: { radius: [4, 4, 0, 0] },
              getCellProps: (_entry, index) => ({
                fill: COUNTRY_COLORS[index % COUNTRY_COLORS.length],
              }),
            },
          ]}
        />
      )}
    </AnalyticsChartCard>
  )

  const renderReferrersCard = (className?: string) => (
    <AnalyticsChartCard
      className={className}
      title="Top referrers"
      description="Top external sources sending visitors"
      tooltip="External sources sending visitors. Use this to double down on high-performing partnerships."
      infoLabel="View referrer list description"
    >
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
    </AnalyticsChartCard>
  )

  if (!isAdvanced) {
    return <div className="grid gap-6">{renderViewsCard()}</div>
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-12">
      {renderViewsCard("md:col-span-2 xl:col-span-7")}
      {renderDeviceCard("md:col-span-1 xl:col-span-5")}
      {renderEngagementCard("md:col-span-2 xl:col-span-7")}
      {renderBrowserCard("md:col-span-1 xl:col-span-5")}
      {showUserAgents
        ? renderUserAgentCard("md:col-span-1 xl:col-span-5")
        : null}
      {renderCountriesCard("lg:col-span-7")}
      {renderReferrersCard("lg:col-span-5")}
    </div>
  )
}

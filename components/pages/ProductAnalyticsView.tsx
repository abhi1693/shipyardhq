import Link from "next/link"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"
import { Button } from "@/components/atoms/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/atoms/tooltip"
import { ObjectPageLayout } from "@/components/layout/object-view/page-layout"
import RangeSelector from "@/components/molecules/RangeSelector"
import { ProductAnalyticsCharts } from "@/components/pages/ProductAnalyticsCharts"
import { cn } from "@/lib/utils"
import type { ProductTrafficSummary } from "@/types/analytics"
import type { ProductAnalytics } from "@/lib/vendor/prisma/client"
import { ArrowLeft, ExternalLink, Info } from "lucide-react"

const actionGroupClass =
  "flex flex-wrap items-center gap-2 rounded-full bg-white/80 px-2 py-1 shadow-sm ring-1 ring-slate-200/70"
const metricCardClass =
  "gap-4 rounded-xl border border-slate-200 bg-white/95 py-4 shadow-sm"
const metricLabelClass =
  "text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground"
const metricValueClass = "text-2xl font-semibold text-slate-900"
const metricHelperClass = "text-xs text-muted-foreground"
const deltaBaseClass =
  "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold"
const deltaPositiveClass = "border-emerald-200 bg-emerald-50 text-emerald-700"
const deltaNegativeClass = "border-rose-200 bg-rose-50 text-rose-700"

type RegionDisplayNames = {
  of(code: string): string | undefined
}

const countryDisplayNames: RegionDisplayNames | null =
  typeof Intl !== "undefined" &&
  typeof (Intl as any).DisplayNames === "function"
    ? (new (Intl as any).DisplayNames(["en"], {
        type: "region",
      }) as RegionDisplayNames)
    : null

function formatCountryName(country?: string | null) {
  if (!country) return "Unknown"
  if (countryDisplayNames) {
    try {
      const resolved = countryDisplayNames.of(country)
      if (resolved) return resolved
    } catch {
      // fall back to raw code when lookup fails
    }
  }
  return country
}

function DeltaBadge({ value }: { value: number }) {
  if (!Number.isFinite(value)) {
    return <span className={cn(deltaBaseClass, deltaPositiveClass)}>New</span>
  }
  if (value === 0) {
    return <span className="text-xs text-muted-foreground">0%</span>
  }
  const formatted = `${value > 0 ? "+" : ""}${value.toFixed(1)}%`
  return (
    <span
      className={cn(
        deltaBaseClass,
        value > 0 ? deltaPositiveClass : deltaNegativeClass,
      )}
    >
      {formatted}
    </span>
  )
}

function SummaryCards({
  summary,
  includeAdvanced,
  analytics,
}: {
  summary: ProductTrafficSummary
  includeAdvanced: boolean
  analytics?: Pick<ProductAnalytics, "upvotes" | "clicks"> | null
}) {
  const formatter = new Intl.NumberFormat("en-US")
  const upvotes = analytics?.upvotes ?? 0
  const clicks = analytics?.clicks ?? 0
  const clicksInRange = summary.clicksInRange
  const upvotesInRange = summary.upvotesInRange
  const formatRate = (value: number) =>
    Number.isFinite(value) ? `${value.toFixed(1)}%` : "—"

  const cards: Array<{
    title: string
    value: string
    delta?: number
    helper?: string
    tooltip?: string
  }> = [
    {
      title: "Lifetime upvotes",
      value: formatter.format(upvotes),
      helper: "Total community votes recorded on Shipyard.",
      tooltip:
        "All-time Shipyard upvotes for this product, combining public and member activity.",
    },
    {
      title: "Lifetime clicks",
      value: formatter.format(clicks),
      helper: "Tracked CTA clicks from your Shipyard product page.",
      tooltip:
        "Total clicks captured on Shipyard call-to-action buttons since tracking began.",
    },
    {
      title: `Total views (last ${summary.rangeDays}d)`,
      value: formatter.format(summary.totalViews),
      delta: summary.totalViewsChange,
      tooltip:
        "Total product page views in the current window compared with the previous period.",
    },
  ]

  if (includeAdvanced) {
    cards.push(
      {
        title: `CTA clicks (${summary.rangeDays}d)`,
        value: formatter.format(clicksInRange),
        delta: summary.clicksChange,
        helper: `${formatRate(summary.clickThroughRate)} CTR`,
        tooltip:
          "CTA clicks captured during this window compared with the previous period.",
      },
      {
        title: `New upvotes (${summary.rangeDays}d)`,
        value: formatter.format(upvotesInRange),
        delta: summary.upvotesChange,
        helper: `${formatRate(summary.upvoteConversionRate)} conversion`,
        tooltip:
          "Net new upvotes recorded during this window compared with the previous period.",
      },
      {
        title: "Unique visitors",
        value: formatter.format(summary.uniqueVisitors),
        delta: summary.uniqueVisitorsChange,
        tooltip:
          "Estimated unique visitors for this period. Useful for gauging reach beyond total views.",
      },
      {
        title: "Views today",
        value: formatter.format(summary.viewsToday),
        helper: `${formatter.format(summary.viewsSevenDays)} in the past 7 days`,
        tooltip:
          "How many views landed today alongside the trailing seven-day total for momentum checks.",
      },
      {
        title: "Avg. per day",
        value: summary.averageViewsPerDay.toLocaleString("en-US", {
          maximumFractionDigits: 1,
        }),
        tooltip:
          "Average daily volume within the window. Handy for benchmarking campaigns.",
      },
    )
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title} className={metricCardClass}>
          <CardContent className="px-4 py-0">
            <div className="space-y-3 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className={metricLabelClass}>{card.title}</div>
                  <div className="flex items-baseline gap-2">
                    <span className={metricValueClass}>{card.value}</span>
                    {typeof card.delta === "number" ? (
                      <DeltaBadge value={card.delta} />
                    ) : null}
                  </div>
                </div>
                {card.tooltip ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span
                        className="inline-flex h-5 w-5 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus:ring-2 focus:ring-slate-200/70 focus:ring-offset-2 cursor-help"
                        tabIndex={0}
                        role="button"
                        aria-label={`More info about ${card.title}`}
                      >
                        <Info className="h-4 w-4" aria-hidden />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent sideOffset={6}>
                      {card.tooltip}
                    </TooltipContent>
                  </Tooltip>
                ) : null}
              </div>
              {card.helper ? (
                <div className={metricHelperClass}>{card.helper}</div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

type BreakdownEntry = { label: string; views: number }

function BreakdownCard({
  title,
  subtitle,
  items,
  empty,
  colorPalette,
}: {
  title: string
  subtitle: string
  items: BreakdownEntry[]
  empty: string
  colorPalette?: string[]
}) {
  const formatter = new Intl.NumberFormat("en-US")
  const max = Math.max(...items.map((item) => item.views), 1)

  return (
    <Card className="rounded-2xl border border-slate-200 bg-white/95 shadow-sm">
      <CardHeader className="px-4 pb-0">
        <CardTitle className="text-base text-slate-900">{title}</CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          {subtitle}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4 pb-5 pt-4">
        {items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-xs text-muted-foreground">
            {empty}
          </p>
        ) : (
          <ul className="space-y-3">
            {items.map((item, index) => (
              <li key={item.label} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate text-slate-900">{item.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatter.format(item.views)} views
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200/60">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      colorPalette?.length
                        ? undefined
                        : "bg-gradient-to-r from-sky-500 via-sky-400 to-sky-500",
                    )}
                    style={{
                      width: `${Math.max(6, (item.views / max) * 100)}%`,
                      backgroundColor: colorPalette?.length
                        ? colorPalette[index % colorPalette.length]
                        : undefined,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

type ConversionEntry = {
  label: string
  views: number
  clicks: number
  rate: number
}

function ConversionCard({
  title,
  subtitle,
  items,
  empty,
}: {
  title: string
  subtitle: string
  items: ConversionEntry[]
  empty: string
}) {
  const formatter = new Intl.NumberFormat("en-US")

  return (
    <Card className="rounded-2xl border border-slate-200 bg-white/95 shadow-sm">
      <CardHeader className="px-4 pb-0">
        <CardTitle className="text-base text-slate-900">{title}</CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          {subtitle}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4 pb-5 pt-4">
        {items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-xs text-muted-foreground">
            {empty}
          </p>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <li
                key={item.label}
                className="flex items-start justify-between gap-3 text-sm"
              >
                <div>
                  <div className="font-medium text-slate-900">{item.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatter.format(item.views)} views ·{" "}
                    {formatter.format(item.clicks)} clicks
                  </div>
                </div>
                <div className="shrink-0 text-xs font-semibold text-slate-700">
                  {Number.isFinite(item.rate)
                    ? `${item.rate.toFixed(1)}% CTR`
                    : "—"}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function VisitorLoyaltyCard({
  data,
}: {
  data: ProductTrafficSummary["advanced"]["newVsReturning"]
}) {
  const formatter = new Intl.NumberFormat("en-US")
  const totalKnown = data.newVisitors + data.returningVisitors
  const totalAll = totalKnown + data.unknownVisitors
  const returningPercent = data.returningRate * 100
  const knownShare = totalAll > 0 ? (totalKnown / totalAll) * 100 : 0
  const returningShare =
    totalKnown > 0 ? (data.returningVisitors / totalKnown) * 100 : 0
  const newShare = totalKnown > 0 ? (data.newVisitors / totalKnown) * 100 : 0

  return (
    <Card className="rounded-2xl border border-slate-200 bg-white/95 shadow-sm">
      <CardHeader className="px-4 pb-0">
        <CardTitle className="text-base text-slate-900">
          Visitor loyalty
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Returning share among visitors with identifiable sessions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 px-4 pb-5 pt-4">
        <div className="flex items-baseline justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Returning rate
            </span>
            <div className="text-3xl font-semibold text-slate-900">
              {Number.isFinite(returningPercent)
                ? `${returningPercent.toFixed(1)}%`
                : "—"}
            </div>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <div>{formatter.format(data.returningVisitors)} returning</div>
            <div>{formatter.format(data.newVisitors)} new</div>
            <div>{formatter.format(data.unknownVisitors)} unknown</div>
          </div>
        </div>
        <div className="space-y-3 text-xs text-muted-foreground">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span>Known vs. unknown</span>
              <span>{knownShare.toFixed(0)}% known</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200/70">
              <div
                className="h-full rounded-full bg-sky-500"
                style={{ width: `${knownShare}%` }}
              />
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span>Returning vs. new (known visitors)</span>
              <span>
                {returningShare.toFixed(0)}% returning · {newShare.toFixed(0)}%
                new
              </span>
            </div>
            <div className="flex h-2 w-full overflow-hidden rounded-full">
              <div
                className="h-full bg-emerald-500"
                style={{ width: `${returningShare}%` }}
              />
              <div
                className="h-full bg-sky-400"
                style={{ width: `${Math.max(0, newShare)}%` }}
              />
            </div>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Sample size</span>
            <span className="font-medium text-slate-700">
              {formatter.format(totalKnown)} known ·{" "}
              {formatter.format(totalAll)} total
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export interface ProductAnalyticsViewProps {
  product: {
    id: string
    slug: string
    name: string
    createdAt: Date
    updatedAt: Date
    analytics?: Pick<ProductAnalytics, "upvotes" | "clicks"> | null
  }
  summary: ProductTrafficSummary
  basePath: string
  backHref: string
  publicHref: string
  headingId: string
  headingSlug: string
  hasAdvancedAnalytics: boolean
}

export function ProductAnalyticsView({
  product,
  summary,
  basePath,
  backHref,
  publicHref,
  headingId,
  headingSlug,
  hasAdvancedAnalytics,
}: ProductAnalyticsViewProps) {
  const rangeLabel = `Last ${summary.rangeDays} days`
  const advanced = summary.advanced

  const countryItems = summary.countryBreakdown.slice(0, 6).map((item) => ({
    label: formatCountryName(item.country),
    views: item.views,
  }))
  const cityItems = advanced.cityBreakdown
    .map((item) => {
      const parts = [item.city]
      if (item.region) parts.push(item.region)
      if (item.country) parts.push(formatCountryName(item.country))
      return { label: parts.join(", "), views: item.views }
    })
    .slice(0, 6)
  const osItems = advanced.osBreakdown
    .map((item) => ({ label: item.os || "Unknown", views: item.views }))
    .slice(0, 6)
  const referrerItems = summary.referrerBreakdown
    .slice(0, 6)
    .map((item) => ({ label: item.referrer || "Direct", views: item.views }))
  const trafficCategoryItems = advanced.referrerCategoryBreakdown
    .map((item) => ({ label: item.label, views: item.views }))
    .slice(0, 5)
  const referrerConversionItems: ConversionEntry[] =
    summary.referrerConversionBreakdown
      .filter((item) => (item.views ?? 0) > 0 || (item.clicks ?? 0) > 0)
      .slice(0, 6)
      .map((item) => ({
        label: item.referrer || "Direct",
        views: item.views,
        clicks: item.clicks,
        rate: item.clickThroughRate,
      }))
  const deviceConversionItems: ConversionEntry[] =
    summary.deviceConversionBreakdown
      .filter((item) => item.views > 0 || item.clicks > 0)
      .map((item) => ({
        label: item.label,
        views: item.views,
        clicks: item.clicks,
        rate: item.clickThroughRate,
      }))
  const browserConversionItems: ConversionEntry[] =
    summary.browserConversionBreakdown
      .filter((item) => item.views > 0 || item.clicks > 0)
      .slice(0, 6)
      .map((item) => ({
        label: item.browser || "Unknown",
        views: item.views,
        clicks: item.clicks,
        rate: item.clickThroughRate,
      }))
  const hasConversionInsights =
    referrerConversionItems.length > 0 ||
    deviceConversionItems.length > 0 ||
    browserConversionItems.length > 0

  return (
    <ObjectPageLayout
      heading={{
        id: headingId,
        title: `${product.name} — Analytics`,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        slug: headingSlug,
      }}
      overview={[]}
      basePath={basePath}
      headingActionsLeft={
        <div className="flex flex-wrap items-center gap-3">
          <div className={actionGroupClass}>
            <Button variant="ghost" size="sm" className="h-8 px-3" asChild>
              <Link href={backHref}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to product
              </Link>
            </Button>
            <Button variant="ghost" size="sm" className="h-8 px-3" asChild>
              <Link href={publicHref} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" /> View public page
              </Link>
            </Button>
          </div>
        </div>
      }
      relationships={
        <div className="space-y-8">
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.32em] text-muted-foreground">
                  Performance pulse
                </span>
                <p className="text-sm text-muted-foreground">
                  Engagement signals across your most recent reporting window.
                </p>
              </div>
              <RangeSelector className="shrink-0" />
            </div>
            <SummaryCards
              summary={summary}
              includeAdvanced={hasAdvancedAnalytics}
              analytics={product.analytics}
            />
          </section>
          {hasAdvancedAnalytics ? (
            <>
              <section className="space-y-4">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-[0.32em] text-muted-foreground">
                    Audience & acquisition
                  </span>
                </div>
                <div className="grid gap-4 lg:grid-cols-3">
                  <BreakdownCard
                    title="Traffic channel mix"
                    subtitle="Share of visits by source grouping"
                    items={trafficCategoryItems}
                    empty="Source breakdown will populate as referrals arrive."
                  />
                  <BreakdownCard
                    title="Leading referrers"
                    subtitle={rangeLabel}
                    items={referrerItems}
                    empty="Referrer data will populate after sharing your product."
                  />
                  <VisitorLoyaltyCard data={advanced.newVsReturning} />
                </div>
              </section>

              <section className="space-y-4">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-[0.32em] text-muted-foreground">
                    Traffic trends
                  </span>
                </div>
                <ProductAnalyticsCharts summary={summary} />
              </section>

              <section className="space-y-4">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-[0.32em] text-muted-foreground">
                    Geography & devices
                  </span>
                </div>
                <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                  <BreakdownCard
                    title="Top countries"
                    subtitle={rangeLabel}
                    items={countryItems}
                    empty="We haven't detected country signals yet."
                  />
                  <BreakdownCard
                    title="Top cities"
                    subtitle={rangeLabel}
                    items={cityItems}
                    empty="City insights will populate with additional visits."
                  />
                  <BreakdownCard
                    title="Top operating systems"
                    subtitle={rangeLabel}
                    items={osItems}
                    empty="Operating system data will appear once visitors arrive."
                  />
                </div>
              </section>
              {hasConversionInsights ? (
                <section className="space-y-4">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-[0.32em] text-muted-foreground">
                      Conversion insights
                    </span>
                  </div>
                  <div className="grid gap-4 lg:grid-cols-3">
                    <ConversionCard
                      title="Top referrers"
                      subtitle="CTA clicks by source"
                      items={referrerConversionItems}
                      empty="Clicks will appear here once visitors engage."
                    />
                    <ConversionCard
                      title="Devices"
                      subtitle="Click-through by device"
                      items={deviceConversionItems}
                      empty="We need more traffic to compute device-level engagement."
                    />
                    <ConversionCard
                      title="Browsers"
                      subtitle="Click-through by browser"
                      items={browserConversionItems}
                      empty="Browser insights will populate with additional clicks."
                    />
                  </div>
                </section>
              ) : null}
            </>
          ) : (
            <Card className="rounded-2xl border border-slate-200 bg-white/95 shadow-sm">
              <CardHeader className="px-5 pb-2 pt-5">
                <CardTitle className="text-base text-slate-900">
                  Unlock deeper analytics
                </CardTitle>
                <CardDescription className="text-sm text-muted-foreground">
                  Upgrade to advanced analytics for funnel charts, visitor
                  device trends, referrers, and country insights.
                </CardDescription>
              </CardHeader>
              <CardContent className="px-5 pb-6">
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  <li>See granular device, browser, and country breakdowns.</li>
                  <li>Track referral sources and day-over-day momentum.</li>
                  <li>
                    Spot trends with interactive charts and historical deltas.
                  </li>
                </ul>
                <div className="mt-4">
                  <Button asChild>
                    <Link href="/pricing">Explore upgrade options</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      }
    />
  )
}

export function rangeToDays(range?: string | null) {
  switch (range) {
    case "7d":
      return 7
    case "14d":
      return 14
    case "30d":
      return 30
    case "90d":
      return 90
    default:
      return 7
  }
}

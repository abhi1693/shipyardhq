import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/atoms/card"
import { Button } from "@/components/atoms/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/atoms/tooltip"
import { ObjectPageLayout } from "@/components/layout/object-view/page-layout"
import prisma from "@/lib/prisma"
import { requireManageableProduct } from "@/lib/server/productAccess"
import { cn } from "@/lib/utils"
import { getProductTrafficSummary } from "@/lib/server/analytics/productTrafficSummary"
import type { ProductTrafficSummary } from "@/types/analytics"
import { ArrowLeft, ExternalLink, Info } from "lucide-react"
import { hasPlanFeature } from "@/lib/features"
import { ProductAnalyticsCharts } from "@/components/pages/ProductAnalyticsCharts"
import { Badge } from "@/components/atoms/badge"

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

function DeltaBadge({ value }: { value: number }) {
  const safe = Number.isFinite(value) ? value : 0
  if (safe === 0) {
    return <span className="text-xs text-muted-foreground">0%</span>
  }
  const formatted = `${safe > 0 ? "+" : ""}${safe.toFixed(1)}%`
  return (
    <span
      className={cn(
        deltaBaseClass,
        safe > 0 ? deltaPositiveClass : deltaNegativeClass,
      )}
    >
      {formatted}
    </span>
  )
}

function SummaryCards({ summary }: { summary: ProductTrafficSummary }) {
  const formatter = new Intl.NumberFormat("en-US")
  const cards = [
    {
      title: `Total views (last ${summary.rangeDays}d)`,
      value: formatter.format(summary.totalViews),
      delta: summary.totalViewsChange,
      tooltip:
        "Total product page views in the current window compared with the previous period.",
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
  ]

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

function InsightsPanel({ summary }: { summary: ProductTrafficSummary }) {
  const formatter = new Intl.NumberFormat("en-US")
  const insights: {
    title: string
    description: string
  }[] = []

  if (typeof summary.totalViewsChange === "number") {
    const delta = summary.totalViewsChange
    const up = delta > 0
    const magnitude = Math.abs(delta).toFixed(1)
    insights.push({
      title: "Traffic trend",
      description: up
        ? `Views climbed ${magnitude}% versus the previous ${summary.rangeDays}-day window.`
        : delta === 0
          ? "Traffic held steady compared with the prior window."
          : `Views dipped ${magnitude}% versus the previous ${summary.rangeDays}-day window.`,
    })
  }

  if (summary.topCountry) {
    insights.push({
      title: "Strongest region",
      description: `${summary.topCountry.country} delivered ${formatter.format(summary.topCountry.views)} views in this window.`,
    })
  }

  if (summary.topReferrer) {
    const label = summary.topReferrer.referrer || "Direct"
    insights.push({
      title: "Leading referral",
      description: `${label} accounted for ${formatter.format(summary.topReferrer.views)} visits.`,
    })
  }

  if (!insights.length) return null

  return (
    <Card className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-gradient-to-br from-sky-50 via-white to-indigo-50 shadow-[0_28px_60px_-48px_rgba(12,78,134,0.65)]">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-20 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-sky-200/30 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-10 h-56 w-56 rounded-full bg-indigo-200/25 blur-3xl"
      />
      <CardContent className="relative flex flex-wrap gap-6 px-6 py-6">
        {insights.map((insight) => (
          <div
            key={insight.title}
            className="max-w-sm space-y-1 text-sm text-slate-700"
          >
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">
              {insight.title}
            </span>
            <p className="text-sm leading-relaxed text-slate-700">
              {insight.description}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

type BreakdownEntry = { label: string; views: number }

function BreakdownCard({
  title,
  subtitle,
  items,
  empty,
}: {
  title: string
  subtitle: string
  items: BreakdownEntry[]
  empty: string
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
            {items.map((item) => (
              <li key={item.label} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate text-slate-900">{item.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatter.format(item.views)} views
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200/60">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-sky-500 via-sky-400 to-sky-500"
                    style={{
                      width: `${Math.max(6, (item.views / max) * 100)}%`,
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

export default async function ProductAnalyticsPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { product: manageableProduct } = await requireManageableProduct(slug, {
    unauthorizedRedirect: null,
    missingRedirect: null,
  })

  const product = await prisma.product.findUnique({
    where: { id: manageableProduct.id },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      websiteUrl: true,
      category: { select: { name: true } },
      plan: {
        select: {
          name: true,
          price: true,
          assignments: {
            select: {
              enabled: true,
              feature: { select: { key: true } },
            },
          },
        },
      },
    },
  })

  if (!product) {
    return notFound()
  }

  const hasAnalyticsFeature = hasPlanFeature(
    product.plan ?? null,
    "analytics.advanced",
  )
  if (!hasAnalyticsFeature) {
    redirect(`/member/products/${product.slug}`)
  }

  const summary = await getProductTrafficSummary(product.id)
  const publicPath = `/products/${product.slug}`
  const rangeLabel = `Last ${summary.rangeDays} days`
  const countryItems = summary.countryBreakdown
    .slice(0, 4)
    .map((item) => ({ label: item.country || "Unknown", views: item.views }))
  const browserItems = summary.browserBreakdown
    .slice(0, 4)
    .map((item) => ({ label: item.browser || "Unknown", views: item.views }))
  const referrerItems = summary.referrerBreakdown
    .slice(0, 4)
    .map((item) => ({ label: item.referrer || "Direct", views: item.views }))
  return (
    <ObjectPageLayout
      heading={{
        id: product.slug,
        title: `${product.name} — Analytics`,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        slug: product.id,
      }}
      overview={[]}
      basePath="member/products"
      headingActionsLeft={
        <div className="flex flex-wrap items-center gap-3">
          <div className={actionGroupClass}>
            <Button variant="ghost" size="sm" className="h-8 px-3" asChild>
              <Link href={`/member/products/${product.slug}`}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to product
              </Link>
            </Button>
            <Button variant="ghost" size="sm" className="h-8 px-3" asChild>
              <Link href={publicPath} target="_blank" rel="noopener noreferrer">
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
              <Badge variant="outline" className="rounded-full px-3 py-1">
                {rangeLabel}
              </Badge>
            </div>
            <SummaryCards summary={summary} />
          </section>

          <InsightsPanel summary={summary} />

          <ProductAnalyticsCharts summary={summary} />

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-[0.32em] text-muted-foreground">
                Audience breakdowns
              </span>
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              <BreakdownCard
                title="Top countries"
                subtitle={rangeLabel}
                items={countryItems}
                empty="We haven't detected country signals yet."
              />
              <BreakdownCard
                title="Top browsers"
                subtitle={rangeLabel}
                items={browserItems}
                empty="Browser data will appear once visitors arrive."
              />
              <BreakdownCard
                title="Leading referrers"
                subtitle={rangeLabel}
                items={referrerItems}
                empty="Referrer data will populate after sharing your product."
              />
            </div>
          </section>
        </div>
      }
    />
  )
}

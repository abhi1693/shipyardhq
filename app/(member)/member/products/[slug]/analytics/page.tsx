import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@clerk/nextjs/server"
import {
  Card,
  CardContent,
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
import prisma from "@/lib/prisma"
import { cn } from "@/lib/utils"
import { getProductTrafficSummary } from "@/lib/server/analytics/productTrafficSummary"
import type { ProductTrafficSummary } from "@/types/analytics"
import { ArrowLeft, ExternalLink, Info } from "lucide-react"
import { hasPlanFeature } from "@/lib/features"
import { ProductAnalyticsCharts } from "@/components/pages/ProductAnalyticsCharts"

function DeltaBadge({ value }: { value: number }) {
  const safe = Number.isFinite(value) ? value : 0
  if (safe === 0) {
    return <span className="text-xs text-muted-foreground">0%</span>
  }
  const formatted = `${safe > 0 ? "+" : ""}${safe.toFixed(1)}%`
  return (
    <span
      className={cn(
        "text-xs font-semibold",
        safe > 0 ? "text-green-600" : "text-red-600",
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
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              {card.title}
              {card.tooltip ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className="inline-flex h-5 w-5 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-help"
                      tabIndex={0}
                      role="button"
                      aria-label={`More info about ${card.title}`}
                    >
                      <Info className="h-4 w-4" aria-hidden />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent sideOffset={6}>{card.tooltip}</TooltipContent>
                </Tooltip>
              ) : null}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold">
                {card.value}
              </span>
              {typeof card.delta === "number" ? (
                <DeltaBadge value={card.delta} />
              ) : null}
            </div>
            {card.helper ? (
              <div className="mt-1 text-xs text-muted-foreground">
                {card.helper}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default async function ProductAnalyticsPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { userId } = await auth()

  const product = await prisma.product.findFirst({
    where: {
      slug,
      user: { clerkId: userId ?? undefined },
    },
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

  const hasAnalyticsFeature = hasPlanFeature(product.plan ?? null, "analytics.advanced")
  if (!hasAnalyticsFeature) {
    redirect(`/member/products/${product.slug}`)
  }

  const summary = await getProductTrafficSummary(product.id)
  const publicPath = `/products/${product.slug}`
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
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/member/products/${product.slug}`}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to product
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={publicPath} target="_blank" rel="noopener noreferrer">
              View public page <ExternalLink className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      }
      relationships={
        <div className="space-y-6">
          <SummaryCards summary={summary} />
          <ProductAnalyticsCharts summary={summary} />
        </div>
      }
    />
  )
}

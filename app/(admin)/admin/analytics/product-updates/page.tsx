import Link from "next/link"
import { formatDistanceToNow } from "date-fns"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"
import { Badge } from "@/components/atoms/badge"
import RangeSelector from "@/components/molecules/RangeSelector"
import { ProductUpdateTrendChart } from "@/components/pages/admin/analytics/ProductUpdateTrendChart"
import { getProductUpdateUsageSummary } from "@/lib/server/analytics/productUpdateUsage"
import { adminPath, productUpdatesPath } from "@/lib/routes"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

type SearchParams = { range?: string }

function rangeToDays(range?: string): number {
  switch (range) {
    case "14d":
      return 14
    case "30d":
      return 30
    case "90d":
      return 90
    case "7d":
    default:
      return 7
  }
}

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
})

const decimalFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
})

function formatNumber(value: number) {
  return numberFormatter.format(value)
}

function formatDecimal(value: number) {
  return decimalFormatter.format(value)
}

function TrendBadge({ delta }: { delta?: number }) {
  if (typeof delta !== "number" || Number.isNaN(delta)) {
    return <span className="text-xs text-muted-foreground">—</span>
  }

  if (delta === 0) {
    return <span className="text-xs text-muted-foreground">No change</span>
  }

  const tone = delta > 0 ? "text-emerald-600" : "text-rose-600"
  const arrow = delta > 0 ? "▲" : "▼"

  return (
    <span className={cn("text-xs font-medium", tone)}>
      {arrow} {formatNumber(Math.abs(delta))} vs prior
    </span>
  )
}

function MetricCard({
  title,
  value,
  delta,
  helper,
}: {
  title: string
  value: string
  delta?: number
  helper?: string
}) {
  return (
    <Card className="border-slate-200/70 bg-white/90 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold uppercase tracking-[0.32em] text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-2xl font-semibold text-slate-900">{value}</div>
        {typeof delta === "number" ? <TrendBadge delta={delta} /> : null}
        {helper ? (
          <p className="text-xs text-muted-foreground">{helper}</p>
        ) : null}
      </CardContent>
    </Card>
  )
}

function statusTone(status: "draft" | "published") {
  switch (status) {
    case "published":
      return "bg-emerald-50 text-emerald-600"
    default:
      return "bg-amber-50 text-amber-700"
  }
}

export default async function ProductUpdateAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams
  const days = rangeToDays(sp?.range)
  const summary = await getProductUpdateUsageSummary(days)

  const previousCreated = Math.max(
    summary.totals.range.created - summary.totals.range.createdDelta,
    0,
  )
  const previousPublished = Math.max(
    summary.totals.range.published - summary.totals.range.publishedDelta,
    0,
  )

  const avgPerProduct =
    summary.perProduct.activeProducts > 0
      ? summary.perProduct.averageCreatedPerActiveProduct
      : 0
  const activeCoverage =
    summary.totals.allTime.productsWithUpdates > 0
      ? (summary.perProduct.activeProducts /
          summary.totals.allTime.productsWithUpdates) *
        100
      : 0

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            Product update adoption
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Understand how often teams are creating and publishing product
            updates, which products ship the most, and the drafts that still
            need to go live.
          </p>
        </div>
        <RangeSelector />
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title={`Created (${summary.rangeDays}d)`}
          value={formatNumber(summary.totals.range.created)}
          delta={summary.totals.range.createdDelta}
          helper={`All time: ${formatNumber(summary.totals.allTime.updates)}`}
        />
        <MetricCard
          title={`Published (${summary.rangeDays}d)`}
          value={formatNumber(summary.totals.range.published)}
          delta={summary.totals.range.publishedDelta}
          helper={`All time: ${formatNumber(summary.totals.allTime.published)}`}
        />
        <MetricCard
          title={`Drafts created (${summary.rangeDays}d)`}
          value={formatNumber(summary.totals.range.drafts)}
          helper={`Drafts on deck: ${formatNumber(summary.totals.allTime.drafts)}`}
        />
        <MetricCard
          title={`Active products (${summary.rangeDays}d)`}
          value={formatNumber(summary.perProduct.activeProducts)}
          helper={
            summary.perProduct.activeProducts > 0
              ? `Avg ${formatDecimal(avgPerProduct)} updates/product • ${formatDecimal(
                  activeCoverage,
                )}% of products with updates`
              : "No product activity in this window"
          }
        />
      </section>

      <ProductUpdateTrendChart
        data={summary.trend}
        rangeDays={summary.rangeDays}
        createdTotal={summary.totals.range.created}
        createdPrevious={previousCreated}
        publishedTotal={summary.totals.range.published}
        publishedPrevious={previousPublished}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
        <Card className="border-slate-200/70 bg-white/90 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base text-slate-900">
              Top shipping products
            </CardTitle>
            <CardDescription>
              Products creating the most updates in this window.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {summary.perProduct.topProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No product update activity recorded for this range.
              </p>
            ) : (
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground">
                    <th className="py-2 pr-4 text-left font-medium">Product</th>
                    <th className="py-2 pr-4 text-right font-medium">
                      Created
                    </th>
                    <th className="py-2 pr-4 text-right font-medium">
                      Published
                    </th>
                    <th className="py-2 text-right font-medium">
                      Last activity
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70">
                  {summary.perProduct.topProducts.map((product) => {
                    const lastActivity = product.lastActivityAt
                      ? formatDistanceToNow(new Date(product.lastActivityAt), {
                          addSuffix: true,
                        })
                      : "—"
                    const href = product.productSlug
                      ? productUpdatesPath(product.productSlug)
                      : adminPath("products", product.productId)

                    return (
                      <tr key={product.productId}>
                        <td className="py-3 pr-4 align-top">
                          <Link
                            href={href}
                            className="font-medium text-slate-900 hover:text-slate-700"
                          >
                            {product.productName}
                          </Link>
                        </td>
                        <td className="py-3 pr-4 text-right font-medium text-slate-900 tabular-nums">
                          {formatNumber(product.created)}
                        </td>
                        <td className="py-3 pr-4 text-right tabular-nums text-muted-foreground">
                          {formatNumber(product.published)}
                        </td>
                        <td className="py-3 text-right text-muted-foreground">
                          {lastActivity}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200/70 bg-white/90 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base text-slate-900">
              Recent activity
            </CardTitle>
            <CardDescription>
              The latest updates created or published in this window.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {summary.recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No updates were created or published in this range.
              </p>
            ) : (
              summary.recentActivity.map((activity) => {
                const createdAgo = formatDistanceToNow(
                  new Date(activity.createdAt),
                  { addSuffix: true },
                )
                const publishedAgo = activity.publishedAt
                  ? formatDistanceToNow(new Date(activity.publishedAt), {
                      addSuffix: true,
                    })
                  : null
                const href = activity.productSlug
                  ? productUpdatesPath(activity.productSlug)
                  : adminPath("products", activity.productId)

                return (
                  <div
                    key={activity.updateId}
                    className="rounded-lg border border-slate-200/70 bg-white/70 px-3 py-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Link
                          href={href}
                          className="text-sm font-semibold text-slate-900 hover:text-slate-700"
                        >
                          {activity.title}
                        </Link>
                        <p className="text-xs text-muted-foreground mt-1">
                          {activity.productName}
                        </p>
                      </div>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.28em]",
                          statusTone(activity.status),
                        )}
                      >
                        {activity.status}
                      </Badge>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      <span>Created {createdAgo}</span>
                      {publishedAgo ? (
                        <span className="ml-3">Published {publishedAgo}</span>
                      ) : null}
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

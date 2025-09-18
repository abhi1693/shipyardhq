import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/atoms/card"
import Link from "next/link"
import { formatBoolean } from "@/lib/ui/formatters"
import { StatCard } from "@/components/molecules/StatCard"
import {
  getDashboardStats,
  getRecentProducts,
  getRecentUsers,
} from "@/actions/admin/overview/actions"
import { Badge } from "@/components/atoms/badge"
import { formatDistanceToNow } from "date-fns"
import CreateButton from "@/components/molecules/CreateButton"
import RangeSelector from "@/components/molecules/RangeSelector"
import { ProductAnalyticsCharts } from "@/components/pages/ProductAnalyticsCharts"
import { getGlobalTrafficSummary } from "@/lib/server/analytics/productTrafficSummary"

export const revalidate = 60

type SearchParams = { range?: string }

function rangeToDays(range?: string): number {
  switch (range) {
    case "30d":
      return 30
    case "90d":
      return 90
    case "7d":
    default:
      return 7
  }
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value)
}

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams
  const days = rangeToDays(sp?.range)
  const [stats, products, users, trafficSummary] = await Promise.all([
    getDashboardStats(days),
    getRecentProducts(10, days),
    getRecentUsers(10, days),
    getGlobalTrafficSummary({ rangeDays: days }),
  ])

  const productsDelta =
    typeof (stats as any).productsDelta === "number"
      ? (stats as any).productsDelta
      : 0
  const usersDelta =
    typeof (stats as any).usersDelta === "number"
      ? (stats as any).usersDelta
      : 0
  const productsTrend =
    productsDelta > 0 ? "up" : productsDelta < 0 ? "down" : undefined
  const usersTrend = usersDelta > 0 ? "up" : usersDelta < 0 ? "down" : undefined
  const viewsDelta =
    typeof (stats as any).viewsDelta === "number" ? (stats as any).viewsDelta : 0
  const upvotesDelta =
    typeof (stats as any).upvotesDelta === "number"
      ? (stats as any).upvotesDelta
      : 0
  const viewsTrend = viewsDelta > 0 ? "up" : viewsDelta < 0 ? "down" : undefined
  const upvotesTrend =
    upvotesDelta > 0 ? "up" : upvotesDelta < 0 ? "down" : undefined

  const trafficHighlights = [
    {
      label: `Total views (last ${trafficSummary.rangeDays}d)`,
      value: formatNumber(trafficSummary.totalViews),
      delta: trafficSummary.totalViewsChange,
      helper: `vs prior ${trafficSummary.rangeDays} days`,
    },
    {
      label: "Unique visitors",
      value: formatNumber(trafficSummary.uniqueVisitors),
      delta: trafficSummary.uniqueVisitorsChange,
      helper: `vs prior ${trafficSummary.rangeDays} days`,
    },
    {
      label: "Views today",
      value: formatNumber(trafficSummary.viewsToday),
      helper: `${formatNumber(trafficSummary.viewsSevenDays)} in past 7 days`,
    },
    {
      label: "Average per day",
      value: trafficSummary.averageViewsPerDay.toLocaleString("en-US", {
        maximumFractionDigits: 1,
      }),
      helper: `Across last ${trafficSummary.rangeDays} days`,
    },
    {
      label: "Top country",
      value: trafficSummary.topCountry?.country ?? "—",
      helper: trafficSummary.topCountry
        ? `${formatNumber(trafficSummary.topCountry.views)} views`
        : "No traffic yet",
    },
    {
      label: "Top referrer",
      value: trafficSummary.topReferrer?.referrer ?? "—",
      helper: trafficSummary.topReferrer
        ? `${formatNumber(trafficSummary.topReferrer.views)} views`
        : "No referrers tracked",
    },
  ]

  function renderDelta(value?: number) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return <span className="text-xs text-muted-foreground">—</span>
    }
    if (value === 0) {
      return <span className="text-xs text-muted-foreground">0%</span>
    }
    const formatted = `${value > 0 ? "+" : ""}${value.toFixed(1)}%`
    return (
      <span className={`text-xs font-semibold ${value > 0 ? "text-green-600" : "text-red-600"}`}>
        {formatted}
      </span>
    )
  }

  return (
    <>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <h1 className="text-xl font-semibold tracking-tight">Overview</h1>
        <div className="flex items-center gap-2">
          <RangeSelector />
          <div className="hidden sm:flex items-center gap-2">
            <Link href="/admin/products/add">
              <CreateButton size="sm" label="Create Product" />
            </Link>
            <Link href="/admin/categories/add">
              <CreateButton
                variant="outline"
                size="sm"
                label="Create Category"
              />
            </Link>
            <Link href="/admin/plans/add">
              <CreateButton variant="outline" size="sm" label="Create Plan" />
            </Link>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
        <Link
          href="/admin/products"
          className="group block h-full rounded-md outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
        >
          <StatCard
            title="Total Products"
            value={stats.totalProducts}
            badge={
              typeof productsDelta === "number"
                ? `${productsDelta > 0 ? "+" : ""}${productsDelta}`
                : undefined
            }
            trend={productsTrend as any}
            subheading={`New in range: ${stats.productsInRange}`}
            footnote={`vs prior ${days} days`}
            sparkline={stats.dailyProducts}
          />
        </Link>

        <Link href="/admin/products" className="group block h-full">
          <StatCard
            title="Verified Domains"
            value={stats.verifiedProducts}
            badge={`${stats.verifiedRate}%`}
            trend="up"
            subheading={`${stats.verifiedRate}% verified`}
            footnote="TXT records matched"
            progress={stats.verifiedRate}
          />
        </Link>

        <Link href="/admin/products" className="group block h-full">
          <StatCard
            title="Unverified Domains"
            value={stats.unverifiedProducts}
            subheading="Remaining to verify"
            footnote="Auto-check recommended"
            progress={Math.max(0, 100 - stats.verifiedRate)}
          />
        </Link>

        <Link
          href="/admin/users"
          className="group block h-full rounded-md outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
        >
          <StatCard
            title="Total Users"
            value={stats.totalUsers}
            badge={
              typeof usersDelta === "number"
                ? `${usersDelta > 0 ? "+" : ""}${usersDelta}`
                : undefined
            }
            trend={usersTrend as any}
            subheading={`${stats.adminCount} admins, ${stats.memberCount} members`}
            footnote={`New in range: ${stats.usersInRange} • vs prior ${days} days`}
            sparkline={stats.dailyUsers}
          />
        </Link>

        <Link href="/admin/products" className="group block h-full">
          <StatCard
            title={`Views (last ${days}d)`}
            value={stats.totalViews}
            badge={
              viewsDelta !== 0 ? `${viewsDelta > 0 ? "+" : ""}${viewsDelta}` : undefined
            }
            trend={viewsTrend as any}
            subheading={`In range: ${formatNumber(stats.viewsInRange ?? 0)}`}
            footnote={`vs prior ${days} days`}
          />
        </Link>

        <Link href="/admin/products" className="group block h-full">
          <StatCard
            title={`Upvotes (last ${days}d)`}
            value={stats.totalUpvotes}
            badge={
              upvotesDelta !== 0
                ? `${upvotesDelta > 0 ? "+" : ""}${upvotesDelta}`
                : undefined
            }
            trend={upvotesTrend as any}
            subheading={`In range: ${formatNumber(stats.upvotesInRange ?? 0)}`}
            footnote={`vs prior ${days} days`}
          />
        </Link>

        <Link href="/admin/products" className="group block h-full">
          <StatCard
            title="Total Clicks"
            value={stats.totalClicks}
            subheading="Across all products"
            footnote="Aggregated from product analytics"
          />
        </Link>

        {stats.mostPopularPlan && (
          <Link href="/admin/plans" className="group block h-full">
            <StatCard
              title="Most Used Plan"
              value={stats.mostPopularPlan.name}
              badge={`${stats.mostPopularPlan.count} products`}
              subheading="Highest plan adoption"
              footnote={`Based on last ${days} days`}
            />
          </Link>
        )}
        <Link href="/admin/plans" className="group block h-full">
          <StatCard
            title="Default Plan Products"
            value={stats.defaultPlanProductCount}
            subheading="Auto-assigned on creation"
            footnote="Changeable per product"
          />
        </Link>

        <Link href="/admin/plans" className="group block h-full">
          <StatCard
            title="Plans"
            value={stats.totalPlans}
            badge={`${stats.featureCoverage}%`}
            badgeVariant="default"
            subheading={`${formatNumber(stats.usedFeatureAssignments ?? 0)} assignments`}
            footnote={`${formatNumber(stats.totalFeatures ?? 0)} features total`}
            progress={stats.featureCoverage}
          />
        </Link>

        <Link href="/admin/plans" className="group block h-full">
          <StatCard
            title="Total Revenue (Est.)"
            value={`$${(stats.totalRevenue / 100).toFixed(2)}`}
            subheading="Based on plan pricing"
            footnote="Without discounts applied"
          />
        </Link>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-10">
        <Card>
          <CardHeader>
            <CardTitle>Recent Products</CardTitle>
            <CardDescription>Latest 10 submissions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {products.map((p) => (
              <Link
                key={p.id}
                href={`/admin/products/${p.id}`}
                className="block rounded-md border-b last:border-b-0 px-0 pb-3 pt-2 outline-hidden transition hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex justify-between items-center">
                  <span className="text-primary font-medium">{p.name}</span>
                  <span className="text-muted-foreground text-sm">
                    {formatDistanceToNow(new Date(p.createdAt), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                  <span>Plan: {p.plan?.name || "—"}</span>
                  <span>By: {p.user.email}</span>
                  {p.verification &&
                    formatBoolean(
                      p.verification.isVerified,
                      "Verified",
                      "Not Verified",
                    )}
                </div>
              </Link>
            ))}
          </CardContent>
          <CardFooter>
            <Link
              href="/admin/products"
              className="text-sm text-primary hover:underline"
            >
              ↗ View all products
            </Link>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Users</CardTitle>
            <CardDescription>Latest 10 registrations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {users.map((u) => (
              <Link
                key={u.id}
                href={`/admin/users/${u.id}`}
                className="block rounded-md border-b last:border-b-0 px-0 pb-3 pt-2 outline-hidden transition hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex justify-between items-center">
                  <span className="text-primary font-medium">{u.email}</span>
                  <span className="text-muted-foreground text-sm">
                    Joined{" "}
                    {formatDistanceToNow(new Date(u.createdAt), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
                <div className="flex gap-3 text-sm text-muted-foreground">
                  <span>Products: {u.products.length}</span>
                  <Badge variant={u.role === "admin" ? "default" : "outline"}>
                    {u.role === "admin" ? "Admin" : "Member"}
                  </Badge>
                </div>
              </Link>
            ))}
          </CardContent>
          <CardFooter>
            <Link
              href="/admin/users"
              className="text-sm text-primary hover:underline"
            >
              ↗ View all users
            </Link>
          </CardFooter>
        </Card>
      </div>

      <section className="mt-10 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Traffic Overview</h2>
          <span className="text-sm text-muted-foreground">Across all products</span>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Engagement snapshot</CardTitle>
            <CardDescription>
              Key signals for the last {trafficSummary.rangeDays} days with prior-period deltas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {trafficHighlights.map((item) => (
                <div key={item.label} className="space-y-1">
                  <div className="text-xs text-muted-foreground">{item.label}</div>
                  <div className="flex items-baseline gap-2 text-lg font-semibold">
                    <span>{item.value}</span>
                    {item.delta !== undefined ? renderDelta(item.delta) : null}
                  </div>
                  {item.helper && (
                    <div className="text-xs text-muted-foreground">{item.helper}</div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <ProductAnalyticsCharts summary={trafficSummary} />
      </section>
    </>
  )
}

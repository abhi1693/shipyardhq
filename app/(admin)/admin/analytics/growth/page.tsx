import Link from "next/link"
import { addDays, format, formatDistanceToNow, subDays } from "date-fns"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"
import { Badge } from "@/components/atoms/badge"
import RangeSelector from "@/components/molecules/RangeSelector"
import { ProductLaunchChart } from "@/components/pages/admin/analytics/ProductLaunchChart"
import {
  getDashboardStats,
  getRecentProducts,
  getRecentUsers,
} from "@/actions/admin/overview/actions"
import { cn } from "@/lib/utils"

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

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

function formatRelative(date: Date | string) {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

function TrendBadge({
  current,
  delta,
  label = "vs prior period",
}: {
  current: number
  delta: number
  label?: string
}) {
  if (delta === 0) {
    return (
      <span className="text-xs text-muted-foreground">No change {label}</span>
    )
  }

  const previous = Math.max(current - delta, 0)
  const percent = previous > 0 ? (Math.abs(delta) / previous) * 100 : null
  const tone = delta > 0 ? "text-emerald-600" : "text-rose-600"

  return (
    <span className={cn("text-xs font-medium", tone)}>
      {delta > 0 ? "▲" : "▼"} {formatNumber(Math.abs(delta))}
      {percent !== null ? ` (${percent.toFixed(1)}%)` : ""} {label}
    </span>
  )
}

function MetricTile({
  title,
  value,
  delta,
  previous,
  helper,
}: {
  title: string
  value: string
  delta?: number
  previous?: number
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
        {typeof delta === "number" && typeof previous === "number" ? (
          <TrendBadge current={previous + delta} delta={delta} />
        ) : null}
        {helper ? (
          <p className="text-xs text-muted-foreground">{helper}</p>
        ) : null}
      </CardContent>
    </Card>
  )
}

export default async function GrowthAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams
  const days = rangeToDays(sp?.range)
  const [stats, recentProducts, recentUsers] = await Promise.all([
    getDashboardStats(days),
    getRecentProducts(6, days),
    getRecentUsers(6, days),
  ])

  const previousProducts = Math.max(
    stats.productsInRange - stats.productsDelta,
    0,
  )
  const previousUsers = Math.max(stats.usersInRange - stats.usersDelta, 0)
  const previousViews = Math.max(stats.viewsInRange - stats.viewsDelta, 0)
  const previousUpvotes = Math.max(stats.upvotesInRange - stats.upvotesDelta, 0)

  const mostPopularPlan = stats.mostPopularPlan
  const popularPlanShare =
    mostPopularPlan && stats.totalProducts > 0
      ? Math.round((mostPopularPlan.count / stats.totalProducts) * 100)
      : null
  const popularPlanSummary =
    mostPopularPlan && popularPlanShare !== null
      ? `${mostPopularPlan.name} accounts for approximately ${popularPlanShare}% of live products.`
      : null

  const verificationGap = Math.max(stats.unverifiedProducts, 0)
  const verificationHelper = `${stats.verifiedProducts} verified / ${stats.totalProducts} total`

  const avgProductsPerDay = stats.productsInRange / days
  const avgUsersPerDay = stats.usersInRange / days

  const rangeStart = subDays(new Date(), days)
  const launchTrend = stats.dailyProducts.map((count, index) => {
    const date = addDays(rangeStart, index + 1)
    const labelFormat = days <= 7 ? "EEE" : "MMM d"

    return {
      label: format(date, labelFormat),
      products: count,
    }
  })

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            Growth overview
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            A compact look at launch velocity, member acquisition, and the
            engagement signals powering Shipyard.
          </p>
        </div>
        <RangeSelector />
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            Key momentum
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricTile
            title={`New products (${days}d)`}
            value={formatNumber(stats.productsInRange)}
            delta={stats.productsDelta}
            previous={previousProducts}
            helper={`Avg ${avgProductsPerDay.toFixed(1)} per day`}
          />
          <MetricTile
            title={`New members (${days}d)`}
            value={formatNumber(stats.usersInRange)}
            delta={stats.usersDelta}
            previous={previousUsers}
            helper={`Avg ${avgUsersPerDay.toFixed(1)} per day`}
          />
          <MetricTile
            title={`Views (${days}d)`}
            value={formatNumber(stats.viewsInRange)}
            delta={stats.viewsDelta}
            previous={previousViews}
            helper={`${formatNumber(stats.totalViews)} lifetime views`}
          />
          <MetricTile
            title={`Upvotes (${days}d)`}
            value={formatNumber(stats.upvotesInRange)}
            delta={stats.upvotesDelta}
            previous={previousUpvotes}
            helper={`${formatNumber(stats.totalUpvotes)} lifetime upvotes`}
          />
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            Launch trends
          </h2>
        </div>
        <ProductLaunchChart
          data={launchTrend}
          days={days}
          currentTotal={stats.productsInRange}
          previousTotal={previousProducts}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="border-slate-200/70 bg-white/90 shadow-sm lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Verification coverage</CardTitle>
            <CardDescription>{verificationHelper}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Verified rate</span>
                <span className="font-semibold text-slate-900">
                  {stats.verifiedRate}%
                </span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200/70">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-500 via-sky-400 to-sky-600"
                  style={{
                    width: `${Math.max(0, Math.min(stats.verifiedRate, 100))}%`,
                  }}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {verificationGap > 0
                ? `${formatNumber(verificationGap)} products still awaiting domain verification.`
                : "All active products are verified."}
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/70 bg-white/90 shadow-sm lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Plan performance</CardTitle>
            <CardDescription>
              {mostPopularPlan
                ? `${mostPopularPlan.name} leads with ${formatNumber(
                    mostPopularPlan.count,
                  )} products.`
                : "No plan adoption yet."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm">
              <span className="text-muted-foreground">Plans published</span>
              <span className="font-medium text-slate-900">
                {formatNumber(stats.totalPlans)}
              </span>
              <span className="text-muted-foreground">Feature coverage</span>
              <span className="font-medium text-slate-900">
                {stats.featureCoverage}%
              </span>
              <span className="text-muted-foreground">Assignments</span>
              <span className="font-medium text-slate-900">
                {formatNumber(stats.usedFeatureAssignments)}
              </span>
            </div>
            {popularPlanSummary ? (
              <p className="text-xs text-muted-foreground">
                {popularPlanSummary}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-slate-200/70 bg-white/90 shadow-sm lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Revenue proxy</CardTitle>
            <CardDescription>
              Estimate based on assigned plan prices for active products.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-2xl font-semibold text-slate-900">
              {formatCurrency(stats.totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(stats.defaultPlanProductCount)} products currently
              ride the default plan.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            Recent activity
          </h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="border-slate-200/70 bg-white/90 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Recent launches</CardTitle>
              <CardDescription>
                Products created in the last {days} days.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No products launched in this window.
                </p>
              ) : (
                <ul className="space-y-3 text-sm">
                  {recentProducts.map((product) => (
                    <li key={product.id} className="space-y-1">
                      <div className="flex items-center justify-between gap-3">
                        <Link
                          href={`/admin/products/${product.id}`}
                          className="font-medium text-slate-900 hover:underline"
                        >
                          {product.name}
                        </Link>
                        <Badge variant="outline" className="bg-transparent">
                          {product.category?.name ?? "Uncategorised"}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>Owner: {product.user.firstName}</span>
                        {product.plan?.name && (
                          <span>Plan: {product.plan.name}</span>
                        )}
                        <span>{formatRelative(product.createdAt)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200/70 bg-white/90 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Recent members</CardTitle>
              <CardDescription>
                Accounts created in the last {days} days.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No new members in this window.
                </p>
              ) : (
                <ul className="space-y-3 text-sm">
                  {recentUsers.map((user) => (
                    <li key={user.id} className="space-y-1">
                      <Link
                        href={`/admin/users/${user.id}`}
                        className="font-medium text-slate-900 hover:underline"
                      >
                        {user.firstName} {user.lastName}
                      </Link>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>{user.email}</span>
                        <span>{formatRelative(user.createdAt)}</span>
                        <span>{user.products.length} products</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}

import Link from "next/link"
import { formatDistanceToNow } from "date-fns"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"
import { Badge } from "@/components/atoms/badge"
import RangeSelector from "@/components/molecules/RangeSelector"
import CreateButton from "@/components/molecules/CreateButton"
import {
  getDashboardStats,
  getRecentProducts,
  getRecentUsers,
} from "@/actions/admin/overview/actions"
import { cn } from "@/lib/utils"
import { adminPath } from "@/lib/routes"

export const revalidate = 60

type SearchParams = { range?: string }

type RecentProduct = Awaited<ReturnType<typeof getRecentProducts>>[number]
type RecentUser = Awaited<ReturnType<typeof getRecentUsers>>[number]

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

function TrendBadge({
  current,
  previous,
}: {
  current?: number
  previous?: number
}) {
  if (typeof current !== "number" || typeof previous !== "number") {
    return null
  }

  const delta = current - previous
  if (delta === 0) {
    return (
      <span className="text-xs text-muted-foreground">No change vs prior</span>
    )
  }

  const arrow = delta > 0 ? "▲" : "▼"
  const tone = delta > 0 ? "text-emerald-600" : "text-rose-600"
  const percent = previous === 0 ? null : (Math.abs(delta) / previous) * 100
  const percentText =
    percent !== null
      ? `${delta > 0 ? "+" : "-"}${percent.toFixed(1)}%`
      : undefined

  return (
    <span className={cn("text-xs font-medium tabular-nums", tone)}>
      {arrow} {formatNumber(Math.abs(delta))}
      {percentText ? ` (${percentText})` : ""} vs prior
    </span>
  )
}

function MetricTile({
  title,
  value,
  current,
  previous,
  helper,
  href,
}: {
  title: string
  value: string
  current?: number
  previous?: number
  helper?: string
  href?: string
}) {
  const card = (
    <Card className="h-full border-slate-200/70 bg-white/90 shadow-sm transition hover:border-sky-200/70">
      <CardHeader className="pb-2">
        <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5">
        <div className="text-xl font-semibold text-slate-900">{value}</div>
        {typeof current === "number" && typeof previous === "number" ? (
          <TrendBadge current={current} previous={previous} />
        ) : null}
        {helper ? (
          <p className="text-[11px] leading-snug text-muted-foreground">
            {helper}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )

  return href ? (
    <Link
      href={href}
      className="group block h-full rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-200"
    >
      {card}
    </Link>
  ) : (
    card
  )
}

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams
  const days = rangeToDays(sp?.range)
  const [stats, products, users] = await Promise.all([
    getDashboardStats(days),
    getRecentProducts(8, days),
    getRecentUsers(8, days),
  ])

  const productsInRange = stats.productsInRange
  const usersInRange = stats.usersInRange
  const viewsInRange = stats.viewsInRange ?? 0
  const upvotesInRange = stats.upvotesInRange ?? 0

  const previousProducts = Math.max(productsInRange - stats.productsDelta, 0)
  const previousUsers = Math.max(usersInRange - stats.usersDelta, 0)
  const previousViews = Math.max(viewsInRange - stats.viewsDelta, 0)
  const previousUpvotes = Math.max(upvotesInRange - stats.upvotesDelta, 0)

  const metrics = [
    {
      title: `New products (${days}d)`,
      value: formatNumber(productsInRange),
      current: productsInRange,
      previous: previousProducts,
      helper: `${formatNumber(stats.totalProducts)} live products`,
      href: adminPath("products"),
    },
    {
      title: `New members (${days}d)`,
      value: formatNumber(usersInRange),
      current: usersInRange,
      previous: previousUsers,
      helper: `${formatNumber(stats.totalUsers)} total accounts`,
      href: adminPath("users"),
    },
    {
      title: `Views (${days}d)`,
      value: formatNumber(viewsInRange),
      current: viewsInRange,
      previous: previousViews,
      helper: `${formatNumber(stats.totalViews)} all-time views`,
      href: adminPath("analytics", "traffic"),
    },
    {
      title: `Upvotes (${days}d)`,
      value: formatNumber(upvotesInRange),
      current: upvotesInRange,
      previous: previousUpvotes,
      helper: `${formatNumber(stats.totalUpvotes)} total upvotes`,
      href: adminPath("analytics", "growth"),
    },
    {
      title: "Revenue proxy",
      value: formatCurrency(stats.totalRevenue),
      helper: `${formatNumber(stats.defaultPlanProductCount)} products on default plan`,
      href: adminPath("plans"),
    },
    {
      title: "Total clicks",
      value: formatNumber(stats.totalClicks),
      helper: "Aggregated product CTAs",
      href: adminPath("analytics", "growth"),
    },
  ]

  const verificationGap = Math.max(stats.unverifiedProducts, 0)
  const verifiedProgress = Math.max(0, Math.min(stats.verifiedRate, 100))

  const mostPopularPlan = stats.mostPopularPlan
  const popularPlanShare =
    mostPopularPlan && stats.totalProducts > 0
      ? Math.round((mostPopularPlan.count / stats.totalProducts) * 100)
      : null

  const memberRatio =
    stats.totalUsers > 0
      ? Math.round((stats.adminCount / stats.totalUsers) * 100)
      : 0

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            Admin overview
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Monitor launch velocity, membership growth, and operational health
            in one place.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <RangeSelector />
        </div>
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            At a glance
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {metrics.map((metric) => (
            <MetricTile key={metric.title} {...metric} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            Operations
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="border-slate-200/70 bg-white/90 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Quick actions</CardTitle>
              <CardDescription>
                Spin up new assets or invite teammates.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <CreateButton asChild size="sm" label="New product">
                <Link href={adminPath("products", "add")}>New product</Link>
              </CreateButton>
              <CreateButton
                asChild
                size="sm"
                label="Invite member"
                variant="outline"
              >
                <Link href={adminPath("users", "add")}>Invite member</Link>
              </CreateButton>
              <CreateButton
                asChild
                size="sm"
                label="New plan"
                variant="outline"
              >
                <Link href={adminPath("plans", "add")}>New plan</Link>
              </CreateButton>
            </CardContent>
          </Card>

          <Card className="border-slate-200/70 bg-white/90 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Verification coverage</CardTitle>
              <CardDescription>
                {formatNumber(stats.verifiedProducts)} verified /{" "}
                {formatNumber(stats.totalProducts)}
                total products.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200/70">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-500 via-sky-400 to-sky-600"
                  style={{ width: `${verifiedProgress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {verificationGap > 0
                  ? `${formatNumber(verificationGap)} products still need domain verification.`
                  : "All current products are verified."}
              </p>
              <Link
                href={adminPath("products")}
                className="text-xs font-medium text-sky-600 hover:underline"
              >
                Review product list →
              </Link>
            </CardContent>
          </Card>

          <Card className="border-slate-200/70 bg-white/90 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Plan adoption</CardTitle>
              <CardDescription>
                {mostPopularPlan
                  ? `${mostPopularPlan.name} leads with ${formatNumber(
                      mostPopularPlan.count,
                    )} products.`
                  : "No plan assignments yet."}
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
              {popularPlanShare !== null ? (
                <p className="text-xs text-muted-foreground">
                  {mostPopularPlan?.name} accounts for roughly{" "}
                  {popularPlanShare}% of live products.
                </p>
              ) : null}
              <Link
                href={adminPath("plans")}
                className="text-xs font-medium text-sky-600 hover:underline"
              >
                Manage plans →
              </Link>
            </CardContent>
          </Card>

          <Card className="border-slate-200/70 bg-white/90 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Member mix</CardTitle>
              <CardDescription>
                {formatNumber(stats.adminCount)} admins •{" "}
                {formatNumber(stats.memberCount)} members
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-2xl font-semibold text-slate-900">
                {memberRatio}% admins
              </p>
              <p className="text-xs text-muted-foreground">
                Keep admin seats purposeful—promote or demote roles from the
                user list.
              </p>
              <Link
                href={adminPath("users")}
                className="text-xs font-medium text-sky-600 hover:underline"
              >
                Review members →
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            Recent activity
          </h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <RecentProductsCard products={products} days={days} />
          <RecentUsersCard users={users} days={days} />
        </div>
      </section>
    </div>
  )
}

function RecentProductsCard({
  products,
  days,
}: {
  products: RecentProduct[]
  days: number
}) {
  return (
    <Card className="border-slate-200/70 bg-white/90 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Recent launches</CardTitle>
        <CardDescription>
          Products added in the last {days} days.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {products.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No launches in this window.
          </p>
        ) : (
          <ul className="space-y-3 text-sm">
            {products.map((product) => {
              const verified = product.verification?.isVerified
              return (
                <li key={product.id} className="space-y-1">
                  <div className="flex items-center justify-between gap-3">
                    <Link
                      href={adminPath("products", product.id)}
                      className="font-medium text-slate-900 hover:underline"
                    >
                      {product.name}
                    </Link>
                    <div className="flex items-center gap-2">
                      {product.plan?.name ? (
                        <Badge variant="outline" className="bg-transparent">
                          {product.plan.name}
                        </Badge>
                      ) : null}
                      <Badge variant={verified ? "success" : "outline"}>
                        {verified ? "Verified" : "Needs verification"}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>Owner: {product.user.email}</span>
                    <span>
                      {formatDistanceToNow(new Date(product.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                    <span>
                      {product.category?.name
                        ? product.category.name
                        : "Uncategorised"}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
      <CardFooter>
        <Link
          href={adminPath("products")}
          className="text-sm text-sky-600 hover:underline"
        >
          View all products →
        </Link>
      </CardFooter>
    </Card>
  )
}

function RecentUsersCard({
  users,
  days,
}: {
  users: RecentUser[]
  days: number
}) {
  return (
    <Card className="border-slate-200/70 bg-white/90 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Recent members</CardTitle>
        <CardDescription>
          Accounts created in the last {days} days.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {users.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No new members in this window.
          </p>
        ) : (
          <ul className="space-y-3 text-sm">
            {users.map((user) => (
              <li key={user.id} className="space-y-1">
                <Link
                  href={adminPath("users", user.id)}
                  className="font-medium text-slate-900 hover:underline"
                >
                  {user.firstName} {user.lastName}
                </Link>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>{user.email}</span>
                  <span>
                    {formatDistanceToNow(new Date(user.createdAt), {
                      addSuffix: true,
                    })}
                  </span>
                  <Badge
                    variant={user.role === "admin" ? "default" : "outline"}
                  >
                    {user.role === "admin" ? "Admin" : "Member"}
                  </Badge>
                  <span>{user.products.length} products</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      <CardFooter>
        <Link
          href={adminPath("users")}
          className="text-sm text-sky-600 hover:underline"
        >
          View all members →
        </Link>
      </CardFooter>
    </Card>
  )
}

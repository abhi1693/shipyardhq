import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"
import { formatDistanceToNow } from "date-fns"
import { StatCard } from "@/components/molecules/StatCard"
import Link from "next/link"
import {
  getUserDashboardStats,
  getUserProducts,
  getUnverifiedProducts,
  getUserDrafts,
  getTopProductsByMetric,
  getExpiringBadges,
  getProductsNeedingMedia,
  getRecentActivity,
  getProductHealthSummary,
} from "@/actions/member/overview/actions"
import { EmptyState } from "@/components/molecules/empty-state"
import { formatBoolean, linkify, placeholder } from "@/lib/ui/formatters"
import { Button } from "@/components/atoms/button"
import RangeSelector from "@/components/molecules/RangeSelector"
import { VerifyDomainButton } from "@/components/molecules/VerifyDomainButton"

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

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams
  const days = rangeToDays(sp?.range)
  const [
    stats,
    products,
    unverified,
    drafts,
    topByClicks,
    topByUpvotes,
    expiringBadges,
    needsMedia,
    activity,
    health,
  ] = await Promise.all([
    getUserDashboardStats(days),
    getUserProducts(5, days),
    getUnverifiedProducts(3),
    getUserDrafts(3),
    getTopProductsByMetric("clicks", 3, days),
    getTopProductsByMetric("upvotes", 3, days),
    getExpiringBadges(5, 14),
    getProductsNeedingMedia(2, 5),
    getRecentActivity(days, 10),
    getProductHealthSummary(days),
  ])

  return (
    <>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <h1 className="text-xl font-semibold tracking-tight">Overview</h1>
        <div className="flex items-center gap-2">
          <RangeSelector />
          <div className="hidden sm:flex items-center gap-2">
            <Link href="/member/products/add">
              <Button
                size="sm"
                className="text-white shadow-sm bg-[linear-gradient(90deg,var(--brand-1),var(--brand-2),var(--brand-3))] hover:opacity-90"
              >
                Add Product
              </Button>
            </Link>
            {stats.draftsCount > 0 && (
              <Link href="/member/products?status=draft">
                <Button variant="outline" size="sm">
                  Finish Drafts ({stats.draftsCount})
                </Button>
              </Link>
            )}
            {stats.unverifiedCount > 0 && (
              <Link href="/member/products?verification=unverified">
                <Button variant="outline" size="sm">
                  Verify Domain ({stats.unverifiedCount})
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="mx-0 mb-4 h-px rounded-full bg-[linear-gradient(90deg,var(--brand-1),var(--brand-2),var(--brand-3))] opacity-70" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Products Created"
          value={stats.totalProducts}
          subheading={`+${stats.productsInRange} in last ${days}d`}
        />
        <StatCard
          title="Verified Domains"
          value={stats.verifiedDomains}
          subheading={`${stats.verifiedRate}% verified`}
          badge={`${stats.verifiedRate}%`}
          trend="up"
        />
        <StatCard
          title="Total Clicks"
          value={stats.totalClicks}
          subheading="All-time engagement"
        />
        <StatCard
          title="Upvotes Received"
          value={stats.totalUpvotes}
          subheading="Community signals"
        />
      </div>

      {/* Health & Top products */}
      <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Product Health</CardTitle>
            <CardDescription>Average completeness across your products</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <StatCard
              title="Average score"
              value={`${health.averageScore}%`}
              progress={health.averageScore}
              subheading={`${health.averageScore}% complete`}
            />
            {health.suggestions?.length ? (
              <div className="space-y-2">
                <div className="text-sm font-medium">Top fixes</div>
                <ul className="text-sm list-disc pl-5 space-y-1">
                  {health.suggestions.slice(0, 3).map((s, i) => (
                    <li key={i}>
                      <Link href={s.href || "/member/products"} className="text-primary hover:underline">
                        {s.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Top Products</CardTitle>
            <CardDescription>Performance in last {days}d</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium mb-2">By Clicks</div>
              {topByClicks.length === 0 ? (
                <div className="text-sm text-muted-foreground">No data</div>
              ) : (
                <ul className="space-y-2">
                  {topByClicks.map((p) => (
                    <li key={p.id} className="flex items-center justify-between">
                      {linkify({ label: p.name, href: `/member/products/${p.slug}` })}
                      <span className="text-sm text-muted-foreground">{p.analytics?.clicks ?? 0}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <div className="text-sm font-medium mb-2">By Upvotes</div>
              {topByUpvotes.length === 0 ? (
                <div className="text-sm text-muted-foreground">No data</div>
              ) : (
                <ul className="space-y-2">
                  {topByUpvotes.map((p) => (
                    <li key={p.id} className="flex items-center justify-between">
                      {linkify({ label: p.name, href: `/member/products/${p.slug}` })}
                      <span className="text-sm text-muted-foreground">{p.analytics?.upvotes ?? 0}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actionables: Unverified, Drafts, Media, Badges */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Unverified Domains</CardTitle>
            <CardDescription>Verify to unlock trust</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {unverified.length === 0 ? (
              <div className="text-sm text-muted-foreground">All set 🎉</div>
            ) : (
              unverified.map((p) => (
                <div key={p.id} className="text-sm">
                  <div className="flex items-center justify-between gap-2">
                    {linkify({ label: p.name, href: `/member/products/${p.slug}` })}
                    <Link href={`/member/products/${p.slug}`} className="text-primary hover:underline text-xs">View</Link>
                  </div>
                  <div className="text-xs text-muted-foreground break-all mt-1">TXT: {p.verification?.verificationTxt}</div>
                  <div className="mt-2">
                    <VerifyDomainButton productId={p.id} />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Drafts</CardTitle>
            <CardDescription>Finish and publish</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {drafts.length === 0 ? (
              <div className="text-sm text-muted-foreground">No drafts</div>
            ) : (
              drafts.map((d) => (
                <div key={d.id} className="flex items-center justify-between text-sm">
                  {linkify({ label: d.name, href: `/member/products/${d.slug}` })}
                  <Link href={`/member/products/${d.slug}/edit`} className="text-primary hover:underline text-xs">Resume</Link>
                </div>
              ))
            )}
          </CardContent>
          {stats.draftsCount > 0 && (
            <CardFooter>
              {linkify({ label: `View all drafts →`, href: "/member/products?status=draft" })}
            </CardFooter>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Add Screenshots</CardTitle>
            <CardDescription>Improve conversion with visuals</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {needsMedia.length === 0 ? (
              <div className="text-sm text-muted-foreground">Looks good</div>
            ) : (
              needsMedia.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  {linkify({ label: p.name, href: `/member/products/${p.slug}` })}
                  <Link href={`/member/products/${p.slug}`} className="text-primary hover:underline text-xs">Open</Link>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Expiring Badges</CardTitle>
            <CardDescription>Keep momentum up</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {expiringBadges.length === 0 ? (
              <div className="text-sm text-muted-foreground">None</div>
            ) : (
              expiringBadges.map((b) => (
                <div key={b.id} className="flex items-center justify-between text-sm">
                  <span className="truncate mr-2">{b.product.name} — {b.badge}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(b.expiresAt as any), { addSuffix: true })}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent products and activity */}
      <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Recent Products</CardTitle>
            <CardDescription>Your latest 5 submissions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {products.length === 0 ? (
              <EmptyState
                title="No products yet"
                description="Start by adding your first product to get visibility."
                actionLabel="Add Product"
                actionHref="/member/products/add"
              />
            ) : (
              products.map((p) => (
                <div key={p.id} className="flex flex-col gap-1 border-b pb-3">
                  <div className="flex justify-between items-center">
                    {linkify({
                      label: p.name,
                      href: `/member/products/${p.slug}`,
                    })}
                    <span className="text-muted-foreground text-sm">
                      {formatDistanceToNow(new Date(p.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                    {p?.verification
                      ? formatBoolean(
                          p.verification.isVerified,
                          "Verified",
                          "Not Verified",
                        )
                      : placeholder()}
                    <span>Clicks: {p.analytics?.clicks || 0}</span>
                    <span>Upvotes: {p.analytics?.upvotes || 0}</span>
                    <Link href={`/member/products/${p.slug}/edit`} className="text-primary hover:underline">
                      Edit
                    </Link>
                  </div>
                </div>
              ))
            )}
          </CardContent>
          {products.length > 0 && (
            <CardFooter>
              {linkify({
                label: `View all your products →`,
                href: "/member/products",
              })}
            </CardFooter>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Last {days}d</CardDescription>
          </CardHeader>
          <CardContent>
            {activity.length === 0 ? (
              <div className="text-sm text-muted-foreground">No recent activity</div>
            ) : (
              <ul className="space-y-2 text-sm">
                {activity.map((a, i) => (
                  <li key={i} className="flex items-center justify-between">
                    <div className="truncate">
                      {a.type === "product_created" && (
                        <span>Created {linkify({ label: a.product.name, href: `/member/products/${a.product.slug}` })}</span>
                      )}
                      {a.type === "product_updated" && (
                        <span>Updated {linkify({ label: a.product.name, href: `/member/products/${a.product.slug}` })}</span>
                      )}
                      {a.type === "domain_verified" && (
                        <span>Verified domain for {linkify({ label: a.product.name, href: `/member/products/${a.product.slug}` })}</span>
                      )}
                      {a.meta?.badge && a.type === "badge_assigned" && (
                        <span>Badge “{a.meta.badge}” added to {linkify({ label: a.product.name, href: `/member/products/${a.product.slug}` })}</span>
                      )}
                      {a.type === "product_upvoted" && (
                        <span>Upvote received on {linkify({ label: a.product.name, href: `/member/products/${a.product.slug}` })}</span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground ml-2 whitespace-nowrap">
                      {formatDistanceToNow(a.ts)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}

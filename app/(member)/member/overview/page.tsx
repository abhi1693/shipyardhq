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
} from "@/actions/member/overview/actions"
import { EmptyState } from "@/components/molecules/empty-state"
import { formatBoolean, linkify, placeholder } from "@/lib/ui/formatters"
import { Button } from "@/components/atoms/button"
import RangeSelector from "@/components/molecules/RangeSelector"

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
  const [stats, products] = await Promise.all([
    getUserDashboardStats(days),
    getUserProducts(5, days),
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

      <div className="mt-10">
        <Card>
          <CardHeader>
            <CardTitle>Recent Products</CardTitle>
            <CardDescription>Your latest 5 submissions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {products.length === 0 ? (
              <EmptyState
                title="No products yet"
                description="Start by uploading your first product to get visibility."
                actionLabel="Upload Product"
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
      </div>
    </>
  )
}

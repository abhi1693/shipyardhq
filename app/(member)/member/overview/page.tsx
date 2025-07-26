import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"
import { Badge } from "@/components/atoms/badge"
import { formatDistanceToNow } from "date-fns"
import { StatCard } from "@/components/molecules/StatCard"
import {
  getUserDashboardStats,
  getUserProducts,
} from "@/actions/member/overview/actions"
import { EmptyState } from "@/components/molecules/empty-state"
import { formatBoolean, linkify, placeholder } from "@/lib/ui/formatters"

export default async function OverviewPage() {
  const stats = await getUserDashboardStats()
  const products = await getUserProducts(5)

  return (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Products Created"
          value={stats.totalProducts}
          subheading={`+${stats.productsLast7Days} this week`}
          trend="up"
        />
        <StatCard
          title="Verified Domains"
          value={stats.verifiedDomains}
          subheading={`${stats.verifiedRate}% verified`}
          badge={`${stats.verifiedRate}%`}
          trend="up"
        />
        <StatCard
          title="Total Views"
          value={stats.totalViews}
          subheading="All-time engagement"
        />
        <StatCard
          title="Upvotes Received"
          value={stats.totalUpvotes}
          subheading="Community signals"
        />
      </div>

      {/* Recent Products */}
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
                      href: `/member/products/${p.id}`,
                    })}
                    <span className="text-muted-foreground text-sm">
                      {formatDistanceToNow(new Date(p.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                    <Badge
                      variant={
                        p.verification?.isVerified ? "default" : "outline"
                      }
                    >
                      {p?.verification
                        ? formatBoolean(
                            p.verification.isVerified,
                            "Verified",
                            "Not Verified",
                          )
                        : placeholder()}
                    </Badge>
                    <span>Views: {p.analytics?.views || 0}</span>
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

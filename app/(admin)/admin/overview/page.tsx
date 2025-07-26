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

export default async function OverviewPage() {
  const stats = await getDashboardStats()
  const products = await getRecentProducts(10)
  const users = await getRecentUsers(10)

  return (
    <>
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Products"
          value={stats.totalProducts}
          badge={`+${stats.productsLast7Days}`}
          trend="up"
          subheading="New this week"
          footnote="Compared to last 7 days"
        />

        <StatCard
          title="Verified Domains"
          value={stats.verifiedProducts}
          badge={`${stats.verifiedRate}%`}
          trend="up"
          subheading={`${stats.verifiedRate}% verified`}
          footnote="TXT records matched"
        />

        <StatCard
          title="Unverified Domains"
          value={stats.unverifiedProducts}
          subheading="Remaining to verify"
          footnote="Auto-check recommended"
        />

        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          badge={`+${stats.usersLast7Days}`}
          trend="up"
          subheading={`${stats.adminCount} admins, ${stats.memberCount} members`}
          footnote="All registered users"
        />

        {stats.mostPopularPlan && (
          <StatCard
            title="Most Used Plan"
            value={stats.mostPopularPlan.name}
            badge={`${stats.mostPopularPlan.count} products`}
            subheading="Highest plan adoption"
            footnote="Based on current usage"
          />
        )}
        <StatCard
          title="Default Plan Products"
          value={stats.defaultPlanProductCount}
          subheading="Auto-assigned on creation"
          footnote="Changeable per product"
        />

        <StatCard
          title="Total Revenue (Est.)"
          value={`$${(stats.totalRevenue / 100).toFixed(2)}`}
          subheading="Based on plan pricing"
          footnote="Without discounts applied"
        />
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-10">
        <Card>
          <CardHeader>
            <CardTitle>Recent Products</CardTitle>
            <CardDescription>Latest 10 submissions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {products.map((p) => (
              <div key={p.id} className="flex flex-col gap-1 border-b pb-3">
                <div className="flex justify-between items-center">
                  <Link
                    href={`/admin/products/${p.id}`}
                    className="text-blue-600 font-medium"
                  >
                    {p.name}
                  </Link>
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
              </div>
            ))}
          </CardContent>
          <CardFooter>
            <Link
              href="/admin/products"
              className="text-sm text-blue-600 hover:underline"
            >
              View all products →
            </Link>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Users</CardTitle>
            <CardDescription>Latest 10 registrations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {users.map((u) => (
              <div key={u.id} className="flex flex-col gap-1 border-b pb-3">
                <div className="flex justify-between items-center">
                  <Link
                    href={`/admin/users/${u.id}`}
                    className="text-blue-600 font-medium"
                  >
                    {u.email}
                  </Link>
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
              </div>
            ))}
          </CardContent>
          <CardFooter>
            <Link
              href="/admin/users"
              className="text-sm text-blue-600 hover:underline"
            >
              View all users →
            </Link>
          </CardFooter>
        </Card>
      </div>
    </>
  )
}

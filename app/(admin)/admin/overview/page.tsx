import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/atoms/card"
import Link from "next/link"
import { formatDate } from "@/lib/ui/formatters"
import { StatCard } from "@/components/molecules/StatCard"
import {
  getDashboardStats,
  getRecentProducts,
  getRecentUsers,
} from "@/actions/admin/overview/actions"

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
          subheading="New this week"
          footnote="Includes active accounts"
        />
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-10">
        <Card>
          <CardHeader>
            <CardTitle>Recent Products</CardTitle>
            <CardDescription>Latest 10 product submissions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {products.map((p) => (
              <div key={p.id} className="flex justify-between">
                <Link
                  href={`/admin/products/${p.id}`}
                  className="text-blue-600 hover:underline"
                >
                  {p.name}
                </Link>
                <span className="text-muted-foreground text-sm">
                  {formatDate(p.createdAt)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Users</CardTitle>
            <CardDescription>Latest 10 registered users</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {users.map((u) => (
              <div key={u.id} className="flex justify-between">
                <Link
                  href={`/admin/users/${u.id}`}
                  className="text-blue-600 hover:underline"
                >
                  {u.email}
                </Link>
                <span className="text-muted-foreground text-sm">
                  {formatDate(u.createdAt)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  )
}

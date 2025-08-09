import {
  getLeaderboardStats,
  getTopRankedProducts,
} from "@/actions/public/leaderboard/actions"
import { Metadata } from "next"

import { Badge } from "@/components/atoms/badge"
import { StatCard } from "@/components/molecules/StatCard"
import {
  IconPackage,
  IconThumbUp,
  IconUsers,
  IconTrophy,
} from "@tabler/icons-react"
import { ProductCard } from "@/components/molecules/ProductCard"
import { getCategoriesWithCounts } from "@/actions/public/categories/actions"
import { LeaderboardFilters } from "./filters"
import PublicContainer from "@/components/layout/PublicContainer"
import { PageHeader } from "@/components/molecules/PageHeader"
import ProductList from "@/components/molecules/ProductList"
import Medal from "@/components/atoms/Medal"

export const metadata: Metadata = {
  title: "Product Leaderboard",
  description: "See the most upvoted products across the platform.",
}

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: { category?: string; limit?: string }
}) {
  const stats = await getLeaderboardStats()
  const categories = await getCategoriesWithCounts()
  const limit = Number(searchParams?.limit || 50)
  const categorySlug = searchParams?.category || undefined
  const products = await getTopRankedProducts({ limit, categorySlug })
  const topThree = products.slice(0, 3)
  const rest = products.slice(3)

  return (
    <PublicContainer max="7xl" paddingY="py-12" innerClassName="space-y-10">
      {/* Header */}
      <PageHeader
        title="🏆 Product Leaderboard"
        subtitle="Discover the most popular products ranked by community upvotes. See which innovations are leading the way and getting the most love from our community."
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          title="Total Products"
          value={stats.totalProducts}
          subheading="Products competing"
          icon={<IconPackage className="size-5" />}
          tooltip="Total number of products listed"
        />
        <StatCard
          title="Total Upvotes"
          value={stats.totalUpvotes}
          subheading="Community votes"
          icon={<IconThumbUp className="size-5" />}
          tooltip="All-time upvotes from the community"
        />
        <StatCard
          title="Creators"
          value={stats.totalCreators}
          subheading="Active builders"
          icon={<IconUsers className="size-5" />}
          tooltip="Unique user accounts"
        />
        <StatCard
          title="Top Score"
          value={stats.topScore}
          subheading="Highest upvotes"
          icon={<IconTrophy className="size-5" />}
          tooltip="Highest upvotes on a single product"
        />
      </div>

      {/* Filters */}
      <LeaderboardFilters
        categories={categories}
        selected={categorySlug}
        limit={limit}
      />

      {/* Top 3 Featured */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 place-items-center">
        {topThree.map((product, index) => (
          <div key={product.id} className="w-full max-w-sm">
            <ProductCard
              product={{
                id: product.id,
                name: product.name,
                logo: product.logo,
                tagline: product.tagline,
              }}
              upvotes={product.analytics?.upvotes ?? 0}
              author={{
                name: `${product.user.firstName ?? ""} ${
                  product.user.lastName ?? ""
                }`.trim(),
                initial: (product.user.firstName?.[0] ?? "?").toUpperCase(),
              }}
              category={product.category.name}
              topRight={<Medal rank={(index + 1) as 1 | 2 | 3} />}
            />
          </div>
        ))}
      </div>

      {/* Leaderboard Grid (similar to category page) */}
      <ProductList
        items={rest.map((p) => ({
          ...p,
          badges: p.ProductBadge?.map((pb) => pb.badge),
        }))}
        compact
        showCategory
        showRank
        rankStartAt={3}
      />
    </PublicContainer>
  )
}

import {
  getLeaderboardStats,
  getTopRankedProducts,
} from "@/actions/public/leaderboard/actions"
import { Metadata } from "next"

import { Card } from "@/components/atoms/card"
import { Avatar, AvatarFallback } from "@/components/atoms/avatar"
import { Badge } from "@/components/atoms/badge"
import { ThumbsUp } from "lucide-react"
import { StatCard } from "@/components/molecules/StatCard"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Product Leaderboard",
  description: "See the most upvoted products across the platform.",
}

export default async function LeaderboardPage() {
  const stats = await getLeaderboardStats()
  const products = await getTopRankedProducts()

  return (
    <div className="min-h-screen w-full px-4 md:px-8 py-10 space-y-10">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight flex items-center gap-2">
          🏆 Product Leaderboard
        </h1>
        <p className="text-muted-foreground max-w-3xl">
          Discover the most popular products ranked by community upvotes. See
          which innovations are leading the way and getting the most love from
          our community.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          title="Total Products"
          value={stats.totalProducts}
          subheading="Products competing"
        />
        <StatCard
          title="Total Upvotes"
          value={stats.totalUpvotes}
          subheading="Community votes"
        />
        <StatCard
          title="Creators"
          value={stats.totalCreators}
          subheading="Active builders"
        />
        <StatCard
          title="Top Score"
          value={stats.topScore}
          subheading="Highest upvotes"
        />
      </div>

      {/* Leaderboard List */}
      <div className="space-y-4">
        {products.map((product, index) => (
          <Link
            key={product.id}
            href={`/products/${product.id}`}
            className="block"
          >
            <Card className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 gap-4 shadow-sm border hover:shadow-md transition cursor-pointer">
              {/* Left: Rank + Product Info */}
              <div className="flex items-start gap-4">
                <Badge
                  variant="secondary"
                  className="text-xs font-medium px-2 py-1 rounded-full mt-1"
                >
                  #{index + 1}
                </Badge>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-semibold leading-snug">
                      {product.name}
                    </h3>
                    <Badge variant="outline" className="text-xs">
                      {product.category.name}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground leading-tight line-clamp-1">
                    {product.tagline}
                  </p>
                </div>
              </div>

              {/* Right: Upvotes + Author */}
              <div className="flex items-center gap-4 mt-2 sm:mt-0 sm:ml-auto text-sm shrink-0">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <ThumbsUp className="w-4 h-4" />
                  <span>{product.analytics?.upvotes ?? 0}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback>
                      {product.user.firstName?.[0] ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">
                    {product.user.firstName} {product.user.lastName}
                  </span>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}

import { getTopCategories, getTrendingProducts } from "@/actions/public/products/featured"
import { getLeaderboardStats } from "@/actions/public/leaderboard/actions"
import { DirectoryRadarDigest } from "@/components/organisms/directory/RadarDigest"
import { Skeleton } from "@/components/atoms/skeleton"
import { computeTrendRadarMetrics } from "@/lib/trend-radar"
import {
  HOMEPAGE_TOP_CATEGORY_LIMIT,
  TREND_RADAR_CATEGORY_LIMIT,
} from "./constants"

export async function RadarDigestSection() {
  const [topCategories, trendingProducts, stats] = await Promise.all([
    getTopCategories(HOMEPAGE_TOP_CATEGORY_LIMIT),
    getTrendingProducts(6),
    getLeaderboardStats(),
  ])

  const radarSourceCategories = topCategories.map((category) => ({
    id: category.id,
    slug: category.slug,
    name: category.name,
    icon: category.icon,
    productCount: category._count.products,
  }))

  const radarTrending = trendingProducts.map((entry) => ({
    categoryName: entry.product.category?.name ?? null,
    upvotes: entry.product.analytics?.upvotes ?? null,
  }))

  const radarData = computeTrendRadarMetrics(
    radarSourceCategories,
    radarTrending,
    {
      limit: TREND_RADAR_CATEGORY_LIMIT,
      totalProducts: stats.totalProducts,
    },
  )

  return (
    <DirectoryRadarDigest metrics={radarData.metrics} totals={radarData.totals} />
  )
}

export function RadarDigestSkeleton() {
  return (
    <section className="rounded-3xl border border-border bg-white p-6 shadow-sm">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="mt-2 h-4 w-4/5" />
      <div className="mt-6 space-y-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-20 rounded-2xl" />
        ))}
      </div>
      <div className="mt-6 grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-16 rounded-2xl" />
        ))}
      </div>
    </section>
  )
}

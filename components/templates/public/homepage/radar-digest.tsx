import {
  getTopCategories,
  getTrendingProducts,
} from "@/actions/public/products/featured"
import { getLeaderboardStats } from "@/actions/public/leaderboard/actions"
import { DirectoryRadarDigest } from "@/components/organisms/directory/RadarDigest"
import DirectoryRadarDigestSkeleton from "@/components/organisms/directory/RadarDigest.skeleton"
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
    <DirectoryRadarDigest
      metrics={radarData.metrics}
      totals={radarData.totals}
    />
  )
}

export function RadarDigestSkeleton() {
  return <DirectoryRadarDigestSkeleton />
}

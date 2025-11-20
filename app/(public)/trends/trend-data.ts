import { getLeaderboardStats } from "@/actions/public/leaderboard/actions"
import {
  getTopCategories,
  getTrendingProducts,
} from "@/actions/public/products/featured"
import { computeTrendRadarMetrics } from "@/lib/trend-radar"

export async function fetchTrendRadarSnapshot(limit = 12) {
  const [topCategories, trendingProducts, stats] = await Promise.all([
    getTopCategories(limit),
    getTrendingProducts(limit),
    getLeaderboardStats(),
  ])

  type TopCategory = (typeof topCategories)[number]
  const radarSourceCategories = topCategories.map((category: TopCategory) => ({
    id: category.id,
    slug: category.slug,
    name: category.name,
    icon: category.icon,
    productCount: category._count.products,
  }))

  type TrendingEntry = (typeof trendingProducts)[number]
  const radarTrending = trendingProducts.map((entry: TrendingEntry) => ({
    categoryName: entry.product.category?.name ?? null,
    upvotes: entry.product.analytics?.upvotes ?? null,
  }))

  const radar = computeTrendRadarMetrics(radarSourceCategories, radarTrending, {
    limit,
    totalProducts: stats.totalProducts,
  })

  return {
    topCategories,
    stats,
    radar,
    generatedAt: new Date(),
  }
}

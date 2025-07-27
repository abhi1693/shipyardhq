import LandingHero from "@/components/organisms/LandingHero"
import { FeaturedHighlights } from "@/components/organisms/FeaturedHighlights"
import {
  getFeaturedProducts,
  getLatestLaunches,
  getTopCategories,
  getTrendingProducts,
} from "@/actions/public/products/featured"
import { LatestLaunches } from "@/components/organisms/LatestLaunches"
import { Leaderboard } from "@/components/organisms/Leaderboard"
import { TopCategories } from "@/components/organisms/TopCategories"

export default async function HomePage() {
  const featuredProducts = await getFeaturedProducts()
  const latestLaunches = await getLatestLaunches()
  const trendingProducts = await getTrendingProducts()
  const topCategories = await getTopCategories()

  return (
    <main className="min-h-screen flex flex-col">
      <LandingHero />
      <FeaturedHighlights products={featuredProducts} />
      <LatestLaunches products={latestLaunches} />
      <Leaderboard products={trendingProducts} />
      <TopCategories categories={topCategories} />
    </main>
  )
}

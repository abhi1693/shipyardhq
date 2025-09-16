import LandingHero from "@/components/organisms/LandingHero"
import { FeaturedHighlights } from "@/components/organisms/FeaturedHighlights"
import {
  getProducts,
  getTopCategories,
  getTrendingProducts,
  getHomepageFeatureProducts,
} from "@/actions/public/products/featured"
import { LatestLaunches } from "@/components/organisms/LatestLaunches"
import { Leaderboard } from "@/components/organisms/Leaderboard"
import { TopCategories } from "@/components/organisms/TopCategories"
import { EditorsPick } from "@/components/organisms/EditorsPick"
import HomepageSpotlight from "@/components/organisms/HomepageSpotlight"
import { getLeaderboardStats } from "@/actions/public/leaderboard/actions"

export default async function HomePage() {
  const [
    featuredProducts,
    editorsPick,
    latestLaunches,
    trendingProducts,
    topCategories,
    homepagePromo,
    stats,
  ] = await Promise.all([
    getProducts("featured"),
    getProducts("editor-pick"),
    getProducts("new"),
    getTrendingProducts(3),
    getTopCategories(),
    getHomepageFeatureProducts(6),
    getLeaderboardStats(),
  ])

  return (
    <>
      <LandingHero
        stats={{
          totalProducts: stats.totalProducts,
          totalCreators: stats.totalCreators,
          totalUpvotes: stats.totalUpvotes,
        }}
      />
      <HomepageSpotlight products={homepagePromo} />
      <FeaturedHighlights products={featuredProducts} />
      <EditorsPick products={editorsPick} />
      <LatestLaunches products={latestLaunches} />
      <Leaderboard products={trendingProducts} />
      <TopCategories categories={topCategories} />
    </>
  )
}

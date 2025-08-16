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

export default async function HomePage() {
  const featuredProducts = await getProducts("featured")
  const editorsPick = await getProducts("editor-pick")
  const latestLaunches = await getProducts("new")
  const trendingProducts = await getTrendingProducts(3)
  const topCategories = await getTopCategories()
  const homepagePromo = await getHomepageFeatureProducts(6)

  return (
    <>
      <LandingHero />
      <HomepageSpotlight products={homepagePromo} />
      <FeaturedHighlights products={featuredProducts} />
      <EditorsPick products={editorsPick} />
      <LatestLaunches products={latestLaunches} />
      <Leaderboard products={trendingProducts} />
      <TopCategories categories={topCategories} />
    </>
  )
}

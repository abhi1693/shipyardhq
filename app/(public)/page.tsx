import LandingHero from "@/components/organisms/LandingHero"
import { FeaturedHighlights } from "@/components/organisms/FeaturedHighlights"
import {
  getFeaturedProducts,
  getEditorsPick,
  getLatestLaunches,
  getTopCategories,
  getTrendingProducts,
} from "@/actions/public/products/featured"
import { LatestLaunches } from "@/components/organisms/LatestLaunches"
import { Leaderboard } from "@/components/organisms/Leaderboard"
import { TopCategories } from "@/components/organisms/TopCategories"
import { EditorsPick } from "@/components/organisms/EditorsPick"

export default async function HomePage() {
  const featuredProducts = await getFeaturedProducts()
  const editorsPick = await getEditorsPick()
  const latestLaunches = await getLatestLaunches()
  const trendingProducts = await getTrendingProducts(3)
  const topCategories = await getTopCategories()

  return (
    <>
      <LandingHero />
      <FeaturedHighlights products={featuredProducts} />
      <EditorsPick products={editorsPick} />
      <LatestLaunches products={latestLaunches} />
      <Leaderboard products={trendingProducts} />
      <TopCategories categories={topCategories} />
    </>
  )
}

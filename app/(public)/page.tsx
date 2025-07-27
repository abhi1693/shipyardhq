import LandingHero from "@/components/organisms/LandingHero"
import { FeaturedHighlights } from "@/components/organisms/FeaturedHighlights"
import {
  getFeaturedProducts,
  getLatestLaunches,
} from "@/actions/public/products/featured"
import { LatestLaunches } from "@/components/organisms/LatestLaunches"

export default async function HomePage() {
  const featuredProducts = await getFeaturedProducts()
  const latestLaunches = await getLatestLaunches()

  return (
    <main className="min-h-screen flex flex-col">
      <LandingHero />
      <FeaturedHighlights products={featuredProducts} />
      <LatestLaunches products={latestLaunches} />
    </main>
  )
}

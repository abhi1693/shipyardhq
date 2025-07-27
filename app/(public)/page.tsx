import LandingHero from "@/components/organisms/LandingHero"
import { FeaturedHighlights } from "@/components/organisms/FeaturedHighlights"
import { getFeaturedProducts } from "@/actions/public/products/featured"

export default async function HomePage() {
  const featuredProducts = await getFeaturedProducts()

  return (
    <main className="min-h-screen flex flex-col">
      <LandingHero />
      <FeaturedHighlights products={featuredProducts} />
    </main>
  )
}

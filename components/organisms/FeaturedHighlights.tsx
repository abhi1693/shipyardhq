import FeaturedProductCard from "@/components/molecules/FeaturedProductCard"
import CTAFeatureYourProductCard from "@/components/molecules/CTAFeatureYourProductCard"
import { FeaturedProduct } from "@/types"

export function FeaturedHighlights({
  products,
}: {
  products: FeaturedProduct[]
}) {
  return (
    <section className="py-16 border-b">
      <div className="max-w-7xl mx-auto px-4 space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight">
            Featured Highlights
          </h2>
          <p className="text-muted-foreground mt-2">
            Curated products making waves right now.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {products.map((product) => (
            <FeaturedProductCard key={product.id} product={product} />
          ))}

          {/* Always show the promo card at the end */}
          <CTAFeatureYourProductCard />
        </div>
      </div>
    </section>
  )
}

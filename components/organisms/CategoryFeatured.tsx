import { FeaturedProduct } from "@/types"
import { PageSectionHeader } from "@/components/molecules/PageSectionHeader"
import FeaturedProductGrid from "@/components/molecules/FeaturedProductGrid"
import FeaturedBanner from "@/components/molecules/FeaturedBanner"

export default function CategoryFeatured({
  products,
  categoryName,
}: {
  products: FeaturedProduct[]
  categoryName: string
}) {
  if (!products || products.length === 0) return null
  const [first, ...rest] = products
  return (
    <section className="min-h-screen border-b py-8">
      <div className="mx-auto max-w-7xl px-4 md:px-8 space-y-6">
        <PageSectionHeader
          title={`Featured in ${categoryName}`}
          subtitle="Top picks in this category"
        />
        {/* Banner */}
        <FeaturedBanner item={first} />
        {/* Remaining featured */}
        {rest.length > 0 && <FeaturedProductGrid items={rest} />}
      </div>
    </section>
  )
}

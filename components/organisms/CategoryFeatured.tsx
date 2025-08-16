import { FeaturedProduct } from "@/types"
import PublicContainer from "@/components/layout/PublicContainer"
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
    <PublicContainer
      as="section"
      max="7xl"
      paddingY="py-8"
      innerClassName="space-y-6"
      className="border-b"
    >
      <PageSectionHeader
        title={`Featured in ${categoryName}`}
        subtitle="Top picks in this category"
      />
      {/* Banner */}
      <FeaturedBanner item={first} />
      {/* Remaining featured */}
      {rest.length > 0 && <FeaturedProductGrid items={rest} />}
    </PublicContainer>
  )
}

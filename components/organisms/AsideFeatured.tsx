import { FeaturedProduct } from "@/types"
import { PageSectionHeader } from "@/components/molecules/PageSectionHeader"
import FeaturedProductGrid from "@/components/molecules/FeaturedProductGrid"

export default function AsideFeatured({
  products,
  title = "Featured Spotlights",
}: {
  products: FeaturedProduct[]
  title?: string
}) {
  if (!products || products.length === 0) return null
  return (
    <aside className="sticky top-24 space-y-4">
      <PageSectionHeader title={title} subtitle="Curated picks" />
      <FeaturedProductGrid
        items={products.slice(0, 6)}
        columns="grid-cols-1"
        className="[&>*]:h-full"
      />
    </aside>
  )
}

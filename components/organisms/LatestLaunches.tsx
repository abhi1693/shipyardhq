import { FeaturedProduct } from "@/types"
import { DirectorySectionHeader } from "@/components/molecules/directory/SectionHeader"
import ProductList from "@/components/molecules/ProductList"

function toListItem(entry: FeaturedProduct) {
  const { product } = entry
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    logo: product.logo,
    tagline: product.tagline,
    analytics: product.analytics ?? null,
    category: product.category ?? undefined,
  }
}

export function LatestLaunches({ products }: { products: FeaturedProduct[] }) {
  if (!products || products.length === 0) return null

  const items = products.map(toListItem)

  return (
    <section className="rounded-3xl border border-border/80 bg-background/70 p-6 shadow-sm shadow-black/5 md:p-8">
      <DirectorySectionHeader
        kicker="New today"
        title="Fresh launches charted in the last 24 hours"
        description="Stay on the bleeding edge with products that just went live. Follow the momentum here, then dig deeper on /browse when you need full filters."
      />
      <div className="mt-8">
        <ProductList
          items={items}
          showCategory
          columns="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        />
      </div>
    </section>
  )
}

export default LatestLaunches

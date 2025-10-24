import { FeaturedProduct } from "@/types"
import { DirectorySectionHeader } from "@/components/molecules/directory/SectionHeader"
import { DirectoryProductList } from "@/components/organisms/directory/DirectoryProductList"

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
    <section className="rounded-3xl border border-border bg-white p-6 shadow-sm md:p-8">
      <DirectorySectionHeader
        kicker="New today"
        title="Fresh launches in the last 24 hours"
        description="Stay on the bleeding edge with products that just went live. Follow the momentum here, then dig deeper on /browse when you need full filters."
      />
      <div className="mt-8">
        <DirectoryProductList
          items={items}
          columns="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
          showCategory
          pageSize={8}
          sentinelMargin="-25% 0px 160px 0px"
        />
      </div>
    </section>
  )
}

export default LatestLaunches

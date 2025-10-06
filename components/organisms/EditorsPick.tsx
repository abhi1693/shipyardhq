import { FeaturedProduct } from "@/types"
import { DirectorySectionHeader } from "@/components/molecules/directory/SectionHeader"
import ProductList from "@/components/molecules/ProductList"

function toListItem(entry: FeaturedProduct) {
  const { product } = entry
  const activeBadges = (product.ProductBadge ?? []).filter((badge) => {
    if (!badge.expiresAt) return true
    return new Date(badge.expiresAt).getTime() > Date.now()
  })

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    logo: product.logo,
    tagline: product.tagline,
    badges: activeBadges.map((badge) => badge.badge),
    analytics: product.analytics ?? null,
    category: product.category ?? undefined,
  }
}

export function EditorsPick({ products }: { products: FeaturedProduct[] }) {
  if (!products || products.length === 0) return null

  const items = products.map(toListItem)

  return (
    <section className="rounded-3xl border border-border/80 bg-background/70 p-6 shadow-sm shadow-black/5 md:p-8">
      <DirectorySectionHeader
        kicker="Editorial picks"
        title="Crew-selected launches worth a closer look"
        description="An editorial sweep from the Shipyard crew. These picks blend strong storytelling, polish, and traction to help you spot the next standout ship."
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

export default EditorsPick

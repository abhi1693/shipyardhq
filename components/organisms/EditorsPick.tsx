import { FeaturedProduct } from "@/types"
import { DirectorySectionHeader } from "@/components/molecules/directory/SectionHeader"
import { DirectoryProductList } from "@/components/organisms/directory/DirectoryProductList"

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
    <section className="rounded-3xl border border-border bg-white p-6 shadow-sm md:p-8">
      <DirectorySectionHeader
        kicker="Team spotlight"
        title="Launches our editorial team can't stop talking about"
      />
      <div className="mt-8">
        <DirectoryProductList
          items={items}
          columns="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
          showCategory
          showBadges
          pageSize={8}
          sentinelMargin="-25% 0px 160px 0px"
        />
      </div>
    </section>
  )
}

export default EditorsPick

import type { HomepageFeaturePlacement } from "@/actions/public/products/featured"
import { DirectorySectionHeader } from "@/components/molecules/directory/SectionHeader"
import { DirectoryProductList } from "@/components/organisms/directory/DirectoryProductList"

interface SpotlightListItem {
  id: string
  slug: string
  name: string
  logo: string
  tagline: string
  analytics?: { upvotes?: number | null } | null
  category?: { name?: string | null } | null
  badges: string[]
}

function toSpotlightItem(placement: HomepageFeaturePlacement): SpotlightListItem {
  const { product } = placement
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    logo: product.logo,
    tagline: product.tagline,
    analytics: product.analytics ?? null,
    category: product.category ?? undefined,
    badges: [],
  }
}

export function HomepageSpotlight({
  placements,
}: {
  placements: HomepageFeaturePlacement[]
}) {
  if (!placements || placements.length === 0) return null

  const scheduled = placements
    .filter((entry) => entry.origin === "schedule")
    .map(toSpotlightItem)
  const queued = placements
    .filter((entry) => entry.origin === "plan")
    .map(toSpotlightItem)
  const orderedItems = [...scheduled, ...queued]

  return (
    <section className="rounded-3xl border border-border bg-white p-6 shadow-sm md:p-8">
      <DirectorySectionHeader
        kicker="Homepage spotlight"
        title="Flagship homepage spotlight"
        description="Command the first impression every visitor experiences. These premium slots pair scheduled takeovers with campaign boosts so your launch leads the directory the moment it goes live."
      />

      <div className="mt-8">
        <DirectoryProductList
          items={orderedItems}
          columns="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
        />
      </div>
    </section>
  )
}

export default HomepageSpotlight

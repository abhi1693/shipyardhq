import type { HomepageFeaturePlacement } from "@/actions/public/products/featured"
import { Sparkles } from "lucide-react"
import { DirectorySectionHeader } from "@/components/molecules/directory/SectionHeader"
import DirectoryProductList from "@/components/organisms/directory/DirectoryProductList"

interface SpotlightListItem {
  id: string
  slug: string
  name: string
  logo: string
  tagline: string
  analytics?: { upvotes?: number | null } | null
  category?: { name?: string | null } | null
  placementKind: "schedule" | "plan"
}

function toSpotlightItem(
  placement: HomepageFeaturePlacement,
): SpotlightListItem {
  const { product } = placement
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    logo: product.logo,
    tagline: product.tagline,
    analytics: product.analytics ?? null,
    category: product.category ?? undefined,
    placementKind: placement.origin,
  }
}

const PlacementBadge = () => (
  <span
    className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-100/70 text-amber-600 shadow-sm"
    aria-label="Sponsored placement"
  >
    <Sparkles className="h-3 w-3" aria-hidden />
  </span>
)

export function HomepageSpotlight({
  placements,
}: {
  placements: HomepageFeaturePlacement[]
}) {
  if (!placements || placements.length === 0) return null

  const scheduled = placements.filter((entry) => entry.origin === "schedule")
  const reserved = placements.filter((entry) => entry.origin === "plan")

  const sections: Array<{
    heading: string
    items: SpotlightListItem[]
    showBadge?: boolean
  }> = []

  if (scheduled.length > 0) {
    sections.push({
      heading: "Scheduled homepage takeovers",
      items: scheduled.map(toSpotlightItem),
      showBadge: true,
    })
  }

  const remaining = reserved.map(toSpotlightItem)

  return (
    <section className="rounded-3xl border border-border/80 bg-background/75 p-6 shadow-sm shadow-black/5 md:p-8">
      <DirectorySectionHeader
        kicker="Homepage spotlight"
        title="Flagship homepage spotlight"
        description="Command the first impression every visitor experiences. These premium slots pair scheduled takeovers with campaign boosts so your launch leads the directory the moment it goes live."
      />

      <div className="mt-8 space-y-8">
        {sections.map((section) => (
          <div key={section.heading} className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-base font-semibold text-foreground">
              <span>{section.heading}</span>
              {section.showBadge ? <PlacementBadge /> : null}
            </div>
            <DirectoryProductList
              items={section.items.map((item) => ({ ...item, badges: [] }))}
              columns="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
            />
          </div>
        ))}

        {remaining.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-base font-semibold text-foreground">
              <span>Plan upgrades on deck</span>
            </div>
            <DirectoryProductList
              items={remaining.map((item) => ({ ...item, badges: [] }))}
              columns="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
            />
          </div>
        ) : null}
      </div>
    </section>
  )
}

export default HomepageSpotlight

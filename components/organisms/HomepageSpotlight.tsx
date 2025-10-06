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
      heading: "Scheduled homepage placements",
      items: scheduled.map(toSpotlightItem),
      showBadge: true,
    })
  }

  if (reserved.length > 0) {
    sections.push({
      heading: "Reserved homepage placements",
      items: reserved.map(toSpotlightItem),
      showBadge: false,
    })
  }

  return (
    <section className="rounded-3xl border border-border/80 bg-background/75 p-6 shadow-sm shadow-black/5 md:p-8">
      <DirectorySectionHeader
        kicker="Homepage spotlight"
        title="Sponsored products greeting every visitor"
        description="Homepage placements are paid slots that stay visible the moment someone lands on Shipyard. We surface both scheduled blocks and plan-based add-ons in order of priority."
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
              columns="grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
            />
          </div>
        ))}
      </div>
    </section>
  )
}

export default HomepageSpotlight

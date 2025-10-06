import type { HomepageFeaturePlacement } from "@/actions/public/products/featured"
import { Badge } from "@/components/atoms/badge"
import { DirectorySectionHeader } from "@/components/molecules/directory/SectionHeader"
import DirectoryProductList from "@/components/organisms/directory/DirectoryProductList"

interface SpotlightListItem {
  id: string
  slug: string
  name: string
  logo: string
  tagline: string
  badges?: string[]
  analytics?: { upvotes?: number | null } | null
  category?: { name?: string | null } | null
  placementKind: "schedule" | "plan"
  placementLabel: string
  metaLabel?: string
}

function toSpotlightItem(
  placement: HomepageFeaturePlacement,
): SpotlightListItem {
  const { product } = placement
  const activeBadges = (product.ProductBadge ?? []).filter((badge) => {
    if (!badge.expiresAt) return true
    return new Date(badge.expiresAt).getTime() > Date.now()
  })

  const placementLabel =
    placement.origin === "schedule"
      ? placement.schedule?.slotKey?.replace(/[-_]/g, " ") ?? "Scheduled slot"
      : "Plan placement"

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    logo: product.logo,
    tagline: product.tagline,
    badges: activeBadges.map((badge) => badge.badge),
    analytics: product.analytics ?? null,
    category: product.category ?? undefined,
    placementKind: placement.origin,
    placementLabel,
    metaLabel: placementLabel,
  }
}

function PlacementBadge({ label }: { label: string }) {
  return (
    <Badge
      variant="outline"
      className="rounded-full border-amber-200 bg-amber-50 px-3 py-0.5 text-xs font-semibold text-amber-800 shadow-sm"
    >
      {label}
    </Badge>
  )
}

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
  }> = []

  if (scheduled.length > 0) {
    sections.push({
      heading: "Scheduled homepage placements",
      items: scheduled.map(toSpotlightItem),
    })
  }

  if (reserved.length > 0) {
    sections.push({
      heading: "Reserved homepage placements",
      items: reserved.map(toSpotlightItem),
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
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base font-semibold text-foreground">
                {section.heading}
              </h3>
              <PlacementBadge label="Sponsored" />
            </div>
            <DirectoryProductList
              items={section.items}
              columns="grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
              metaConfig={{
                type: "badge",
                badgeClassName:
                  "border-amber-200 bg-amber-50 text-amber-800 shadow-sm",
              }}
            />
          </div>
        ))}
      </div>
    </section>
  )
}

export default HomepageSpotlight

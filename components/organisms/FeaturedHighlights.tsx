import Link from "next/link"

import { FeaturedProduct } from "@/types"
import { Button } from "@/components/atoms/button"
import { Badge } from "@/components/atoms/badge"
import { DirectorySectionHeader } from "@/components/molecules/directory/SectionHeader"
import DirectoryProductList from "@/components/organisms/directory/DirectoryProductList"
import {
  partitionFeaturedProducts,
  resolveSponsoredPlacement,
} from "@/lib/directory/placements"
import { BROWSE_PATH } from "@/lib/routes"

interface FeaturedListItem {
  id: string
  slug: string
  name: string
  logo: string
  tagline: string
  badges?: string[]
  analytics?: { upvotes?: number | null } | null
  category?: { name?: string | null } | null
  placementLabel?: string
  isSponsored: boolean
  metaLabel?: string
}

const toListItem = (entry: FeaturedProduct): FeaturedListItem => {
  const { product } = entry
  const activeBadges = (product.ProductBadge ?? []).filter((badge) => {
    if (!badge.expiresAt) return true
    return new Date(badge.expiresAt).getTime() > Date.now()
  })

  const placement = resolveSponsoredPlacement(entry, "featured")

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    logo: product.logo,
    tagline: product.tagline,
    badges: activeBadges.map((badge) => badge.badge),
    analytics: product.analytics ?? null,
    category: product.category ?? undefined,
    isSponsored: placement.isSponsored,
    placementLabel:
      placement.origin === "schedule"
        ? "Scheduled placement"
        : placement.origin === "plan"
          ? "Plan placement"
          : placement.origin === "entitlement"
            ? "Reward placement"
            : undefined,
    metaLabel:
      placement.origin === "schedule"
        ? "Scheduled placement"
        : placement.origin === "plan"
          ? "Plan placement"
          : placement.origin === "entitlement"
            ? "Reward placement"
            : undefined,
  }
}

function SponsoredMeta({ label }: { label?: string }) {
  if (!label) return null
  return (
    <Badge
      variant="outline"
      className="rounded-full border-sky-200 bg-sky-50 px-3 py-0.5 text-xs font-semibold text-sky-800 shadow-sm"
    >
      {label}
    </Badge>
  )
}

export function FeaturedHighlights({
  products,
}: {
  products: FeaturedProduct[]
}) {
  if (!products || products.length === 0) {
    return null
  }

  const { sponsored, organic } = partitionFeaturedProducts(products)
  const sponsoredItems = sponsored.map(toListItem)
  const organicItems = organic.map(toListItem)

  return (
    <section className="rounded-3xl border border-border bg-white p-6 shadow-sm md:p-8">
      <DirectorySectionHeader
        kicker="Featured showcase"
        title="Marquee placements that keep your launch in view"
        description="Featured cards combine sponsored campaigns with editorial standouts. Sponsored spotlights lead the row, followed by organic highlights powered by community momentum."
        action={
          <Button asChild variant="ghost" size="sm" className="hover:bg-muted/70">
            <Link href={`${BROWSE_PATH}?badge=featured`}>
              See every featured product
            </Link>
          </Button>
        }
      />

      <div className="mt-8 space-y-10">
        {sponsoredItems.length > 0 ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base font-semibold text-foreground">
                Sponsored featured spotlights
              </h3>
              <SponsoredMeta label="Sponsored" />
            </div>
            <DirectoryProductList
              items={sponsoredItems}
              columns="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
              metaConfig={{
                type: "badge",
                badgeClassName:
                  "border-sky-200 bg-sky-50 text-sky-800 shadow-sm",
              }}
            />
          </div>
        ) : null}

        {organicItems.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-foreground">
                Featured on merit
              </h3>
            </div>
            <DirectoryProductList
              items={organicItems}
              columns="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
            />
          </div>
        ) : null}
      </div>
    </section>
  )
}

export default FeaturedHighlights

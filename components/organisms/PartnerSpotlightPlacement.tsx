import { getPartnerSpotlightProducts } from "@/actions/public/products/featured"
import { applyCache, TAGS } from "@/lib/cache"
import { PartnerSpotlightRotator } from "@/components/organisms/PartnerSpotlightRotator"

interface PartnerSpotlightPlacementProps {
  limit?: number
  className?: string
}

async function getCachedPartnerSpotlightProducts(limit: number) {
  "use cache"
  applyCache(
    [
      "partner-spotlight:product:v1",
      TAGS.products,
      TAGS.placement("partnerSpotlight"),
      TAGS.planFeature("partnerSpotlight"),
    ],
    600,
  )

  return getPartnerSpotlightProducts(limit)
}

export async function PartnerSpotlightPlacement({
  limit = 100,
  className,
}: PartnerSpotlightPlacementProps) {
  const products = await getCachedPartnerSpotlightProducts(limit)

  if (!products.length) {
    return null
  }

  return <PartnerSpotlightRotator products={products} className={className} />
}

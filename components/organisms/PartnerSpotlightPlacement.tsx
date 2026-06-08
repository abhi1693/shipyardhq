import { getPartnerSpotlightProducts } from "@/actions/public/products/featured"
import { cached, TAGS } from "@/lib/cache"
import { PartnerSpotlightRotator } from "@/components/organisms/PartnerSpotlightRotator"

interface PartnerSpotlightPlacementProps {
  limit?: number
  className?: string
}

const getCachedPartnerSpotlightProducts = cached(
  async (limit: number) => getPartnerSpotlightProducts(limit),
  "partner-spotlight:product:v1",
  {
    ttl: 600,
    tags: () => [
      TAGS.products,
      TAGS.placement("partnerSpotlight"),
      TAGS.planFeature("partnerSpotlight"),
    ],
    keyParts: ([limit]) => [`limit:${limit ?? 100}`],
  },
)

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

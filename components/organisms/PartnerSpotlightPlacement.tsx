import { getPartnerSpotlightProducts } from "@/actions/public/products/featured"
import { PartnerSpotlightRotator } from "@/components/organisms/PartnerSpotlightRotator"

interface PartnerSpotlightPlacementProps {
  limit?: number
  className?: string
}

export async function PartnerSpotlightPlacement({
  limit = 100,
  className,
}: PartnerSpotlightPlacementProps) {
  const products = await getPartnerSpotlightProducts(limit)

  if (!products.length) {
    return null
  }

  return <PartnerSpotlightRotator products={products} className={className} />
}

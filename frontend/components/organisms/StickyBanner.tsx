import { getStickyBannerProductsApiV1PublicProductsStickyBannerGet } from "@/lib/generated/fastapi/public-homepage"
import { cached, TAGS } from "@/lib/cache"
import { StickyBannerRotator } from "@/components/organisms/StickyBannerRotator"

interface StickyBannerProps {
  limit?: number
  className?: string
}

const getCachedStickyBannerProducts = cached(
  async (limit: number) => {
    const response = await getStickyBannerProductsApiV1PublicProductsStickyBannerGet(
      {
        limit,
      },
    )
    return response.data
  },
  "sticky-banner:product:v3",
  {
    ttl: 600,
    tags: () => [
      TAGS.products,
      TAGS.placement("stickyBanner"),
      TAGS.planFeature("stickyBanner"),
    ],
    keyParts: ([limit]) => [`limit:${limit ?? 100}`],
  },
)

export async function StickyBanner({
  limit = 100,
  className,
}: StickyBannerProps) {
  const products = await getCachedStickyBannerProducts(limit)

  if (!products.length) {
    return null
  }

  return <StickyBannerRotator products={products} className={className} />
}

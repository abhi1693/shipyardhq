import { getStickyBannerProducts } from "@/actions/public/products/featured"
import { StickyBannerCarousel } from "@/components/organisms/StickyBannerCarousel"
import { cn } from "@/lib/utils"

interface HeroStickyBannerProps {
  limit?: number
  wrapperClassName?: string
  innerClassName?: string
}

export async function HeroStickyBanner({
  limit = 12,
  wrapperClassName,
  innerClassName,
}: HeroStickyBannerProps) {
  const products = await getStickyBannerProducts(limit)
  if (!products.length) {
    return null
  }

  return (
    <div
      className={cn("mx-auto w-full px-4 sm:px-6 md:px-8", wrapperClassName)}
    >
      <StickyBannerCarousel
        products={products}
        className={cn(
          "mx-auto w-full max-w-[84rem] rounded-2xl",
          innerClassName,
        )}
      />
    </div>
  )
}

export default HeroStickyBanner

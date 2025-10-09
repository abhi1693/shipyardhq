import { StickyBannerRegion } from "@/components/layout/sticky-banner-context"
import { cn } from "@/lib/utils"

interface HeroStickyBannerProps {
  priority?: number
  wrapperClassName?: string
  innerClassName?: string
}

export function HeroStickyBanner({
  priority = 10,
  wrapperClassName,
  innerClassName,
}: HeroStickyBannerProps) {
  return (
    <div
      className={cn("mx-auto w-full px-4 sm:px-6 md:px-8", wrapperClassName)}
    >
      <StickyBannerRegion
        priority={priority}
        className={cn(
          "mx-auto w-full max-w-[84rem] rounded-2xl",
          innerClassName,
        )}
      />
    </div>
  )
}

export default HeroStickyBanner

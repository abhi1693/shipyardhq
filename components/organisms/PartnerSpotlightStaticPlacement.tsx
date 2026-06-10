import { Handshake } from "lucide-react"

import { getPartnerSpotlightProducts } from "@/actions/public/products/featured"
import { SquareImage } from "@/components/molecules/SquareImage"
import { SponsorPromo } from "@/components/molecules/SponsorPromo"
import { cached, TAGS } from "@/lib/cache"
import { isOptimizedImageSrc } from "@/lib/images/sources"
import { cn } from "@/lib/utils"

interface PartnerSpotlightStaticPlacementProps {
  className?: string
}

const getCachedPartnerSpotlightProduct = cached(
  async () => getPartnerSpotlightProducts(1),
  "partner-spotlight:static-product:v1",
  {
    ttl: 600,
    tags: () => [
      TAGS.products,
      TAGS.placement("partnerSpotlight"),
      TAGS.planFeature("partnerSpotlight"),
    ],
  },
)

export async function PartnerSpotlightStaticPlacement({
  className,
}: PartnerSpotlightStaticPlacementProps) {
  const [product] = await getCachedPartnerSpotlightProduct()
  if (!product) return null

  const tagline = product.tagline?.trim()
  const logoSrc = isOptimizedImageSrc(product.logo) ? product.logo : null
  const logoFallback = product.name.slice(0, 1).toUpperCase()

  return (
    <div className={cn("w-full", className)}>
      <div className="w-full overflow-hidden rounded-lg border border-[#d8e2ef] bg-white shadow-[0_18px_46px_-34px_rgba(11,28,48,0.32)]">
        <a
          href={`/r/sponsored/${product.slug}`}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="grid w-full gap-4 px-5 py-4 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0051d5]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white sm:grid-cols-[auto_1fr_auto] sm:items-center"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="relative inline-flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#e2e8f0] bg-[#f8fafc]">
              <span className="absolute right-1 top-1 inline-flex size-4 items-center justify-center rounded-full bg-[#c0ff00] text-black">
                <Handshake className="size-2.5" aria-hidden />
              </span>
              <span className="flex h-full w-full items-center justify-center overflow-hidden p-1.5">
                {logoSrc ? (
                  <SquareImage
                    src={logoSrc}
                    alt={product.name}
                    size={48}
                    className="h-full w-full object-contain"
                    loading="lazy"
                    fetchPriority="low"
                    placeholder="empty"
                  />
                ) : (
                  <span className="text-sm font-semibold text-[#0051d5]">
                    {logoFallback}
                  </span>
                )}
              </span>
            </span>
          </span>
          <span className="min-w-0 space-y-1.5">
            <span className="block text-[11px] font-semibold uppercase leading-4 tracking-[0.16em] text-[#0051d5]">
              Partner Spotlight
            </span>
            <span className="block truncate text-base font-semibold leading-6 text-black">
              {product.name}
            </span>
            <span className="block text-sm leading-5 text-[#43474c]">
              {tagline ??
                "Featured partner trusted by builders exploring Shipyard."}
            </span>
          </span>
          <span className="inline-flex h-9 w-fit items-center rounded-lg bg-black px-4 text-sm font-semibold text-white">
            View partner
          </span>
        </a>
      </div>

      <SponsorPromo className="mt-3" />
    </div>
  )
}

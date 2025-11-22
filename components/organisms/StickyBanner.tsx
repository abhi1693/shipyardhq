import { Banknote } from "lucide-react"

import { getStickyBannerProducts } from "@/actions/public/products/featured"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/atoms/badge"
import { SquareImage } from "@/components/molecules/SquareImage"
import { SponsorPromo } from "@/components/molecules/SponsorPromo"
import { ProductClickLink } from "@/components/molecules/ProductClickLink"
import { cached, TAGS } from "@/lib/cache"

interface StickyBannerProps {
  limit?: number
  className?: string
}

const getCachedStickyBannerProduct = cached(
  async (limit: number) => getStickyBannerProducts(limit),
  "sticky-banner:product",
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
  const product = await getCachedStickyBannerProduct(limit)

  if (!product) {
    return null
  }

  const tagline = product.tagline?.trim()
  const hasRevenue =
    typeof product.latestRevenueCents === "number" &&
    product.latestRevenueCents > 0
  const revenueLabel = hasRevenue
    ? new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: product.revenueCurrencyCode ?? "USD",
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(product.latestRevenueCents / 100)
    : null

  return (
    <div className={cn("w-full", className)}>
      <div className="w-full rounded-2xl border-2 border-[#F59E0B]/45 bg-[#FFF7ED] px-6 py-4 shadow-[4px_12px_28px_-20px_rgba(226,120,34,0.26)] transition-shadow duration-150 hover:shadow-[14px_30px_60px_-34px_rgba(226,120,34,0.45)]">
        <ProductClickLink
          productId={product.id}
          productSlug={product.slug}
          className="flex w-full flex-wrap items-center justify-between gap-4 text-left transition-shadow duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFF7ED]"
          formClassName="w-full"
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#FEF3C7] bg-white shadow-[0_16px_32px_-28px_rgba(7,68,134,0.2)]">
              <SquareImage
                src={product.logo}
                alt={product.name}
                size={44}
                eager
                className="h-full w-full object-cover"
              />
            </span>
            <div className="min-w-0 space-y-1">
              <span className="block truncate text-sm font-semibold text-[#422006]">
                {product.name}
              </span>
              {tagline ? (
                <span className="block text-xs text-[#854d0e]">{tagline}</span>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {revenueLabel ? (
              <span
                className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-white/80 px-3 py-1 text-[11px] font-semibold text-[#0c4a6e] shadow-sm"
                title="Verified revenue"
              >
                <Banknote className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="sr-only">Revenue</span>
                <span className="whitespace-nowrap">{revenueLabel}</span>
              </span>
            ) : null}
            <Badge
              variant="outline"
              className="shrink-0 rounded-full border-[#F97316]/40 bg-[#FDEADF] px-3 py-1 text-[11px] font-semibold text-[#A33105]"
            >
              Sponsored
            </Badge>
          </div>
        </ProductClickLink>
      </div>

      <SponsorPromo className="mt-3" />
    </div>
  )
}

import Image from "next/image"
import Link from "next/link"

import { getStickyBannerProducts } from "@/actions/public/products/featured"
import { productPath } from "@/lib/routes"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/atoms/badge"
import { SponsorPromo } from "@/components/molecules/SponsorPromo"

interface StickyBannerProps {
  limit?: number
  className?: string
}

export async function StickyBanner({
  limit = 100,
  className,
}: StickyBannerProps) {
  const product = await getStickyBannerProducts(limit)

  if (!product) {
    return null
  }

  const tagline = product.tagline?.trim()

  return (
    <div className={cn("w-full", className)}>
      <div className="w-full rounded-2xl border-2 border-[#F59E0B]/45 bg-[#FFF7ED] px-6 py-4 shadow-[4px_12px_28px_-20px_rgba(226,120,34,0.26)] transition-shadow duration-150 hover:shadow-[14px_30px_60px_-34px_rgba(226,120,34,0.45)]">
        <Link
          href={productPath(product.slug)}
          className="flex w-full flex-wrap items-center justify-between gap-4 text-left transition-shadow duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFF7ED]"
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#FEF3C7] bg-white shadow-[0_16px_32px_-28px_rgba(7,68,134,0.2)]">
              <Image
                src={product.logo}
                alt={product.name}
                width={44}
                height={44}
                priority
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
          <Badge
            variant="outline"
            className="shrink-0 rounded-full border-[#F97316]/40 bg-[#FDEADF] px-3 py-1 text-[11px] font-semibold text-[#A33105]"
          >
            Sponsored
          </Badge>
        </Link>
      </div>

      <SponsorPromo className="mt-3" />
    </div>
  )
}

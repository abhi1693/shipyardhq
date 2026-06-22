import { Handshake } from "lucide-react"

import { Button } from "@/components/atoms/button"
import { SquareImage } from "@/components/molecules/SquareImage"
import { isOptimizedImageSrc } from "@/lib/images/sources"

export type PartnerSpotlightProduct = {
  slug: string
  name: string
  logo: string
  tagline: string | null
}

export function PartnerSpotlight({
  product,
}: {
  product: PartnerSpotlightProduct | null
}) {
  if (!product) return null

  const tagline = product.tagline?.trim()
  const href = `/r/sponsored/${product.slug}`
  const logoSrc = isOptimizedImageSrc(product.logo) ? product.logo : null
  const logoFallback = product.name.slice(0, 1).toUpperCase()

  return (
    <div className="fixed bottom-0 left-0 z-[60] w-full border-t border-white/10 bg-[#213145] text-white shadow-2xl">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-3 px-4 sm:gap-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-4 sm:gap-6">
          <div className="flex shrink-0 items-center gap-2 sm:border-r sm:border-white/20 sm:pr-6">
            <Handshake className="size-5 text-[#C0FF00]" aria-hidden />
            <span className="hidden text-[11px] font-bold uppercase tracking-[0.18em] sm:inline">
              Partner Spotlight
            </span>
          </div>
          <span className="hidden h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/95 p-1 sm:flex">
            {logoSrc ? (
              <SquareImage
                src={logoSrc}
                alt={product.name}
                size={36}
                loading="lazy"
                fetchPriority="low"
                className="h-full w-full object-contain"
              />
            ) : (
              <span className="text-sm font-semibold text-[#213145]">
                {logoFallback}
              </span>
            )}
          </span>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="min-w-0 truncate text-sm font-semibold text-white/90 hover:text-white hover:underline"
          >
            <span>{product.name}</span>
            {tagline ? (
              <span className="hidden font-normal text-white/70 lg:inline">
                {": "}
                {tagline}
              </span>
            ) : null}
          </a>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <Button
            asChild
            className="h-9 rounded-full border-0 bg-[#C0FF00] px-4 text-xs font-bold uppercase tracking-[0.05em] text-black hover:bg-[#C0FF00]/90 sm:px-6"
          >
            <a href={href} target="_blank" rel="noopener noreferrer">
              View Partner
            </a>
          </Button>
        </div>
      </div>
    </div>
  )
}

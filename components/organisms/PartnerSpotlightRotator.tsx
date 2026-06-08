"use client"

import { useEffect, useState } from "react"

import { ArrowUpRight, Handshake } from "lucide-react"

import { SquareImage } from "@/components/molecules/SquareImage"
import { SponsorPromo } from "@/components/molecules/SponsorPromo"
import { isOptimizedImageSrc } from "@/lib/images/sources"
import { cn } from "@/lib/utils"

const ROTATION_INTERVAL_MS = 15000

type PartnerSpotlightPlacementProduct = {
  id: string
  slug: string
  name: string
  logo: string
  tagline: string | null
}

interface PartnerSpotlightRotatorProps {
  products: PartnerSpotlightPlacementProduct[]
  className?: string
}

export function PartnerSpotlightRotator({
  products,
  className,
}: PartnerSpotlightRotatorProps) {
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    if (products.length <= 1) return

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % products.length)
    }, ROTATION_INTERVAL_MS)

    return () => {
      window.clearInterval(timer)
    }
  }, [products.length])

  const safeIndex = products.length > 0 ? activeIndex % products.length : 0
  const product = products[safeIndex] ?? products[0]

  if (!product) {
    return null
  }

  const tagline = product.tagline?.trim()
  const logoSrc = isOptimizedImageSrc(product.logo) ? product.logo : null
  const logoFallback = product.name.slice(0, 1).toUpperCase()

  return (
    <div className={cn("w-full", className)}>
      <div
        key={product.id}
        className="animate-fade-in motion-reduce:animate-none"
      >
        <div className="w-full overflow-hidden rounded-lg border border-[#D8E2EF] bg-white shadow-[0_18px_46px_-34px_rgba(11,28,48,0.32)] transition-shadow duration-150 hover:shadow-[0_26px_60px_-38px_rgba(11,28,48,0.42)]">
          <a
            href={`/r/sponsored/${product.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="grid w-full gap-4 px-5 py-4 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0051D5]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white sm:grid-cols-[auto_1fr_auto] sm:items-center"
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className="relative inline-flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#E2E8F0] bg-[#F8FAFC]">
                <span className="absolute right-1 top-1 inline-flex size-4 items-center justify-center rounded-full bg-[#C0FF00] text-black">
                  <Handshake className="size-2.5" aria-hidden />
                </span>
                <span className="flex h-full w-full items-center justify-center overflow-hidden p-1.5">
                  {logoSrc ? (
                    <SquareImage
                      src={logoSrc}
                      alt={product.name}
                      size={48}
                      eager
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <span className="text-sm font-semibold text-[#0051D5]">
                      {logoFallback}
                    </span>
                  )}
                </span>
              </span>
            </span>
            <span className="min-w-0 space-y-1.5">
              <span className="block text-[11px] font-semibold uppercase leading-4 tracking-[0.16em] text-[#0051D5]">
                Partner Spotlight
              </span>
              <span className="block truncate text-base font-semibold leading-6 text-black">
                {product.name}
              </span>
              <span className="block text-sm leading-5 text-[#43474C]">
                {tagline ??
                  "Featured partner trusted by builders exploring Shipyard."}
              </span>
            </span>
            <span className="inline-flex h-9 w-fit items-center gap-2 rounded-lg bg-black px-4 text-sm font-semibold text-white transition-colors hover:bg-black/90">
              View partner
              <ArrowUpRight className="size-4" aria-hidden />
            </span>
          </a>
        </div>
      </div>

      <SponsorPromo className="mt-3" />
    </div>
  )
}

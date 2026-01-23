"use client"

import { useEffect, useState } from "react"
import { Banknote } from "lucide-react"

import { Badge } from "@/components/atoms/badge"
import { SquareImage } from "@/components/molecules/SquareImage"
import { SponsorPromo } from "@/components/molecules/SponsorPromo"
import { VERIFIED_REVENUE_RANKING_MULTIPLIER } from "@/lib/ranking/verifiedRevenue"
import { cn } from "@/lib/utils"

const ROTATION_INTERVAL_MS = 15000

type StickyBannerProduct = {
  id: string
  slug: string
  name: string
  logo: string
  tagline: string | null
  latestRevenueCents: number | null
  revenueCurrencyCode: string | null
}

interface StickyBannerRotatorProps {
  products: StickyBannerProduct[]
  className?: string
}

export function StickyBannerRotator({
  products,
  className,
}: StickyBannerRotatorProps) {
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

  const latestRevenueCents = product.latestRevenueCents
  const tagline = product.tagline?.trim()
  const hasRevenue =
    typeof latestRevenueCents === "number" && latestRevenueCents > 0
  const revenueLabel = hasRevenue
    ? new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: product.revenueCurrencyCode ?? "USD",
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(latestRevenueCents / 100)
    : null

  return (
    <div className={cn("w-full", className)}>
      <div
        key={product.id}
        className="animate-fade-in motion-reduce:animate-none"
      >
        <div className="w-full rounded-2xl border-2 border-[#F59E0B]/45 bg-[#FFF7ED] px-6 py-4 shadow-[4px_12px_28px_-20px_rgba(226,120,34,0.26)] transition-shadow duration-150 hover:shadow-[14px_30px_60px_-34px_rgba(226,120,34,0.45)]">
          <a
            href={`/r/sticky-banner/${product.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full flex-wrap items-center justify-between gap-4 text-left transition-shadow duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFF7ED]"
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
                  <span className="block text-xs text-[#854d0e]">
                    {tagline}
                  </span>
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {revenueLabel ? (
                <span
                  className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-white/80 px-3 py-1 text-[11px] font-semibold text-[#0c4a6e] shadow-sm"
                  title={`Verified revenue (boosts click-based ranking by ${VERIFIED_REVENUE_RANKING_MULTIPLIER.toFixed(
                    1,
                  )}×). Products without verified revenue are ranked lower by default.`}
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
          </a>
        </div>
      </div>

      <SponsorPromo className="mt-3" />
    </div>
  )
}

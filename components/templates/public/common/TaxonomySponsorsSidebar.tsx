"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Rocket, Sparkles } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/atoms/avatar"
import type { TaxonomySponsorProduct } from "@/components/templates/public/common/TaxonomyDetailPage"

const SPONSOR_DISPLAY_LIMIT = 4
const SPONSOR_ROTATION_MS = 30_000

function sponsoredRedirectPath(slug: string) {
  return `/r/sponsored/${encodeURIComponent(slug)}`
}

function hashString(value: string) {
  let hash = 0

  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i)
    hash |= 0
  }

  return Math.abs(hash)
}

function shuffleSponsors(products: TaxonomySponsorProduct[], bucket: number) {
  return [...products]
    .sort((a, b) => {
      const aRank = hashString(`${bucket}:${a.slug}`)
      const bRank = hashString(`${bucket}:${b.slug}`)
      if (aRank !== bRank) return aRank - bRank
      return a.name.localeCompare(b.name)
    })
    .slice(0, SPONSOR_DISPLAY_LIMIT)
}

export function TaxonomySponsorsSidebar({
  products,
}: {
  products: TaxonomySponsorProduct[]
}) {
  const normalizedProducts = useMemo(
    () => products.filter((product) => product?.slug),
    [products],
  )
  const [visibleProducts, setVisibleProducts] = useState(() =>
    normalizedProducts.slice(0, SPONSOR_DISPLAY_LIMIT),
  )

  useEffect(() => {
    const updateVisibleProducts = () => {
      const bucket = Math.floor(Date.now() / SPONSOR_ROTATION_MS)
      setVisibleProducts(shuffleSponsors(normalizedProducts, bucket))
    }

    updateVisibleProducts()
    const intervalId = window.setInterval(
      updateVisibleProducts,
      SPONSOR_ROTATION_MS,
    )

    return () => window.clearInterval(intervalId)
  }, [normalizedProducts])

  if (!visibleProducts.length) return null

  return (
    <section className="rounded-lg border border-[#e2e8f0] bg-white p-6">
      <div className="mb-5 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-[#b45309]" aria-hidden />
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-black">
          Sponsors
        </h2>
      </div>
      <div className="space-y-4">
        {visibleProducts.map((product) => (
          <Link
            key={product.slug}
            href={sponsoredRedirectPath(product.slug)}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="flex items-center gap-3 border-b border-[#e2e8f0] pb-4 last:border-b-0 last:pb-0"
          >
            <SponsorLogo product={product} />
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-black">
                {product.name}
              </h3>
              {product.tagline ? (
                <p className="line-clamp-1 text-xs text-[#43474c]">
                  {product.tagline}
                </p>
              ) : null}
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

function SponsorLogo({ product }: { product: TaxonomySponsorProduct }) {
  return (
    <Avatar className="h-12 w-12 shrink-0 rounded-lg bg-black text-white">
      {product.logo ? (
        <AvatarImage src={product.logo} alt={`${product.name} logo`} />
      ) : null}
      <AvatarFallback className="rounded-lg bg-black text-sm font-semibold uppercase text-white">
        {getInitials(product.name)}
      </AvatarFallback>
    </Avatar>
  )
}

function getInitials(name: string) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("")
    .slice(0, 2)

  return initials || <Rocket className="h-5 w-5" aria-hidden />
}

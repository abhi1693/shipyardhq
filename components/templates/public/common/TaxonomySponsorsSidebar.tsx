import Link from "next/link"
import { Rocket, Sparkles } from "lucide-react"

import { ProductLogoImage } from "@/components/atoms/product-logo-image"
import type { TaxonomySponsorProduct } from "@/components/templates/public/common/TaxonomyDetailPage"

const SPONSOR_DISPLAY_LIMIT = 4

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
  const normalizedProducts = products.filter((product) => product?.slug)
  const visibleProducts = shuffleSponsors(normalizedProducts, 0)

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
  if (product.logo) {
    return (
      <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-black text-white">
        <ProductLogoImage
          src={product.logo}
          name={product.name}
          fill
          sizes="48px"
          className="object-cover"
          loading="lazy"
          fetchPriority="low"
          placeholder="empty"
        />
      </span>
    )
  }

  return (
    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-black text-sm font-semibold uppercase text-white">
      {getInitials(product.name)}
    </span>
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

import Link from "next/link"
import { Sparkles } from "lucide-react"

import { getPartnerSpotlightProducts } from "@/actions/public/products/featured"
import { Card, CardContent } from "@/components/atoms/card"
import { Image } from "@/components/atoms/image"
import { isOptimizedImageSrc } from "@/lib/images/sources"

export function PromotedShips({
  products,
}: {
  products: Awaited<ReturnType<typeof getPartnerSpotlightProducts>>
}) {
  const product = products[0]

  if (!product) return null

  const logoSrc = product?.logo ?? null
  const logoFallback = product.name.slice(0, 1).toUpperCase()
  const tagline = product.tagline?.trim()

  return (
    <Card className="rounded-xl border-[#E2E8F0] bg-white p-0 shadow-none">
      <CardContent className="p-6">
        <h2 className="mb-6 flex items-center gap-2 text-[12px] font-semibold uppercase leading-4 tracking-[0.05em] text-[#43474c]">
          <Sparkles
            className="size-[18px] text-[#b45309]"
            fill="currentColor"
            aria-hidden
          />
          Partner Spotlight
        </h2>
        <Link
          href={`/r/sponsored/${product.slug}`}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="group block"
        >
          <div className="mb-3 flex h-40 w-full items-center justify-center overflow-hidden rounded-lg bg-[#061d31]">
            {isOptimizedImageSrc(logoSrc) ? (
              <Image
                src={logoSrc}
                alt={`${product.name} logo`}
                width={64}
                height={64}
                sizes="64px"
                className="size-16 object-contain transition-transform group-hover:scale-[1.03]"
              />
            ) : (
              <span className="text-3xl font-semibold text-white">
                {logoFallback}
              </span>
            )}
          </div>
          <h3 className="mb-1 text-[18px] font-semibold leading-6 text-black underline-offset-4 group-hover:underline">
            {product.name}
          </h3>
          {tagline ? (
            <p className="line-clamp-2 text-[14px] leading-5 text-[#43474c]">
              {tagline}
            </p>
          ) : null}
        </Link>
      </CardContent>
    </Card>
  )
}

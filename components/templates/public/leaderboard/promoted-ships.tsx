import Link from "next/link"
import { Megaphone, Sparkles } from "lucide-react"

import { getSponsoredProducts } from "@/actions/public/products/featured"
import { Card, CardContent } from "@/components/atoms/card"
import { Image } from "@/components/atoms/image"
import { PRICING_PATH } from "@/lib/routes"
import { isOptimizedImageSrc } from "@/lib/images/sources"

export function PromotedShips({
  placements,
}: {
  placements: Awaited<ReturnType<typeof getSponsoredProducts>>
}) {
  const placement = placements[0]
  const product = placement?.product
  const bannerSrc = product?.bannerImage ?? null
  const logoSrc = product?.logo ?? null

  return (
    <Card className="rounded-xl border-[#E2E8F0] bg-white p-0 shadow-none">
      <CardContent className="p-6">
        <h2 className="mb-6 flex items-center gap-2 text-[12px] font-semibold uppercase leading-4 tracking-[0.05em] text-[#43474c]">
          <Sparkles
            className="size-[18px] text-[#b45309]"
            fill="currentColor"
            aria-hidden
          />
          Promoted Ships
        </h2>
        {product ? (
          <Link
            href={`/r/sponsored/${product.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group block"
          >
            <div className="mb-3 flex h-40 w-full items-center justify-center overflow-hidden rounded-lg bg-[#061d31]">
              {isOptimizedImageSrc(bannerSrc) ? (
                <Image
                  src={bannerSrc}
                  alt={`${product.name} banner`}
                  width={360}
                  height={160}
                  sizes="(min-width: 1024px) 360px, 100vw"
                  className="h-full w-full object-cover transition-transform group-hover:scale-[1.03]"
                />
              ) : isOptimizedImageSrc(logoSrc) ? (
                <Image
                  src={logoSrc}
                  alt={`${product.name} logo`}
                  width={64}
                  height={64}
                  sizes="64px"
                  className="size-16 object-contain"
                />
              ) : (
                <Megaphone className="size-12 text-white/70" aria-hidden />
              )}
            </div>
            <h3 className="mb-1 text-[18px] font-semibold leading-6 text-black underline-offset-4 group-hover:underline">
              {product.name}
            </h3>
            <p className="line-clamp-2 text-[14px] leading-5 text-[#43474c]">
              {product.tagline}
            </p>
          </Link>
        ) : (
          <Link
            href={PRICING_PATH}
            className="group block rounded-lg border-2 border-dashed border-[#E2E8F0] p-6 text-center transition-colors hover:bg-[#F8FAFC]"
          >
            <Megaphone
              className="mx-auto mb-2 size-10 text-[#5f6368] transition-transform group-hover:scale-110"
              aria-hidden
            />
            <div className="text-[12px] font-semibold uppercase tracking-[0.05em] text-black">
              Advertise here
            </div>
            <p className="mt-1 text-[11px] leading-[14px] text-[#43474c]">
              Get your product in front of builders monthly.
            </p>
          </Link>
        )}
        {product ? (
          <Link
            href={PRICING_PATH}
            className="mt-6 block rounded-lg border-2 border-dashed border-[#E2E8F0] p-6 text-center transition-colors hover:bg-[#F8FAFC]"
          >
            <Megaphone className="mx-auto mb-2 size-10 text-[#5f6368]" />
            <div className="text-[12px] font-semibold uppercase tracking-[0.05em] text-black">
              Advertise here
            </div>
            <p className="mt-1 text-[11px] leading-[14px] text-[#43474c]">
              Get your product in front of builders monthly.
            </p>
          </Link>
        ) : null}
      </CardContent>
    </Card>
  )
}

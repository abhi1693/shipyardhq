"use client"

import { useEffect, useMemo, useState, useId } from "react"
import Image from "next/image"
import Link from "next/link"

import { PRICING_PATH, productPath } from "@/lib/routes"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/atoms/badge"

export type StickyBannerProduct = {
  id: string
  slug: string
  name: string
  logo: string
  tagline?: string | null
  category?: { name?: string | null } | null
  analytics?: { upvotes?: number | null } | null
  user?: { firstName?: string | null; lastName?: string | null } | null
  organization?: { name?: string | null } | null
}

interface StickyBannerCarouselProps {
  products: StickyBannerProduct[]
  className?: string
}

export function StickyBannerCarousel({
  products,
  className,
}: StickyBannerCarouselProps) {
  const items = useMemo(
    () =>
      (products ?? []).filter(
        (product): product is StickyBannerProduct & { slug: string } =>
          Boolean(product?.slug && product?.name && product?.logo),
      ),
    [products],
  )

  const total = items.length
  const [index, setIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const carouselId = useId()
  const animationId = useMemo(() => {
    const sanitized = carouselId.replace(/[:]/g, "-")
    return `stickyBannerSlide-${sanitized}`
  }, [carouselId])

  useEffect(() => {
    if (total <= 1 || isPaused) return

    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % total)
    }, 5000)

    return () => clearInterval(timer)
  }, [total, isPaused])

  if (total === 0) {
    return null
  }

  const safeIndex = total > 0 ? Math.min(index, total - 1) : 0
  const current = items[safeIndex] ?? items[0]
  const tagline = current.tagline?.trim()

  const handlePause = (next: boolean) => {
    if (total <= 1) return
    setIsPaused(next)
  }

  return (
    <div
      className={cn("w-full", className)}
      onMouseEnter={() => handlePause(true)}
      onMouseLeave={() => handlePause(false)}
      onFocusCapture={() => handlePause(true)}
      onBlurCapture={() => handlePause(false)}
    >
      <div className="w-full rounded-[26px] border border-[#E6E0FF] bg-[#F9F6FF] px-6 py-4 shadow-[0_26px_75px_-56px_rgba(79,63,244,0.45)]">
        <Link
          href={productPath(current.slug)}
          className="flex w-full flex-wrap items-center justify-between gap-4 text-left transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_30px_90px_-60px_rgba(79,63,244,0.48)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F3FF4]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F9F6FF]"
          style={{
            animation: `${animationId} 260ms ease`,
            animationFillMode: "both",
          }}
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#E2DEFF] bg-white shadow-[0_16px_32px_-28px_rgba(79,63,244,0.45)]">
              <Image
                src={current.logo}
                alt={current.name}
                width={44}
                height={44}
                priority
                className="h-full w-full object-cover"
              />
            </span>
            <div className="min-w-0 space-y-1">
              <span className="block truncate text-sm font-semibold text-[#1C2333]">
                {current.name}
              </span>
              {tagline ? (
                <span className="block text-xs text-[#5B6175]">{tagline}</span>
              ) : null}
            </div>
          </div>
          <Badge
            variant="outline"
            className="shrink-0 rounded-full border-[#D8CFFF] bg-[#F2EEFF] px-3 py-1 text-[11px] font-semibold text-[#4F3FF4]"
          >
            Sponsored
          </Badge>
        </Link>
      </div>

      <div className="mt-3 text-[11px] text-[#7B81A0]">
        Want to become a sponsor and show your product here?{" "}
        <Link
          href={PRICING_PATH}
          className="font-semibold text-[#4F3FF4] underline-offset-4 hover:underline"
        >
          Advertise
        </Link>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes ${animationId} {
              0% {
                opacity: 0;
                transform: translateY(8px);
              }
              100% {
                opacity: 1;
                transform: translateY(0);
              }
            }
          `,
        }}
      />
    </div>
  )
}

export default StickyBannerCarousel

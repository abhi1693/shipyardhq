"use client"

import { useEffect, useMemo, useState, useId } from "react"
import Image from "next/image"
import Link from "next/link"

import { productPath } from "@/lib/routes"
import { cn } from "@/lib/utils"

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
  const categoryName = current.category?.name?.trim() || null
  const makerName = (() => {
    const orgName = current.organization?.name?.trim()
    if (orgName) return orgName
    const first = current.user?.firstName?.trim()
    const last = current.user?.lastName?.trim()
    const joined = [first, last].filter(Boolean).join(" ")
    return joined || null
  })()
  const upvoteCount =
    typeof current.analytics?.upvotes === "number"
      ? current.analytics.upvotes
      : null
  const upvoteLabel =
    upvoteCount != null ? upvoteCount.toLocaleString() : undefined
  const showCategory = Boolean(categoryName)
  const showMaker = Boolean(makerName)
  const showUpvotes = upvoteCount != null

  const handlePause = (next: boolean) => {
    if (total <= 1) return
    setIsPaused(next)
  }

  return (
    <div
      className={cn("w-full bg-transparent", className)}
      onMouseEnter={() => handlePause(true)}
      onMouseLeave={() => handlePause(false)}
      onFocusCapture={() => handlePause(true)}
      onBlurCapture={() => handlePause(false)}
    >
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
        <Link
          key={current.id}
          href={productPath(current.slug)}
          className={cn(
            "group relative flex w-full items-center justify-between gap-5 overflow-hidden rounded-[20px] border border-[#D6CCFF] bg-gradient-to-r from-[#FBF9FF] via-[#F8FCFF] to-[#FBF9FF] px-5 py-4 text-sm shadow-[0_20px_65px_-50px_rgba(79,63,244,0.45)] transition duration-200 ease-out",
            "hover:-translate-y-0.5 hover:shadow-[0_28px_90px_-55px_rgba(79,63,244,0.48)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F3FF4]/45 focus-visible:ring-offset-3 focus-visible:ring-offset-white",
          )}
          style={{
            animation: `${animationId} 320ms ease`,
            animationFillMode: "both",
          }}
          aria-label={`View ${current.name}`}
        >
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#E0E4F7] bg-white">
              <Image
                src={current.logo}
                alt={current.name}
                width={44}
                height={44}
                priority
                className="h-full w-full object-cover"
              />
            </span>

            <div className="flex min-w-0 flex-col gap-1 text-left">
              <span className="truncate text-sm font-semibold text-[#1C2333]">
                {current.name}
              </span>
              {tagline ? (
                <span className="truncate text-xs font-medium text-[#5B6175]">
                  {tagline}
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 text-xs">
            {showCategory ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-[#D6CCFF] bg-white px-3 py-1 font-semibold uppercase tracking-[0.22em] text-[#2D2A55]">
                {categoryName}
              </span>
            ) : null}
            {showMaker ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-[#D6DFF2] bg-white px-3 py-1 font-semibold text-[#1C2333]">
                <span className="text-[11px] uppercase tracking-[0.2em] text-[#5B6175]">
                  Maker
                </span>
                {makerName}
              </span>
            ) : null}
            {showUpvotes ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#1C2333] px-3 py-1 text-xs font-semibold text-white">
                {upvoteLabel}
                <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-white/70">
                  votes
                </span>
              </span>
            ) : null}
          </div>
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

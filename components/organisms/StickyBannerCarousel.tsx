"use client"

import { useEffect, useMemo, useState } from "react"
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
  const animationId = useMemo(
    () => `stickyBannerSlide-${Math.random().toString(36).slice(2)}`,
    [],
  )

  useEffect(() => {
    setIndex(0)
    setIsPaused(false)
  }, [total])

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

  const current = items[index]
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
  const showUpvotes = Boolean(upvoteLabel)

  const handlePause = (next: boolean) => {
    if (total <= 1) return
    setIsPaused(next)
  }

  return (
    <div
      className={cn("w-full bg-white", className)}
      onMouseEnter={() => handlePause(true)}
      onMouseLeave={() => handlePause(false)}
      onFocusCapture={() => handlePause(true)}
      onBlurCapture={() => handlePause(false)}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col px-4 sm:px-6">
        <Link
          key={current.id}
          href={productPath(current.slug)}
          className="group relative flex w-full items-center gap-4 overflow-hidden rounded-xl border border-border/70 bg-white px-4 py-3 text-sm shadow-sm transition hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-1)/0.45]"
          style={{
            animation: `${animationId} 320ms ease`,
            animationFillMode: "both",
          }}
          aria-label={`View ${current.name}`}
        >
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/60 bg-muted/20">
            <Image
              src={current.logo}
              alt={current.name}
              width={40}
              height={40}
              className="h-full w-full object-cover"
            />
          </span>

          <div
            className="flex min-w-0 flex-1 items-center gap-2"
            role="status"
            aria-live="polite"
          >
            <span className="truncate font-semibold text-foreground">
              {current.name}
            </span>
            {tagline ? (
              <span className="hidden text-muted-foreground/60 sm:inline">
                •
              </span>
            ) : null}
            {tagline ? (
              <span className="hidden truncate text-muted-foreground sm:inline">
                {tagline}
              </span>
            ) : null}
          </div>

          <div className="hidden items-center gap-2 lg:flex">
            {showCategory ? (
              <span className="inline-flex items-center gap-2 truncate rounded-full border border-border/60 bg-muted/20 px-2.5 py-1 text-xs text-muted-foreground/80">
                <span className="text-[10px] font-semibold uppercase tracking-[0.26em] text-muted-foreground/70">
                  Category
                </span>
                <span className="font-semibold text-foreground">
                  {categoryName}
                </span>
              </span>
            ) : null}
            {showMaker ? (
              <span className="inline-flex items-center gap-2 truncate rounded-full border border-border/60 bg-muted/20 px-2.5 py-1 text-xs text-muted-foreground/80">
                <span className="text-[10px] font-semibold uppercase tracking-[0.26em] text-muted-foreground/70">
                  Maker
                </span>
                <span className="font-semibold text-foreground">
                  {makerName}
                </span>
              </span>
            ) : null}
            {showUpvotes ? (
              <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-border/60 bg-muted/20 px-2.5 py-1 text-xs text-muted-foreground/80">
                <span className="text-[10px] font-semibold uppercase tracking-[0.26em] text-muted-foreground/70">
                  Upvotes
                </span>
                <span className="font-semibold text-foreground">
                  {upvoteLabel}
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

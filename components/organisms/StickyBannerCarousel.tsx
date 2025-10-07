"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"

import { productPath } from "@/lib/routes"
import { cn } from "@/lib/utils"

type StickyBannerProduct = {
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
  const hasMeta = showCategory || showMaker || showUpvotes

  const handlePause = (next: boolean) => {
    if (total <= 1) return
    setIsPaused(next)
  }

  return (
    <div
      className={cn(
        "sticky top-[4.5rem] z-40 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70",
        className,
      )}
      onMouseEnter={() => handlePause(true)}
      onMouseLeave={() => handlePause(false)}
      onFocusCapture={() => handlePause(true)}
      onBlurCapture={() => handlePause(false)}
    >
      <div className="mx-auto flex h-12 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
        <Link
          key={current.id}
          href={productPath(current.slug)}
          className="relative flex h-9 w-full items-center gap-3 overflow-hidden rounded-full bg-white/70 px-3 text-sm font-medium text-foreground shadow-[0_24px_52px_-36px_rgba(18,66,112,0.42)] ring-1 ring-inset ring-white/35 transition hover:bg-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-1)/0.28] lg:h-11 lg:gap-4 lg:px-4 before:absolute before:inset-[-1px] before:-z-10 before:rounded-full before:bg-[linear-gradient(125deg,rgba(23,115,230,0.18) 0%,rgba(119,91,255,0.16) 55%,rgba(255,255,255,0.9) 100%)] before:opacity-100 before:transition hover:before:opacity-100 after:pointer-events-none after:absolute after:inset-0 after:-z-20 after:rounded-full after:bg-[radial-gradient(160%_140%_at_10%_120%,rgba(23,115,230,0.22),rgba(255,255,255,0.05))]"
          style={{
            animation: `${animationId} 520ms ease`,
            animationFillMode: "both",
          }}
          aria-label={`View ${current.name}`}
        >
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border/50 bg-background/90">
            <Image
              src={current.logo}
              alt={current.name}
              width={28}
              height={28}
              className="h-full w-full object-cover"
            />
          </span>

          <div
            className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden text-xs text-muted-foreground sm:text-sm"
            role="status"
            aria-live="polite"
          >
            <span className="truncate font-semibold text-foreground">
              {current.name}
            </span>
            {tagline ? (
              <span className="hidden text-muted-foreground/70 sm:inline">
                •
              </span>
            ) : null}
            {tagline ? (
              <span className="truncate text-muted-foreground">{tagline}</span>
            ) : null}
          </div>
          {hasMeta ? (
            <div className="hidden shrink-0 items-center gap-3 lg:flex">
              <span className="hidden h-7 shrink-0 items-center rounded-full border border-white/60 bg-white/70 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--brand-1)]/85 shadow-[0_6px_16px_-12px_rgba(18,66,112,0.45)] lg:inline-flex">
                Spotlight
              </span>
              <div className="flex items-center gap-2">
                {showCategory ? (
                  <span className="inline-flex max-w-[200px] items-center gap-2 rounded-full border border-white/60 bg-white/80 px-3 py-1 text-xs text-muted-foreground shadow-[0_6px_16px_-12px_rgba(18,66,112,0.35)]">
                    <span className="text-muted-foreground/70">Category</span>
                    <span className="font-semibold text-foreground">
                      {categoryName}
                    </span>
                  </span>
                ) : null}
                {showMaker ? (
                  <span className="inline-flex max-w-[220px] items-center gap-2 rounded-full border border-white/60 bg-white/80 px-3 py-1 text-xs text-muted-foreground shadow-[0_6px_16px_-12px_rgba(18,66,112,0.35)]">
                    <span className="text-muted-foreground/70">Maker</span>
                    <span className="font-semibold text-foreground">
                      {makerName}
                    </span>
                  </span>
                ) : null}
                {showUpvotes ? (
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/80 px-3 py-1 text-xs text-muted-foreground shadow-[0_6px_16px_-12px_rgba(18,66,112,0.35)]">
                    <span className="text-muted-foreground/70">Upvotes</span>
                    <span className="font-semibold text-foreground">
                      {upvoteLabel}
                    </span>
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}
        </Link>
      </div>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes ${animationId} {
              0% {
                opacity: 0;
                transform: translateX(32px);
              }
              100% {
                opacity: 1;
                transform: translateX(0);
              }
            }
          `,
        }}
      />
    </div>
  )
}

export default StickyBannerCarousel

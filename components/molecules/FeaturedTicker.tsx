"use client"

import Link from "next/link"
import Image from "next/image"
import { Star } from "lucide-react"
import { useMemo } from "react"

type Item = {
  slug: string
  name: string
  logo: string
}

export default function FeaturedTicker({ items }: { items: Item[] }) {
  const list = useMemo(() => items.slice(0, 12), [items])
  const animationId = useMemo(
    () => `featuredTickerScroll-${Math.random().toString(36).slice(2)}`,
    [],
  )
  if (!list.length) return null

  const shouldDuplicate = list.length >= 4
  const tickerItems = shouldDuplicate ? [...list, ...list] : list
  const animationDuration = Math.max(28, list.length * 4)
  const endTranslate = shouldDuplicate ? "-50%" : `-${100 + list.length * 12}%`

  return (
    <div className="sticky top-16 z-40 border-b border-[color:var(--brand-1)/0.12] bg-background">
      <div className="relative mx-auto flex max-w-7xl items-center gap-3 px-3 py-2 sm:gap-5 sm:px-6">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--brand-1)/0.2] bg-background/85 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--brand-1)] shadow-sm sm:gap-2 sm:px-3 sm:text-[11px] sm:tracking-[0.28em]">
          <Star className="h-3.5 w-3.5" fill="currentColor" />
          <span className="sm:hidden">Featured</span>
          <span className="hidden sm:inline">Featured Today</span>
        </div>

        <div className="relative flex-1 overflow-hidden">
          <div
            className="flex w-max items-center gap-6 whitespace-nowrap text-xs text-[color:var(--brand-1)/0.82] will-change-transform"
            style={{
              animation: `${animationId} ${animationDuration}s linear infinite`,
            }}
            aria-label="Featured product ticker"
          >
            {tickerItems.map((p, i) => (
              <Link
                key={`${p.slug}-${i}`}
                href={`/products/${p.slug}`}
                className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[color:var(--brand-1)/0.12] bg-background/70 px-3 py-1.5 font-medium text-[color:var(--brand-1)] transition hover:-translate-y-0.5 hover:border-[color:var(--brand-1)/0.3] hover:text-[color:var(--brand-1)]"
              >
                <Image
                  src={p.logo}
                  alt={p.name}
                  width={20}
                  height={20}
                  className="h-5 w-5 rounded-sm border border-[color:var(--brand-1)/0.15] object-cover"
                />
                <span>{p.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes ${animationId} {
              0% {
                transform: translateX(100vw);
              }
              100% {
                transform: translateX(${endTranslate});
              }
            }
          `,
        }}
      />
    </div>
  )
}

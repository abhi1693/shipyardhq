"use client"

import Link from "next/link"
import Image from "next/image"
import { useMemo } from "react"

type Item = {
  slug: string
  name: string
  logo: string
}

export default function FeaturedTicker({ items }: { items: Item[] }) {
  const list = useMemo(() => items.slice(0, 12), [items])
  if (!list.length) return null

  // Only duplicate if the list is long enough (e.g., > 3 items)
  const shouldDuplicate = list.length > 3
  const tickerItems = shouldDuplicate ? [...list, ...list] : list

  // Dynamic animation duration based on item count (min 30s, scales with items)
  const animationDuration = Math.max(30, list.length * 3)

  // Calculate the end translation based on list length and duplication
  const endTranslate = shouldDuplicate ? "-100%" : `-${50 + list.length * 10}%`

  return (
    <div className="border-b bg-muted/40 overflow-hidden">
      <div className="py-2">
        <div
          className="flex flex-nowrap items-center gap-8 w-max whitespace-nowrap will-change-transform"
          style={{ animation: `ticker ${animationDuration}s linear infinite` }}
        >
          {tickerItems.map((p, i) => (
            <Link
              key={`${p.slug}-${i}`}
              href={`/products/${p.slug}`}
              className="inline-flex shrink-0 items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <Image
                src={p.logo}
                alt={p.name}
                width={16}
                height={16}
                className="h-4 w-4 rounded-sm border object-cover"
              />
              <span className="font-medium">{p.name}</span>
              <span className="opacity-60">Featured</span>
            </Link>
          ))}
        </div>
      </div>
      <style jsx>{`
        @keyframes ticker {
          0% {
            transform: translateX(100vw);
          }
          100% {
            transform: translateX(${endTranslate});
          }
        }
      `}</style>
    </div>
  )
}
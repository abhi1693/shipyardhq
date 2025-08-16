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
  return (
    <div className="border-b bg-muted/40">
      <div className="max-w-7xl mx-auto px-4 py-2 overflow-hidden">
        <div className="flex gap-8 animate-[ticker_30s_linear_infinite] will-change-transform">
          {[...list, ...list].map((p, i) => (
            <Link
              key={`${p.slug}-${i}`}
              href={`/products/${p.slug}`}
              className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
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
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  )
}

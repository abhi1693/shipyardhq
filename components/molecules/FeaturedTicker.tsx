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
    <div className="border-b bg-muted/40 overflow-hidden">
      <div className="py-2">
        <div
          className="flex flex-nowrap items-center gap-8 w-max whitespace-nowrap will-change-transform"
          style={{ animation: "ticker 30s linear infinite" }}
        >
          {[...list, ...list].map((p, i) => (
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
      <style>{`
        @keyframes ticker {
          0% { transform: translateX(100vw); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  )
}

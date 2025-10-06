"use client"

import React from "react"
import { CheckCircle } from "lucide-react"

import { ProductCompactCard } from "@/components/molecules/ProductCompactCard"
import { Badge } from "@/components/atoms/badge"

type ProductListItem = {
  id: string
  slug: string
  name: string
  logo: string
  tagline: string
  badges?: string[]
  analytics?: { upvotes?: number | null } | null
  user?: { firstName?: string | null; lastName?: string | null } | null
  category?: { name?: string | null } | null
  verification?: { isVerified?: boolean | null } | null
}

interface ProductListProps<T extends ProductListItem> {
  items: T[]
  showCategory?: boolean
  showVerified?: boolean
  columns?: string // tailwind grid cols classes
  className?: string
  topRight?: (item: T, index: number) => React.ReactNode
  imagePriorityFirstN?: number
  showRank?: boolean
  rankStartAt?: number // used when showRank is true; defaults to 0
  showBadges?: boolean
}

export default function ProductList<T extends ProductListItem>({
  items,
  showCategory = true,
  showVerified = true,
  columns = "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4",
  className,
  topRight,
  imagePriorityFirstN = 4,
  showRank = false,
  rankStartAt = 0,
  showBadges = false,
}: ProductListProps<T>) {
  return (
    <div
      className={
        "grid auto-rows-[minmax(0,1fr)] gap-5 " +
        columns +
        (className ? ` ${className}` : "")
      }
    >
      {items.map((p, i) => (
        <ProductCompactCard
          key={p.id}
          product={{
            id: p.id,
            slug: p.slug,
            name: p.name,
            logo: p.logo,
            tagline: p.tagline,
          }}
          upvotes={p.analytics?.upvotes ?? 0}
          badges={p.badges}
          category={showCategory ? p.category?.name ?? null : null}
          meta={
            topRight ? (
              topRight(p, i)
            ) : showRank ? (
              <Badge variant="secondary" className="px-2 py-0.5 text-xs">
                #{rankStartAt + i + 1}
              </Badge>
            ) : showVerified && p.verification?.isVerified ? (
              <Badge className="gap-1 rounded-full border border-[color:var(--brand-2)/0.4] bg-[color:var(--brand-2)/0.12] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--brand-2)]">
                <CheckCircle className="size-3" /> Verified
              </Badge>
            ) : undefined
          }
          imagePriority={i < imagePriorityFirstN}
          showCategory={showCategory}
          showBadges={showBadges}
        />
      ))}
    </div>
  )
}

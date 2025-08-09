"use client"

import React from "react"
import { ProductCard } from "@/components/molecules/ProductCard"
import { Badge } from "@/components/atoms/badge"

type ProductListItem = {
  id: string
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
  compact?: boolean
  showCategory?: boolean
  showVerified?: boolean
  columns?: string // tailwind grid cols classes
  className?: string
  topRight?: (item: T, index: number) => React.ReactNode
  imagePriorityFirstN?: number
  showRank?: boolean
  rankStartAt?: number // used when showRank is true; defaults to 0
}

export default function ProductList<T extends ProductListItem>({
  items,
  compact = true,
  showCategory = true,
  showVerified = true,
  columns = "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-4",
  className,
  topRight,
  imagePriorityFirstN = 4,
  showRank = false,
  rankStartAt = 0,
}: ProductListProps<T>) {
  return (
    <div className={"grid gap-4 " + columns + (className ? ` ${className}` : "") }>
      {items.map((p, i) => (
        <ProductCard
          key={p.id}
          product={{ id: p.id, name: p.name, logo: p.logo, tagline: p.tagline }}
          badges={p.badges}
          upvotes={p.analytics?.upvotes ?? 0}
          author={
            p.user
              ? {
                  name: `${p.user.firstName ?? ""} ${p.user.lastName ?? ""}`.trim(),
                  initial: (p.user.firstName?.[0] ?? "U").toUpperCase(),
                }
              : undefined
          }
          category={showCategory ? (p.category?.name ?? undefined) : undefined}
          topRight={
            topRight
              ? topRight(p, i)
              : showRank
                ? (
                    <Badge variant="secondary" className="px-2 py-0.5 text-xs">
                      #{rankStartAt + i + 1}
                    </Badge>
                  )
                : showVerified && p.verification?.isVerified
                  ? (
                      <span className="inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px]">
                        Verified
                      </span>
                    )
                  : undefined
          }
          imagePriority={i < imagePriorityFirstN}
          compact={compact}
        />
      ))}
    </div>
  )
}

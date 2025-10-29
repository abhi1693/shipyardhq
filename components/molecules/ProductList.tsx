"use client"

import React, { useMemo } from "react"
import { CheckCircle } from "lucide-react"

import ProductGrid from "@/components/molecules/ProductGrid"
import type { ProductCardItem } from "@/components/molecules/ProductCard"
import { toProductCardItem } from "@/lib/products/card-item"
import { Badge } from "@/components/atoms/badge"
import { cn } from "@/lib/utils"

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
  showVerified?: boolean
  columns?: string // deprecated; retained for backwards compatibility
  className?: string
  topRight?: (item: T, index: number) => React.ReactNode
  showRank?: boolean
  rankStartAt?: number // used when showRank is true; defaults to 0
}

export default function ProductList<T extends ProductListItem>({
  items,
  showVerified = true,
  columns: _columns = "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4",
  className,
  topRight,
  showRank = false,
  rankStartAt = 0,
}: ProductListProps<T>) {
  void _columns
  const cardItems = useMemo<ProductCardItem[]>(
    () =>
      items.map((item, index) =>
        toProductCardItem(item, {
          meta: topRight
            ? topRight(item, index)
            : showRank
              ? (
                  <Badge
                    variant="secondary"
                    className="px-2 py-0.5 text-xs"
                  >
                    #{rankStartAt + index + 1}
                  </Badge>
                )
              : showVerified && item.verification?.isVerified
                ? (
                    <Badge className="gap-1 rounded-full border border-[color:var(--brand-2)/0.4] bg-[color:var(--brand-2)/0.12] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--brand-2)]">
                      <CheckCircle className="size-3" /> Verified
                    </Badge>
                  )
                : undefined,
        }),
      ),
    [items, rankStartAt, showRank, showVerified, topRight],
  )

  const listClassName = cn("space-y-4", className)

  return <ProductGrid items={cardItems} className={listClassName} />
}

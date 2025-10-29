'use client'

import { ReactNode } from "react"

import UniformCard from "@/components/molecules/UniformCard"
import { ProductCard } from "@/components/molecules/ProductCard"
import type { ProductCardItem } from "@/components/molecules/ProductCard"
import { FeaturedProduct } from "@/types"
import { cn } from "@/lib/utils"

export function FeaturedProductGrid({
  items,
  filterExpiredBadges = true,
  extra,
  className,
  columns = "grid-cols-1 items-stretch sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3",
}: {
  items: FeaturedProduct[]
  filterExpiredBadges?: boolean
  extra?: ReactNode
  className?: string
  columns?: string
}) {
  const now = new Date()
  return (
    <div className={cn("grid gap-5", columns, className)}>
      {items.map(({ product, id }) => {
        const p = product
        const badges = filterExpiredBadges
          ? p.ProductBadge.filter(
              (pb) => !pb.expiresAt || new Date(pb.expiresAt) > now,
            ).map((pb) => pb.badge)
          : p.ProductBadge.map((pb) => pb.badge)

        const productCard: ProductCardItem = {
          ...p,
          id: p.id,
          slug: p.slug,
          name: p.name,
          logo: p.logo,
          tagline: p.tagline,
          badges,
          voteCount: p.analytics?.upvotes ?? 0,
          categoryName: p.category?.name ?? null,
        }

        return (
          <UniformCard key={id} size="compact">
            <ProductCard product={productCard} className="h-full" />
          </UniformCard>
        )
      })}
      {extra ? <UniformCard size="normal">{extra}</UniformCard> : null}
    </div>
  )
}

export default FeaturedProductGrid

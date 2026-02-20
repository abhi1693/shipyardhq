"use client"

import { ReactNode } from "react"

import UniformCard from "@/components/molecules/UniformCard"
import { ProductCard } from "@/components/molecules/ProductCard"
import type { ProductCardItem } from "@/components/molecules/ProductCard"
import { toProductCardItem } from "@/lib/products/card-item"
import type { PublicProductCard } from "@/lib/generated/fastapi/schemas"
import { cn } from "@/lib/utils"

export function FeaturedProductGrid({
  items,
  filterExpiredBadges = true,
  extra,
  className,
  columns = "grid-cols-1 items-stretch sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3",
}: {
  items: PublicProductCard[]
  filterExpiredBadges?: boolean
  extra?: ReactNode
  className?: string
  columns?: string
}) {
  return (
    <div className={cn("grid gap-5", columns, className)}>
      {items.map((product) => {
        const badges = filterExpiredBadges
          ? product.badges ?? []
          : product.badges ?? []
        const productCard: ProductCardItem = toProductCardItem(
          {
            ...product,
            scoreCount: product.scoreCount ?? undefined,
          },
          {
          badges,
          },
        )

        return (
          <UniformCard key={product.id} size="compact">
            <ProductCard product={productCard} className="h-full" />
          </UniformCard>
        )
      })}
      {extra ? <UniformCard size="normal">{extra}</UniformCard> : null}
    </div>
  )
}

export default FeaturedProductGrid

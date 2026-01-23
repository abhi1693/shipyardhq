import type { ReactNode } from "react"

import ProductFeedCard from "@/components/molecules/ProductFeedCard"
import type { HomepageFeedItem } from "@/actions/public/homepage/feed"
import type { ProductCardVariant } from "@/types/product-card"
import type { ProductInterestSignals } from "@/types/product-interest"
export type { ProductCardVariant } from "@/types/product-card"

export type ProductCardBase = {
  id: string
  slug: string
  name: string
  logo: string
  tagline: string
  analytics?: { upvotes?: number | null } | null
  category?: { name?: string | null; slug?: string | null } | null
  badges?: string[] | null
  sponsored?: boolean
  isVerified?: boolean
  createdAt?: string | Date | null
  updatedAt?: string | Date | null
  latestRevenueCents?: number | null
  revenueCurrencyCode?: string | null
  scoreCount?: number
  interest?: ProductInterestSignals | null
}

export type ProductCardItem = ProductCardBase & {
  isVoted?: boolean
  updatesCount?: number
  categoryName?: string | null
  categorySlug?: string | null
  createdAt?: string
  updatedAt?: string
  isSponsored?: boolean
  meta?: ReactNode
  variant?: ProductCardVariant
}

const FALLBACK_TAGLINE =
  "Discover launch-ready tools from indie makers worldwide."

const resolveCategoryName = (product: ProductCardItem) =>
  typeof product.categoryName !== "undefined"
    ? (product.categoryName ?? null)
    : (product.category?.name ?? null)

function toFeedItem(product: ProductCardItem): HomepageFeedItem {
  const categoryName = resolveCategoryName(product)
  const isSponsored = Boolean(product.sponsored ?? product.isSponsored)
  const variant = product.variant ?? (isSponsored ? "sponsored" : "default")
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    logo: product.logo,
    tagline: product.tagline || FALLBACK_TAGLINE,
    createdAt: product.createdAt ?? "",
    updatedAt: product.updatedAt ?? "",
    badges: product.badges ?? [],
    category: categoryName,
    categorySlug: product.categorySlug ?? null,
    scoreCount: product.scoreCount,
    updatesCount: product.updatesCount,
    isSponsored,
    isVoted: Boolean(product.isVoted),
    variant,
    latestRevenueCents:
      typeof product.latestRevenueCents === "number"
        ? product.latestRevenueCents
        : null,
    revenueCurrencyCode: product.revenueCurrencyCode ?? null,
    isVerified: Boolean(product.isVerified),
    interest: product.interest ?? null,
    shuffleRank: Math.random(),
  }
}

interface ProductCardProps {
  product: ProductCardItem
  className?: string
  variant?: ProductCardVariant
}

export function ProductCard({ product, className, variant }: ProductCardProps) {
  return (
    <ProductFeedCard
      item={toFeedItem(product)}
      className={className}
      meta={product.meta}
      variant={variant ?? product.variant}
    />
  )
}

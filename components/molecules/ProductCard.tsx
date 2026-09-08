import type { ReactNode } from "react"

import ProductFeedCard from "@/components/molecules/ProductFeedCard"
import type { HomepageFeedItem } from "@/lib/server/homepage/feed"
import type { ProductCardVariant } from "@/types/product-card"
import type { ProductInterestSignals } from "@/types/product-interest"
import {
  resolveProductCategories,
  type ProductCategorySummary,
} from "@/lib/products/categories"
import { stableUnitInterval } from "@/lib/stable-random"
export type { ProductCardVariant } from "@/types/product-card"

export type ProductCardBase = {
  id: string
  slug: string
  name: string
  logo: string
  tagline: string
  pricingModel?: "free" | "freemium" | "subscription" | "one_time" | "custom"
  startingPriceCents?: number | null
  currencyCode?: string | null
  analytics?: { upvotes?: number | null } | null
  category?: { name?: string | null; slug?: string | null } | null
  categories?: ProductCategorySummary[] | null
  type?: string | null
  platforms?: string[] | null
  keywords?: string[] | null
  alternatives?: { name: string; slug: string }[] | null
  badges?: string[] | null
  sponsored?: boolean
  isVerified?: boolean
  createdAt?: string | Date | null
  updatedAt?: string | Date | null
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

const resolveCategorySlug = (product: ProductCardItem) =>
  typeof product.categorySlug !== "undefined"
    ? (product.categorySlug ?? null)
    : (product.category?.slug ?? null)

function toFeedItem(product: ProductCardItem): HomepageFeedItem {
  const categoryName = resolveCategoryName(product)
  const categorySlug = resolveCategorySlug(product)
  const categories = resolveProductCategories(
    { name: categoryName, slug: categorySlug },
    product.categories,
  )
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
    categorySlug,
    categories,
    upvoteCount: product.analytics?.upvotes ?? 0,
    scoreCount: product.scoreCount,
    updatesCount: product.updatesCount,
    isSponsored,
    isVoted: Boolean(product.isVoted),
    variant,
    isVerified: Boolean(product.isVerified),
    interest: product.interest ?? null,
    shuffleRank: stableUnitInterval(
      `product-card:${product.id}:${product.slug}`,
    ),
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

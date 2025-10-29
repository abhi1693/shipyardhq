import type { ReactNode } from "react"

import ProductFeedCard from "@/components/molecules/ProductFeedCard"
import type { HomepageFeedItem } from "@/actions/public/homepage/feed"

export type ProductCardBase = {
  id: string
  slug: string
  name: string
  logo: string
  tagline: string
  analytics?: { upvotes?: number | null } | null
  category?: { name?: string | null; slug?: string | null } | null
  badges?: string[]
  sponsored?: boolean
}

export type ProductCardItem = ProductCardBase & {
  voteCount?: number
  isVoted?: boolean
  updatesCount?: number
  categoryName?: string | null
  categorySlug?: string | null
  createdAt?: string
  updatedAt?: string
  isSponsored?: boolean
  meta?: ReactNode
}

const FALLBACK_TAGLINE =
  "Discover launch-ready tools from indie makers worldwide."

const resolveUpvotes = (product: ProductCardItem) => {
  if (typeof product.voteCount === "number") return product.voteCount
  if (typeof product.analytics?.upvotes === "number") {
    return product.analytics.upvotes
  }
  return 0
}

const resolveCategoryName = (product: ProductCardItem) =>
  typeof product.categoryName !== "undefined"
    ? product.categoryName ?? null
    : product.category?.name ?? null

function toFeedItem(product: ProductCardItem): HomepageFeedItem {
  const categoryName = resolveCategoryName(product)
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
    voteCount: resolveUpvotes(product),
    updatesCount: product.updatesCount,
    isSponsored: Boolean(product.sponsored ?? product.isSponsored),
    isVoted: Boolean(product.isVoted),
  }
}

interface ProductCardProps {
  product: ProductCardItem
  className?: string
}

export function ProductCard({ product, className }: ProductCardProps) {
  return (
    <ProductFeedCard
      item={toFeedItem(product)}
      className={className}
      meta={product.meta}
    />
  )
}

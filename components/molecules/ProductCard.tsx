import { ReactNode } from "react"

import { ProductCompactCard } from "@/components/molecules/ProductCompactCard"

interface ProductCardProps {
  product: {
    id: string
    slug: string
    name: string
    logo: string
    tagline: string
  }
  badges?: string[]
  upvotes?: number
  category?: string
  compact?: boolean
  topRight?: ReactNode
  imagePriority?: boolean
}

// Legacy wrapper to keep existing imports working while the UI standardizes on the
// compact product card design. New usage should prefer ProductCompactCard directly.
export function ProductCard(props: ProductCardProps) {
  const {
    product,
    badges = [],
    upvotes = 0,
    category,
    compact = true,
    topRight,
    imagePriority = false,
  } = props

  void compact

  const showCategory = Boolean(category)

  return (
    <ProductCompactCard
      product={product}
      upvotes={upvotes}
      badges={badges}
      category={showCategory ? (category ?? null) : null}
      imagePriority={imagePriority}
      meta={topRight}
      showCategory={showCategory}
      showBadges={badges.length > 0}
    />
  )
}

import type { Metadata } from "next"

export const MIN_INDEXABLE_PRODUCTS = 10

export const NOINDEX_FOLLOW_ROBOTS: Metadata["robots"] = {
  index: false,
  follow: true,
  googleBot: {
    index: false,
    follow: true,
  },
}

export const isInventoryIndexable = (productCount: number) =>
  Number.isFinite(productCount) && productCount >= MIN_INDEXABLE_PRODUCTS

export const robotsForInventoryCount = (
  productCount: number,
): Metadata["robots"] =>
  isInventoryIndexable(productCount) ? undefined : NOINDEX_FOLLOW_ROBOTS

export const canonicalForInventoryCount = ({
  canonical,
  parent,
  productCount,
}: {
  canonical: string
  parent: string
  productCount: number
}) => (isInventoryIndexable(productCount) ? canonical : parent)

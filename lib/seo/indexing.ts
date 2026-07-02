import type { Metadata } from "next"

export const MIN_INDEXABLE_PRODUCTS = 5

export const isInventoryIndexable = (productCount: number) =>
  Number.isFinite(productCount) && productCount >= MIN_INDEXABLE_PRODUCTS

export const robotsForInventoryCount = (
  productCount: number,
): Metadata["robots"] =>
  isInventoryIndexable(productCount)
    ? undefined
    : {
        index: false,
        follow: true,
        googleBot: {
          index: false,
          follow: true,
        },
      }

export const canonicalForInventoryCount = ({
  canonical,
  parent,
  productCount,
}: {
  canonical: string
  parent: string
  productCount: number
}) => (isInventoryIndexable(productCount) ? canonical : parent)

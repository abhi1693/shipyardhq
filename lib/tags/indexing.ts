import type { Metadata } from "next"

export const TAG_MIN_INDEXABLE_PRODUCTS = 3

export const isTagIndexable = (productCount: number) =>
  Number.isFinite(productCount) && productCount >= TAG_MIN_INDEXABLE_PRODUCTS

export const tagRobotsForProductCount = (
  productCount: number,
): Metadata["robots"] =>
  isTagIndexable(productCount)
    ? undefined
    : {
        index: false,
        follow: true,
        googleBot: {
          index: false,
          follow: true,
        },
      }

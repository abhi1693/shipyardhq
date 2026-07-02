import type { Metadata } from "next"

import {
  MIN_INDEXABLE_PRODUCTS,
  isInventoryIndexable,
  robotsForInventoryCount,
} from "@/lib/seo/indexing"

export const TAG_MIN_INDEXABLE_PRODUCTS = MIN_INDEXABLE_PRODUCTS

export const isTagIndexable = (productCount: number) =>
  isInventoryIndexable(productCount)

export const tagRobotsForProductCount = (
  productCount: number,
): Metadata["robots"] => robotsForInventoryCount(productCount)

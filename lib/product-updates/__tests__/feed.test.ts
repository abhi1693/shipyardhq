import { describe, expect, it } from "vitest"

import { selectBalancedProductUpdates } from "@/lib/product-updates/feed"
import type { ProductUpdateFeedItem } from "@/types/product-updates"

function buildUpdate(
  id: string,
  productId: string,
  overrides: Partial<ProductUpdateFeedItem> = {},
): ProductUpdateFeedItem {
  return {
    id,
    title: `Update ${id}`,
    summary: null,
    publishedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    product: {
      id: productId,
      name: `Product ${productId}`,
      slug: `product-${productId}`,
      logo: null,
      tagline: null,
    },
    ...overrides,
  }
}

describe("selectBalancedProductUpdates", () => {
  it("prioritizes different products until the limit is reached", () => {
    const updates = [
      buildUpdate("u1", "p1"),
      buildUpdate("u2", "p1"),
      buildUpdate("u3", "p2"),
      buildUpdate("u4", "p3"),
      buildUpdate("u5", "p4"),
    ]

    const result = selectBalancedProductUpdates(updates, 4)

    expect(result.map((item) => item.id)).toEqual(["u1", "u3", "u4", "u5"])
  })

  it("backfills with additional updates when unique products are exhausted", () => {
    const updates = [buildUpdate("u1", "p1"), buildUpdate("u2", "p1")]

    const result = selectBalancedProductUpdates(updates, 3)

    expect(result.map((item) => item.id)).toEqual(["u1", "u2"])
  })

  it("returns an empty array when the limit is zero or negative", () => {
    const updates = [buildUpdate("u1", "p1")]

    expect(selectBalancedProductUpdates(updates, 0)).toEqual([])
    expect(selectBalancedProductUpdates(updates, -2)).toEqual([])
  })
})

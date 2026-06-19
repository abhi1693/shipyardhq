import { describe, expect, it } from "vitest"

import { getInitialValuesFromProduct } from "@/lib/productWizard/mappers"
import type { ProductForEditWizard } from "@/types/product-wizard"

function makeProduct(
  overrides: Partial<ProductForEditWizard> = {},
): ProductForEditWizard {
  return {
    id: "product_1",
    slug: "shipyardhq",
    name: "Shipyard HQ",
    tagline: "Launch, grow, and showcase your SaaS.",
    description: "A curated hub for launches.",
    websiteUrl: "https://shipyardhq.dev",
    logo: "https://example.com/logo.png",
    categoryId: "primary-category",
    categories: [],
    type: "saas",
    pricingModel: "free",
    startingPriceCents: null,
    currencyCode: null,
    platforms: ["web"],
    keywords: [],
    bannerImage: null,
    status: "published",
    metadata: null,
    alternatives: [],
    ProductMedia: [],
    verification: null,
    ...overrides,
  }
}

describe("product wizard mappers", () => {
  it("falls back to the primary category when edit relation rows are empty", () => {
    const values = getInitialValuesFromProduct(makeProduct())

    expect(values.categoryId).toBe("primary-category")
    expect(values.categoryIds).toEqual(["primary-category"])
  })

  it("uses multi-category relation rows when they are present", () => {
    const values = getInitialValuesFromProduct(
      makeProduct({
        categories: [
          { categoryId: "category-a" },
          { categoryId: "category-b" },
        ],
      }),
    )

    expect(values.categoryId).toBe("primary-category")
    expect(values.categoryIds).toEqual(["category-a", "category-b"])
  })
})

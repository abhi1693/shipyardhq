import { describe, expect, it } from "vitest"

import {
  PUBLIC_PRODUCT_CATEGORY_LIMIT,
  resolveProductCategories,
} from "@/lib/products/categories"

describe("resolveProductCategories", () => {
  it("keeps the primary category first, deduplicates, and caps the result at three", () => {
    const result = resolveProductCategories(
      { name: " Developer Tools ", slug: "developer-tools" },
      [
        {
          category: {
            name: "Duplicate slug",
            slug: "DEVELOPER-TOOLS",
          },
        },
        {
          category: {
            name: "developer tools",
            slug: "different-slug",
          },
        },
        { category: { name: "Analytics", slug: "analytics" } },
        {
          category: {
            name: "Artificial Intelligence",
            slug: "artificial-intelligence",
          },
        },
        { category: { name: "Marketing", slug: "marketing" } },
      ],
    )

    expect(result).toHaveLength(PUBLIC_PRODUCT_CATEGORY_LIMIT)
    expect(result).toEqual([
      { name: "Developer Tools", slug: "developer-tools" },
      { name: "Analytics", slug: "analytics" },
      {
        name: "Artificial Intelligence",
        slug: "artificial-intelligence",
      },
    ])
  })

  it("falls back to the legacy primary category when assignments are absent", () => {
    expect(
      resolveProductCategories({
        name: "Developer Tools",
        slug: "developer-tools",
      }),
    ).toEqual([{ name: "Developer Tools", slug: "developer-tools" }])
  })

  it("uses assigned categories when a legacy primary category is absent", () => {
    expect(
      resolveProductCategories(null, [
        { category: { name: "Analytics", slug: "analytics" } },
        { name: "Artificial Intelligence", slug: null },
      ]),
    ).toEqual([
      { name: "Analytics", slug: "analytics" },
      { name: "Artificial Intelligence", slug: null },
    ])
  })
})

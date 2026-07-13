import { describe, expect, it } from "vitest"

import { mapProductCardRecordToBase } from "@/lib/products/selects"
import type { ProductCardRecord } from "@/lib/products/selects"

const baseProduct = {
  id: "product-1",
  slug: "product-one",
  name: "Product One",
  logo: "https://example.com/logo.png",
  tagline: "A useful product",
  planId: null,
  type: "saas",
  pricingModel: "free",
  platforms: ["web"],
  keywords: [],
  startingPriceCents: null,
  currencyCode: "USD",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-02T00:00:00.000Z"),
  analytics: { upvotes: 0 },
  verification: { isVerified: false },
  category: { name: "Developer Tools", slug: "developer-tools" },
  categories: [],
  ProductBadge: [],
  alternatives: [],
} satisfies ProductCardRecord

describe("mapProductCardRecordToBase", () => {
  it("marks priority plan products as sponsored without loading plan relations", () => {
    const product = {
      ...baseProduct,
      planId: "priority-plan",
    } satisfies ProductCardRecord

    expect(
      mapProductCardRecordToBase(product, new Date(), {
        priorityPlanIds: ["priority-plan"],
      }).sponsored,
    ).toBe(true)
  })

  it("does not use legacy plan-assignment records as sponsored fallback", () => {
    const product = {
      ...baseProduct,
      plan: {
        assignments: [
          {
            feature: {
              key: "priorityPlacement",
            },
          },
        ],
      },
    } as ProductCardRecord & {
      plan: { assignments: Array<{ feature: { key: string } }> }
    }

    expect(mapProductCardRecordToBase(product).sponsored).toBe(false)
  })

  it("maps the primary category first and exposes up to three unique categories", () => {
    const product = {
      ...baseProduct,
      categories: [
        {
          category: {
            name: "Developer Tools",
            slug: "developer-tools",
          },
        },
        {
          category: {
            name: "Analytics",
            slug: "analytics",
          },
        },
        {
          category: {
            name: "Artificial Intelligence",
            slug: "artificial-intelligence",
          },
        },
        {
          category: {
            name: "Marketing",
            slug: "marketing",
          },
        },
      ],
    } satisfies ProductCardRecord

    expect(mapProductCardRecordToBase(product).categories).toEqual([
      { name: "Developer Tools", slug: "developer-tools" },
      { name: "Analytics", slug: "analytics" },
      {
        name: "Artificial Intelligence",
        slug: "artificial-intelligence",
      },
    ])
  })
})

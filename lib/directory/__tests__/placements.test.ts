import { describe, expect, it } from "vitest"

import {
  partitionFeaturedProducts,
  resolveSponsoredPlacement,
} from "@/lib/directory/placements"
import type { FeaturedProduct } from "@/types"

function featuredProduct(
  overrides: Partial<FeaturedProduct> = {},
  productOverrides: Partial<FeaturedProduct["product"]> = {},
): FeaturedProduct {
  const base: FeaturedProduct = {
    id: `badge-${Math.random()}`,
    badge: "featured",
    expiresAt: null,
    createdAt: new Date(),
    productId: `product-${Math.random()}`,
    product: {
      id: `product-${Math.random()}`,
      slug: "sample",
      name: "Sample",
      logo: "/logo.png",
      tagline: "Tagline",
      bannerImage: null,
      analytics: { upvotes: 0 },
      user: { firstName: "A", lastName: "B" },
      category: { name: "AI" },
      ProductBadge: [],
      placementSchedules: [],
      plan: { assignments: [] },
      featureEntitlements: [],
    } as any,
  }

  return {
    ...base,
    ...overrides,
    product: {
      ...base.product,
      ...productOverrides,
    } as FeaturedProduct["product"],
  }
}

describe("directory placements helpers", () => {
  it("detects scheduled sponsorship when schedule active", () => {
    const now = Date.now()
    const entry = featuredProduct(
      {},
      {
        placementSchedules: [
          {
            id: "sch-1",
            featureKey: "featured",
            startsAt: new Date(now - 60_000) as any,
            endsAt: new Date(now + 60_000) as any,
          } as any,
        ],
      },
    )

    const result = resolveSponsoredPlacement(entry, "featured")
    expect(result.isSponsored).toBe(true)
    expect(result.origin).toBe("schedule")
    expect(result.schedule?.featureKey).toBe("featured")
  })

  it("prefers plan assignments when present", () => {
    const entry = featuredProduct(
      {},
      {
        plan: {
          assignments: [
            {
              enabled: true,
              feature: { key: "featured" },
            },
          ],
        },
      },
    )

    const result = resolveSponsoredPlacement(entry, "featured")
    expect(result.isSponsored).toBe(true)
    expect(result.origin).toBe("plan")
  })

  it("falls back to entitlements when no plan or schedule", () => {
    const entry = featuredProduct(
      {},
      {
        featureEntitlements: [
          {
            id: "ent-1",
            featureKey: "featured",
            status: "active",
            expiresAt: null,
          },
        ] as any,
      },
    )

    const result = resolveSponsoredPlacement(entry, "featured")
    expect(result.isSponsored).toBe(true)
    expect(result.origin).toBe("entitlement")
  })

  it("returns organic when no sponsorship signals", () => {
    const entry = featuredProduct()
    const result = resolveSponsoredPlacement(entry, "featured")
    expect(result.isSponsored).toBe(false)
    expect(result.origin).toBeNull()
  })

  it("partitions sponsored and organic products", () => {
    const sponsored = featuredProduct(
      {},
      {
        plan: {
          assignments: [
            {
              enabled: true,
              feature: { key: "featured" },
            },
          ],
        },
      },
    )
    const organic = featuredProduct()

    const { sponsored: sponsoredList, organic: organicList } =
      partitionFeaturedProducts([sponsored, organic])

    expect(sponsoredList).toHaveLength(1)
    expect(organicList).toHaveLength(1)
    expect(sponsoredList[0].product.id).toBe(sponsored.product.id)
    expect(organicList[0].product.id).toBe(organic.product.id)
  })
})

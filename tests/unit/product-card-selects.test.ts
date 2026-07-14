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
  planGrants: [],
  alternatives: [],
} satisfies ProductCardRecord

describe("mapProductCardRecordToBase", () => {
  it("marks products sponsored only while a matching priority grant is active", () => {
    const now = new Date("2026-01-15T00:00:00.000Z")
    const product = {
      ...baseProduct,
      planId: "priority-plan",
      planGrants: [
        {
          planId: "priority-plan",
          source: "dodo_payment",
          status: "active",
          startsAt: new Date("2026-01-14T00:00:00.000Z"),
          expiresAt: new Date("2026-01-16T00:00:00.000Z"),
        },
      ],
    } satisfies ProductCardRecord

    expect(
      mapProductCardRecordToBase(product, now, {
        priorityPlanIds: ["priority-plan"],
        placementNow: now,
      }).sponsored,
    ).toBe(true)
  })

  it.each([
    {
      name: "missing",
      grants: [],
    },
    {
      name: "expired",
      grants: [
        {
          planId: "priority-plan",
          source: "dodo_payment" as const,
          status: "active" as const,
          startsAt: new Date("2026-01-01T00:00:00.000Z"),
          expiresAt: new Date("2026-01-15T00:00:00.000Z"),
        },
      ],
    },
    {
      name: "not started",
      grants: [
        {
          planId: "priority-plan",
          source: "dodo_payment" as const,
          status: "active" as const,
          startsAt: new Date("2026-01-16T00:00:00.000Z"),
          expiresAt: null,
        },
      ],
    },
    {
      name: "different plan",
      grants: [
        {
          planId: "other-priority-plan",
          source: "dodo_payment" as const,
          status: "active" as const,
          startsAt: new Date("2026-01-01T00:00:00.000Z"),
          expiresAt: null,
        },
      ],
    },
  ])("does not sponsor a product with a $name grant", ({ grants }) => {
    const now = new Date("2026-01-15T00:00:00.000Z")
    const product = {
      ...baseProduct,
      planId: "priority-plan",
      planGrants: grants,
    } satisfies ProductCardRecord

    expect(
      mapProductCardRecordToBase(product, now, {
        priorityPlanIds: ["priority-plan", "other-priority-plan"],
        placementNow: now,
      }).sponsored,
    ).toBe(false)
  })

  it.each(["admin", "leaderboard", "migration"] as const)(
    "does not mark an active %s grant as sponsored",
    (source) => {
      const now = new Date("2026-01-15T00:00:00.000Z")
      const product = {
        ...baseProduct,
        planId: "priority-plan",
        planGrants: [
          {
            planId: "priority-plan",
            source,
            status: "active",
            startsAt: new Date("2026-01-14T00:00:00.000Z"),
            expiresAt: new Date("2026-01-16T00:00:00.000Z"),
          },
        ],
      } satisfies ProductCardRecord

      expect(
        mapProductCardRecordToBase(product, now, {
          priorityPlanIds: ["priority-plan"],
          placementNow: now,
        }).sponsored,
      ).toBe(false)
    },
  )

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

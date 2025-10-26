import { describe, it, expect } from "vitest"
import React from "react"
import { render, screen } from "@testing-library/react"

import HomepageSpotlight from "@/components/organisms/HomepageSpotlight"
import { LatestLaunches } from "@/components/organisms/LatestLaunches"
import { PricingTable } from "@/components/organisms/PricingTable"
import CategoryFeatured from "@/components/organisms/CategoryFeatured"
import { FeaturedHighlights } from "@/components/organisms/FeaturedHighlights"
import type { HomepageFeaturePlacement } from "@/actions/public/products/featured"

function featured(id: string, overrides: Partial<any> = {}) {
  const base = {
    id: `pb-${id}`,
    product: {
      id,
      slug: id,
      name: `Name ${id}`,
      logo: `/logo-${id}.png`,
      tagline: `Tag ${id}`,
      bannerImage: null as any,
      ProductBadge: [] as any[],
      analytics: { upvotes: 3 },
      user: { firstName: "A", lastName: "Z" },
      category: { name: "AI" },
      plan: { assignments: [] },
      featureEntitlements: [],
      placementSchedules: [],
    },
  }
  return { ...base, ...overrides }
}

function homepagePlacement(
  id: string,
  origin: HomepageFeaturePlacement["origin"],
  overrides: Partial<HomepageFeaturePlacement> = {},
): HomepageFeaturePlacement {
  const placement: HomepageFeaturePlacement = {
    id: `${origin}:${id}`,
    origin,
    product: {
      id: `hp-${id}`,
      slug: `slug-${id}`,
      name: `Homepage ${id}`,
      logo: `/logo-${id}.png`,
      tagline: `Tagline ${id}`,
      ProductBadge: [] as any[],
      analytics: { upvotes: 2 },
      user: { firstName: "A", lastName: "B" },
      category: { name: "AI" },
    } as any,
  }

  if (origin === "schedule") {
    placement.schedule = {
      id: `schedule-${id}`,
      slotKey: "hero_slot",
      startsAt: new Date(Date.now() - 60_000),
      endsAt: new Date(Date.now() + 60_000),
      redemptionId: null,
    }
  }

  return {
    ...placement,
    ...overrides,
    product: { ...placement.product, ...(overrides.product as any) },
  }
}

describe("Organisms", () => {
  it("HomepageSpotlight returns null when empty, groups placements", () => {
    const { container, rerender } = render(
      <HomepageSpotlight placements={[]} />,
    )
    expect(container.firstChild).toBeNull()

    const now = new Date()
    const placements: HomepageFeaturePlacement[] = [
      homepagePlacement("1", "schedule", {
        schedule: {
          id: "schedule-1",
          slotKey: "hero_slot",
          startsAt: new Date(now.getTime() - 30_000),
          endsAt: new Date(now.getTime() + 30_000),
          redemptionId: "redemption-1",
        },
        product: {
          ProductBadge: [
            {
              badge: "featured",
              expiresAt: new Date(now.getTime() + 3_600_000),
            },
            {
              badge: "expired",
              expiresAt: new Date(now.getTime() - 3_600_000),
            },
          ],
        } as any,
      }),
      homepagePlacement("2", "plan", {
        product: {
          plan: { id: "plan-paid", price: 2000 },
        } as any,
      }),
    ]

    rerender(<HomepageSpotlight placements={placements} />)
    expect(screen.getByText("Flagship homepage spotlight")).toBeInTheDocument()
    expect(screen.getByText("Homepage 1")).toBeInTheDocument()
    expect(screen.getByText("Homepage 2")).toBeInTheDocument()
    expect(screen.getAllByTestId("product-compact-card")).toHaveLength(2)
    const sponsoredPills = screen.getAllByText("Sponsored")
    expect(sponsoredPills).toHaveLength(2)
    expect(
      screen.queryByText("Plan upgrades in queue"),
    ).not.toBeInTheDocument()
    expect(screen.queryByText("Plan placement")).not.toBeInTheDocument()
  })

  it("LatestLaunches returns null when empty, otherwise renders grid", () => {
    const { container, rerender } = render(
      <LatestLaunches products={[]} as any />,
    )
    expect(container.firstChild).toBeNull()
    const items = [featured("1")]
    rerender(<LatestLaunches products={items as any} />)
    expect(
      screen.getByText("Fresh launches in the last 24 hours"),
    ).toBeInTheDocument()
    expect(screen.getByText("New today")).toBeInTheDocument()
    expect(screen.getByText("Name 1")).toBeInTheDocument()
  })

  it("PricingTable renders plans and marks popular paid plan with max productCount", () => {
    const plans: any[] = [
      {
        id: "free",
        name: "Free",
        description: "Desc",
        price: 0,
        productCount: 0,
        features: [],
      },
      {
        id: "pro",
        name: "Pro",
        description: "Desc",
        price: 1000,
        productCount: 5,
        features: [],
      },
      {
        id: "biz",
        name: "Business",
        description: "Desc",
        price: 2000,
        productCount: 5,
        features: [],
      },
    ]
    render(<PricingTable plans={plans as any} />)
    expect(screen.getAllByText("Most popular").length).toBeGreaterThan(0)
  })

  it("CategoryFeatured returns null when empty, otherwise banner + grid", () => {
    const { container, rerender } = render(
      (<CategoryFeatured products={[]} categoryName="AI" />) as any,
    )
    expect(container.firstChild).toBeNull()
    const products = [
      featured("1", {
        product: {
          ...featured("x").product,
          name: "Banner",
          slug: "banner",
          logo: "/l.png",
          tagline: "bt",
          ProductBadge: [],
        },
      }),
      featured("2"),
    ]
    rerender(<CategoryFeatured products={products as any} categoryName="AI" />)
    expect(screen.getByText("Featured in AI")).toBeInTheDocument()
    expect(screen.getAllByText("Banner").length).toBeGreaterThan(1)
    expect(screen.getByText("Name 2")).toBeInTheDocument()
  })

  it("FeaturedHighlights returns null when empty and groups sponsored items", () => {
    const { container, rerender } = render(
      (<FeaturedHighlights products={[]} />) as any,
    )
    expect(container.firstChild).toBeNull()
    const items = [
      featured("1", {
        product: {
          ...featured("1").product,
          plan: {
            assignments: [{ enabled: true, feature: { key: "featured" } }],
          },
        },
      }),
      featured("2"),
    ]
    rerender(<FeaturedHighlights products={items as any} />)
    expect(
      screen.getByText("Marquee placements that keep your launch in view"),
    ).toBeInTheDocument()
    expect(
      screen.getByText("Sponsored featured spotlights"),
    ).toBeInTheDocument()
    expect(screen.getByText("Featured on merit")).toBeInTheDocument()
  })
})

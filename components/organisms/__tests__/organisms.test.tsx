import { describe, it, expect } from "vitest"
import React from "react"
import { render, screen } from "@testing-library/react"

import HomepageSpotlight from "@/components/organisms/HomepageSpotlight"
import { LatestLaunches } from "@/components/organisms/LatestLaunches"
import { PricingTable } from "@/components/organisms/PricingTable"
import CategoryFeatured from "@/components/organisms/CategoryFeatured"
import { FeaturedHighlights } from "@/components/organisms/FeaturedHighlights"
import Hero from "@/components/organisms/LandingHero"

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
    },
  }
  return { ...base, ...overrides }
}

describe("Organisms", () => {
  it("HomepageSpotlight returns null when empty, filters expired badges", () => {
    const { container, rerender } = render(<HomepageSpotlight products={[]} />)
    expect(container.firstChild).toBeNull()
    const now = new Date()
    const products = [
      {
        id: "1",
        slug: "one",
        name: "One",
        logo: "/l1.png",
        tagline: "T1",
        analytics: { upvotes: 1 },
        user: { firstName: "A", lastName: "B" },
        category: { name: "AI" },
        ProductBadge: [
          {
            badge: "featured",
            expiresAt: new Date(now.getTime() + 86400000).toISOString(),
          },
          {
            badge: "trending",
            expiresAt: new Date(now.getTime() - 86400000).toISOString(),
          },
        ],
      },
    ]
    rerender(<HomepageSpotlight products={products as any} />)
    expect(screen.getByText("Harbor Spotlight")).toBeInTheDocument()
    expect(screen.getByText("Harbor Picks")).toBeInTheDocument()
    // Only non-expired badge shown (compact ProductList uses title attr for badge)
    expect(screen.getByTitle("Featured")).toBeInTheDocument()
  })

  it("LatestLaunches returns null when empty, otherwise renders grid", () => {
    const { container, rerender } = render(
      <LatestLaunches products={[]} as any />,
    )
    expect(container.firstChild).toBeNull()
    const items = [featured("1")]
    rerender(<LatestLaunches products={items as any} />)
    expect(screen.getByText("Fresh Off the Dock")).toBeInTheDocument()
    expect(screen.getByText("Fresh Launches")).toBeInTheDocument()
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
    // Popular appears at least for one of the max-count paid plans
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
    // Banner shows product name when no bannerImage (twice: overlay and fallback)
    expect(screen.getAllByText("Banner").length).toBeGreaterThan(1)
    // Grid has the other product too
    expect(screen.getByText("Name 2")).toBeInTheDocument()
  })

  it("FeaturedHighlights renders CTA extra and grid", () => {
    const items = [featured("1")]
    render(<FeaturedHighlights products={items as any} />)
    expect(screen.getByText("Highlights From the Helm")).toBeInTheDocument()
    expect(screen.getByText("Featured Fleet")).toBeInTheDocument()
    // CTA card text
    expect(
      screen.getByText("Want to see your product featured here?"),
    ).toBeInTheDocument()
  })

  it("LandingHero renders hero content and CTA", () => {
    render(<Hero />)
    expect(screen.getByText(/Set sail/i)).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /submit your product/i }),
    ).toBeInTheDocument()
  })
})

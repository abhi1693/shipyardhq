import { describe, it, expect } from "vitest"
import React from "react"
import { render, screen } from "@testing-library/react"
import FeaturedBanner from "@/components/molecules/FeaturedBanner"

const baseItem: any = {
  product: {
    slug: "alpha",
    name: "Alpha",
    tagline: "The first",
    bannerImage: null,
  },
}

describe("FeaturedBanner", () => {
  it("renders fallback when no banner image", () => {
    render(<FeaturedBanner item={baseItem} />)
    // Fallback text contains the product name
    expect(screen.getAllByText("Alpha").length).toBeGreaterThan(1)
    // Link points to product page
    expect(screen.getByRole("link")).toHaveAttribute("href", "/products/alpha")
  })

  it("renders image when bannerImage present", () => {
    const item = {
      product: { ...baseItem.product, bannerImage: "/b.png" },
    } as any
    render(<FeaturedBanner item={item} />)
    // Next image mock renders <img> with alt name
    expect(screen.getByAltText("Alpha")).toBeInTheDocument()
  })
})

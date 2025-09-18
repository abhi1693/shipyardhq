import { describe, it, expect } from "vitest"
import React from "react"
import { render, screen } from "@testing-library/react"
import FeaturedTicker from "@/components/molecules/FeaturedTicker"

describe("FeaturedTicker", () => {
  it("returns null when no items", () => {
    const { container } = render(<FeaturedTicker items={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it("renders duplicated list of items with new spotlight styling", () => {
    const items = [
      { slug: "a", name: "Alpha", logo: "/a.png" },
      { slug: "b", name: "Beta", logo: "/b.png" },
      { slug: "c", name: "Gamma", logo: "/c.png" },
      { slug: "d", name: "Delta", logo: "/d.png" },
    ]
    render(<FeaturedTicker items={items} />)

    expect(screen.getByText(/Featured Today/i)).toBeInTheDocument()

    const links = screen.getAllByRole("link")
    // Duplicates the list for continuous scroll
    expect(links.length).toBe(8)
    expect(links[0]).toHaveAttribute("href", "/products/a")

    // Images rendered with alt text from product name
    expect(
      screen.getAllByAltText(/Alpha|Beta|Gamma|Delta/).length,
    ).toBeGreaterThanOrEqual(8)
  })
})

import { describe, it, expect } from "vitest"
import React from "react"
import { render } from "@testing-library/react"
import ProductGrid from "@/components/molecules/ProductGrid"

describe("ProductGrid topRight verified icon", () => {
  it("renders check icon when verification.isVerified is true", () => {
    const item: any = {
      id: "1",
      slug: "alpha",
      name: "Alpha",
      logo: "/a.png",
      tagline: "T",
      category: {},
      user: {},
      analytics: null,
      verification: { isVerified: true },
      ProductBadge: [],
    }
    render(
      <ProductGrid
        initialProducts={[item]}
        initialHasMore={false}
        searchParams={{}}
      />,
    )
    // Check icon from lucide should be present
    const icon = document.querySelector("svg.lucide.lucide-check")
    expect(icon).toBeTruthy()
  })
})

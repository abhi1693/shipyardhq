import { describe, it, expect } from "vitest"
import React from "react"
import { render, screen } from "@testing-library/react"
import { EditorsPick } from "@/components/organisms/EditorsPick"
import { FaqSection } from "@/components/organisms/FaqSection"

describe("EditorsPick", () => {
  it("returns null when no products", () => {
    const { container } = render(<EditorsPick products={[]} as any />)
    expect(container.firstChild).toBeNull()
  })

  it("renders header and grid when products provided", () => {
    const items = [
      {
        id: "fb1",
        product: {
          id: "p1",
          slug: "a",
          name: "A",
          logo: "/a.png",
          tagline: "tag",
          ProductBadge: [],
          analytics: { upvotes: 0 },
          user: { firstName: "E", lastName: "P" },
          category: { name: "Cat" },
        },
      },
    ]
    render(<EditorsPick products={items as any} />)
    expect(screen.getByText("Editor’s Picks")).toBeInTheDocument()
  })
})

describe("FaqSection", () => {
  it("renders all questions and answers", () => {
    render(<FaqSection />)
    expect(screen.getByText("Frequently Asked Questions")).toBeInTheDocument()
    expect(
      screen.getByText("Is it free to submit a product?"),
    ).toBeInTheDocument()
    expect(
      screen.getByText("Can I update my product after publishing?"),
    ).toBeInTheDocument()
  })
})

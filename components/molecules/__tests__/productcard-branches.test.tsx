import { describe, it, expect } from "vitest"
import React from "react"
import { render, screen } from "@testing-library/react"
import { ProductCard } from "@/components/molecules/ProductCard"

describe("ProductCard branch coverage", () => {
  const base = {
    id: "p1",
    slug: "p1",
    name: "Prod",
    logo: "/logo.png",
    tagline: "Tag",
  }

  it("shows +N badge indicator when more than 3 badges are provided", () => {
    const badges = ["featured", "trending", "new", "editor-pick", "unknown"]
    render(<ProductCard product={base} badges={badges} compact upvotes={1} />)
    expect(screen.getByText("+2")).toBeInTheDocument()
  })

  it("renders category chip and visible badge using compact design", () => {
    const badges = ["featured"]
    render(
      <ProductCard
        product={base}
        badges={badges}
        category="AI"
        compact={false}
        upvotes={3}
      />,
    )
    expect(screen.getByText("AI")).toBeInTheDocument()
    expect(screen.getByText("Featured")).toBeInTheDocument()
  })
})

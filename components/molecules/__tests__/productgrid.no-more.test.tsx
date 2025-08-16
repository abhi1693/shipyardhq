import { describe, it, expect, vi } from "vitest"
import React from "react"
import { render, screen } from "@testing-library/react"

vi.mock("@/components/molecules/ProductList", () => ({
  __esModule: true,
  default: ({ items }: any) => (
    <div data-testid="list-count">{items.length}</div>
  ),
}))

import ProductGrid from "@/components/molecules/ProductGrid"

describe("ProductGrid no more", () => {
  it("renders without Load More when initialHasMore is false", () => {
    const p1: any = {
      id: "1",
      title: "A",
      category: {},
      user: {},
      analytics: null,
      verification: null,
      ProductBadge: [],
    }
    render(
      <ProductGrid
        initialProducts={[p1]}
        initialHasMore={false}
        searchParams={{}}
      />,
    )
    expect(screen.getByTestId("list-count").textContent).toBe("1")
    expect(screen.queryByRole("button", { name: /load more/i })).toBeNull()
  })
})

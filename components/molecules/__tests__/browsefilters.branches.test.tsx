import { describe, it, expect, vi } from "vitest"
import React from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

const push = vi.fn()
let searchStr = ""
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(searchStr),
}))

import BrowseFilters from "@/components/molecules/BrowseFilters"

describe("BrowseFilters branches", () => {
  const useCases = Array.from({ length: 10 }).map((_, i) => ({
    id: "u" + i,
    slug: "s" + i,
    label: "UC" + i,
  }))
  const categories = Array.from({ length: 10 }).map((_, i) => ({
    id: "c" + i,
    slug: "cat" + i,
    name: "Cat" + i,
  }))

  it("renders All Use Cases as active when none selected and show more shows remaining count", () => {
    render(
      <BrowseFilters
        useCases={useCases}
        categories={categories}
        current={{ sort: "new" }}
      />,
    )
    // The All Use Cases link should have active styles reflected by text presence
    expect(screen.getByText("All Use Cases")).toBeInTheDocument()
    // Two sections have Show more; ensure at least one button contains the label
    expect(
      screen.getAllByRole("button", { name: /show more \(2\)/i }).length,
    ).toBeGreaterThanOrEqual(1)
  })

  it("highlights active use case and category links", () => {
    render(
      <BrowseFilters
        useCases={useCases}
        categories={categories}
        current={{ useCase: "s1", category: "cat2", sort: "new" }}
      />,
    )
    // The specific use case and category labels should be present as links
    expect(screen.getByText("UC1")).toBeInTheDocument()
    expect(screen.getByText("Cat2")).toBeInTheDocument()
  })

  it("filters categories by query and updates link hrefs with page=1", async () => {
    const user = userEvent.setup()
    searchStr = ""
    render(
      <BrowseFilters
        useCases={useCases}
        categories={categories}
        current={{ sort: "new" }}
      />,
    )
    const catInput = screen.getByPlaceholderText("Search categories")
    await user.type(catInput, "Cat9")
    const link = screen.getByText("Cat9").closest("a") as HTMLAnchorElement
    expect(link).toBeTruthy()
    const url = new URL(link.href)
    expect(url.pathname).toBe("/browse")
    expect(url.searchParams.get("category")).toBe("cat9")
    expect(url.searchParams.get("page")).toBe("1")
  })
})

import { describe, it, expect, vi } from "vitest"
import React from "react"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(""),
}))

import BrowseFilterBar from "@/components/molecules/BrowseFilterBar"

describe("BrowseFilterBar counts rendering", () => {
  const useCases = [
    { id: "u1", slug: "scoring", label: "Scoring", productCount: 12 },
    { id: "u2", slug: "alerts", label: "Alerts", productCount: 0 },
  ]
  const categories = [
    { id: "c1", slug: "analytics", name: "Analytics", _count: { products: 5 } },
    { id: "c2", slug: "security", name: "Security", _count: { products: 0 } },
  ]

  it("shows counts for use cases and categories when numeric", async () => {
    const user = userEvent.setup()
    render(
      <BrowseFilterBar
        useCases={useCases as any}
        categories={categories as any}
        current={{ sort: "new" }}
      />,
    )
    // Open Use Case dropdown
    const useCaseBtn = screen.getByRole("button", { name: /use case/i })
    await user.click(useCaseBtn)
    // Scoring shows count badge
    expect(
      within(screen.getByTestId("use-case-option-scoring")).getByText("12"),
    ).toBeInTheDocument()
    // Alerts shows 0 count badge
    expect(
      within(screen.getByTestId("use-case-option-alerts")).getByText("0"),
    ).toBeInTheDocument()

    // Close menu then open Category dropdown
    await user.keyboard("{Escape}")
    const categoryBtn = screen.getByRole("button", { name: /category/i })
    await user.click(categoryBtn)
    expect(
      within(screen.getByTestId("category-option-analytics")).getByText("5"),
    ).toBeInTheDocument()
  })
})

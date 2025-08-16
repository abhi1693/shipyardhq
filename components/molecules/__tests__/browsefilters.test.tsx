import { describe, it, expect, vi } from "vitest"
import React from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

const push = vi.fn()
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(""),
}))

import BrowseFilters from "@/components/molecules/BrowseFilters"

describe("BrowseFilters", () => {
  const useCases = Array.from({ length: 10 }).map((_, i) => ({
    id: "u" + i,
    slug: "s" + i,
    label: "UC" + i,
  }))
  const categories = [
    { id: "c1", slug: "cat1", name: "Cat1" },
    { id: "c2", slug: "cat2", name: "Cat2" },
  ]

  it("shows more/less toggler for use cases and filters by query", async () => {
    const user = userEvent.setup()
    render(
      <BrowseFilters
        useCases={useCases}
        categories={categories}
        current={{ sort: "new" }}
      />,
    )

    // Initially show more is visible (10 > 8)
    const more = screen.getByRole("button", { name: /show more/i })
    expect(more).toBeInTheDocument()
    await user.click(more)
    expect(
      screen.getByRole("button", { name: /show less/i }),
    ).toBeInTheDocument()

    // Type into use case search to filter
    const ucInput = screen.getByPlaceholderText("Search use cases")
    await user.type(ucInput, "UC9")
    // The filtered list should contain UC9 link
    expect(
      screen
        .getAllByRole("link")
        .some((a) => (a as HTMLAnchorElement).textContent?.includes("UC9")),
    ).toBe(true)
  })

  it("toggles Verified switch to push router", async () => {
    const user = userEvent.setup()
    render(
      <BrowseFilters
        useCases={useCases}
        categories={categories}
        current={{ verified: false, sort: "new" }}
      />,
    )
    const sw = document.querySelector('[data-slot="switch"]') as HTMLElement
    await user.click(sw)
    const call = (push as any).mock.calls[0][0] as string
    expect(call).toContain("/browse?")
    expect(call).toContain("verified=true")
    expect(call).toContain("page=1")
  })
})

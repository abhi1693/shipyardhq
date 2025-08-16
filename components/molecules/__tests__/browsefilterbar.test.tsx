import { describe, it, expect, vi } from "vitest"
import React from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

const push = vi.fn()
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(""),
}))

import BrowseFilterBar from "@/components/molecules/BrowseFilterBar"

describe("BrowseFilterBar", () => {
  const useCases = [{ id: "u1", slug: "scoring", label: "Scoring" }]
  const categories = [{ id: "c1", slug: "analytics", name: "Analytics" }]

  it("disables Use Case button when category active and shows current labels", () => {
    render(
      <BrowseFilterBar
        useCases={useCases}
        categories={categories}
        current={{ category: "analytics", sort: "new" }}
      />,
    )
    const buttons = screen.getAllByRole("button")
    // First button is Use Case (disabled when category selected)
    expect(buttons[0]).toBeDisabled()
    expect(buttons[0].textContent).toContain("Use Case")
    // Second button is Category with label when active
    expect(buttons[1].textContent).toContain("Analytics")
  })

  it("toggles Verified switch to push router with verified=true&page=1 and shows Clear all when filters active", async () => {
    const user = userEvent.setup()
    render(
      <BrowseFilterBar
        useCases={useCases}
        categories={categories}
        current={{ useCase: "scoring", verified: false, sort: "new" }}
      />,
    )
    // Switch is the element with data-slot="switch"
    const sw = document.querySelector('[data-slot="switch"]') as HTMLElement
    await user.click(sw)
    const call = (push as any).mock.calls[0][0] as string
    expect(call).toContain("/browse?")
    expect(call).toContain("verified=true")
    expect(call).toContain("page=1")

    // Clear all button appears when filters are active
    expect(
      screen.getByRole("button", { name: /clear all/i }),
    ).toBeInTheDocument()
    ;(push as any).mockClear()
    await user.click(screen.getByRole("button", { name: /clear all/i }))
    expect(push).toHaveBeenCalledWith("/browse")
  })
})

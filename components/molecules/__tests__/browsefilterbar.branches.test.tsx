import { describe, it, expect, vi, beforeEach } from "vitest"
import React from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

const push = vi.fn()
let searchStr = ""
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(searchStr),
}))

import BrowseFilterBar from "@/components/molecules/BrowseFilterBar"

const useCases = [{ id: "u1", slug: "scoring", label: "Scoring" }]
const categories = [{ id: "c1", slug: "analytics", name: "Analytics" }]

beforeEach(() => {
  push.mockReset()
  searchStr = ""
})

describe("BrowseFilterBar branches", () => {
  it("category link clears useCase and preserves sort", async () => {
    const user = userEvent.setup()
    searchStr = "useCase=scoring&sort=trending"
    render(
      <BrowseFilterBar
        useCases={useCases}
        categories={categories}
        current={{ sort: "trending" }}
      />,
    )
    // Open Category dropdown (second trigger)
    const triggers = document.querySelectorAll(
      '[data-slot="dropdown-menu-trigger"]',
    )
    await user.click(triggers[1] as HTMLElement)
    const link = screen.getByText("Analytics").closest("a") as HTMLAnchorElement
    const url = new URL(link.href)
    expect(url.pathname).toBe("/browse")
    const sp = url.searchParams
    expect(sp.get("category")).toBe("analytics")
    expect(sp.get("sort")).toBe("trending")
    expect(sp.get("page")).toBe("1")
    expect(sp.get("useCase")).toBeNull()
  })

  it("use case link clears category and sets page=1 only", async () => {
    const user = userEvent.setup()
    searchStr = "category=analytics"
    render(
      <BrowseFilterBar
        useCases={useCases}
        categories={categories}
        current={{ sort: "new" }}
      />,
    )
    // Open Use Case dropdown (first trigger)
    const triggers = document.querySelectorAll(
      '[data-slot="dropdown-menu-trigger"]',
    )
    await user.click(triggers[0] as HTMLElement)
    const link = screen.getByText("Scoring").closest("a") as HTMLAnchorElement
    const url = new URL(link.href)
    expect(url.pathname).toBe("/browse")
    const sp = url.searchParams
    expect(sp.get("useCase")).toBe("scoring")
    expect(sp.get("page")).toBe("1")
    expect(sp.get("category")).toBeNull()
  })

  it("verified toggle off clears param and resets page", async () => {
    const user = userEvent.setup()
    searchStr = "verified=true"
    render(
      <BrowseFilterBar
        useCases={useCases}
        categories={categories}
        current={{ verified: true, sort: "new" }}
      />,
    )
    const sw = document.querySelector('[data-slot="switch"]') as HTMLElement
    await user.click(sw)
    const call = (push as any).mock.calls[0][0] as string
    expect(call).toContain("/browse?")
    expect(call).not.toContain("verified=")
    expect(call).toContain("page=1")
  })

  it("no Clear all button when hasActiveFilters=false", () => {
    render(
      <BrowseFilterBar
        useCases={useCases}
        categories={categories}
        current={{ sort: "new" }}
      />,
    )
    expect(screen.queryByRole("button", { name: /clear all/i })).toBeNull()
  })
})

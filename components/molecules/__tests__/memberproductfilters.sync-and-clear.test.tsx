import { describe, it, expect, vi } from "vitest"
import React from "react"
import { render, screen } from "@testing-library/react"
import MemberProductFilters from "@/components/molecules/MemberProductFilters"

const push = vi.fn()
let searchStr = ""
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/member/products",
  useSearchParams: () => new URLSearchParams(searchStr),
}))

describe("MemberProductFilters q sync and Clear visibility", () => {
  it("syncs q from URL params into input value on mount and on param change", () => {
    searchStr = "q=alpha"
    const { rerender } = render(<MemberProductFilters />)
    expect(
      (screen.getByLabelText("Search products") as HTMLInputElement).value,
    ).toBe("alpha")

    // Change params and rerender -> input updates
    searchStr = "q=bravo"
    rerender(<MemberProductFilters />)
    expect(
      (screen.getByLabelText("Search products") as HTMLInputElement).value,
    ).toBe("bravo")
  })

  it("does not show Clear button when no filters active", () => {
    searchStr = "" // defaults: q empty, status/verification __all__, sort new
    render(<MemberProductFilters />)
    expect(screen.queryByRole("button", { name: "Clear" })).toBeNull()
  })
})

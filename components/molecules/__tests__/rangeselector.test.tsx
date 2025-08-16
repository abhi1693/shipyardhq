import { describe, it, expect, vi } from "vitest"
import React from "react"
import { render, screen } from "@testing-library/react"
import RangeSelector from "@/components/molecules/RangeSelector"

const push = vi.fn()
vi.mock("next/navigation", () => ({
  usePathname: () => "/stats",
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(""),
}))

describe("RangeSelector", () => {
  it("shows 7d active by default and pushes range on click", async () => {
    render(<RangeSelector />)
    const buttons = screen.getAllByRole("button")
    expect(buttons[0].textContent).toBe("7d")
    // Default active button uses non-ghost variant class; check has text-white class from style
    expect(buttons[0].className).toContain("text-white")

    await buttons[1].click()
    expect(push).toHaveBeenCalledWith("/stats?range=30d")
  })

  it("removes range param when selecting 7d", async () => {
    ;(push as any).mockClear()
    // Mock search params to have 90d selected
    ;(vi as any).mocked = true
    vi.doMock("next/navigation", () => ({
      usePathname: () => "/stats",
      useRouter: () => ({ push }),
      useSearchParams: () => new URLSearchParams("range=90d"),
    }))
    const { unmount } = render(<RangeSelector />)
    const btn7 = screen.getAllByRole("button")[0]
    await btn7.click()
    expect(push).toHaveBeenCalledWith("/stats?")
    unmount()
  })
})

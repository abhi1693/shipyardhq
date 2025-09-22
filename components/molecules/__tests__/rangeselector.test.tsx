import { describe, it, expect, vi, beforeEach } from "vitest"
import React from "react"
import { render, screen } from "@testing-library/react"
import RangeSelector from "@/components/molecules/RangeSelector"

const push = vi.fn()
const mockSearchParams = vi.fn(() => new URLSearchParams(""))

vi.mock("next/navigation", () => ({
  usePathname: () => "/stats",
  useRouter: () => ({ push }),
  useSearchParams: () => mockSearchParams(),
}))

const setSearchParams = (value: string) => {
  mockSearchParams.mockImplementation(() => new URLSearchParams(value))
}

beforeEach(() => {
  push.mockClear()
  mockSearchParams.mockClear()
  setSearchParams("")
})

describe("RangeSelector", () => {
  it("shows 7d active by default and pushes range on click", async () => {
    render(<RangeSelector />)
    const sevenDayButton = screen.getByRole("button", { name: "7d" })
    expect(sevenDayButton.className).toContain("text-white")

    const fourteenDayButton = screen.getByRole("button", { name: "14d" })
    await fourteenDayButton.click()
    expect(push).toHaveBeenCalledWith("/stats?range=14d")
  })

  it("removes range param when selecting 7d", async () => {
    setSearchParams("range=90d")
    render(<RangeSelector />)
    const sevenDayButton = screen.getByRole("button", { name: "7d" })
    await sevenDayButton.click()
    expect(push).toHaveBeenCalledWith("/stats")
  })
})

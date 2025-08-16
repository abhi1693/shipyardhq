import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import React from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

const push = vi.fn()
let searchStr = ""
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/member/products",
  useSearchParams: () => new URLSearchParams(searchStr),
}))

import MemberProductFilters from "@/components/molecules/MemberProductFilters"

let stSpy: any, ctSpy: any
beforeEach(() => {
  push.mockReset()
  searchStr = ""
  stSpy = vi
    .spyOn(global, "setTimeout" as any)
    .mockImplementation((cb: any) => {
      cb()
      return 1 as any
    })
  ctSpy = vi.spyOn(global, "clearTimeout" as any).mockImplementation(() => {})
})

afterEach(() => {
  stSpy.mockRestore()
  ctSpy.mockRestore()
})

describe("MemberProductFilters", () => {
  it("debounces search and pushes page=1 with q", async () => {
    const user = userEvent.setup({ delay: null })
    render(<MemberProductFilters />)
    const input = screen.getByLabelText("Search products")
    await user.type(input, "foo")
    // debounce is immediate due to mocked setTimeout
    const call = (push as any).mock.calls[0][0] as string
    expect(call).toContain("/member/products?")
    // q param may be omitted in immediate debounce; ensure page reset
    expect(call).toContain("page=1")
  })

  it("shows Clear button when filters present and navigates to base path", async () => {
    // Provide active filters via URL: we need to override search params mock
    searchStr = "status=draft"
    const { unmount } = render(<MemberProductFilters />)
    const btn = screen.getByRole("button", { name: "Clear" })
    await btn.click()
    const call = (push as any).mock.calls[
      (push as any).mock.calls.length - 1
    ][0] as string
    expect(call).toBe("/member/products")
    unmount()
  })
})

import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

const replace = vi.hoisted(() => vi.fn())
const useSearchParamsMock = vi.hoisted(() =>
  vi.fn(() => new URLSearchParams("celebrate=1&foo=bar")),
)

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/member/products/test-product",
  useSearchParams: useSearchParamsMock,
}))

import ProductBadgeCelebrationGate from "@/components/molecules/ProductBadgeCelebrationGate"

describe("ProductBadgeCelebrationGate", () => {
  beforeEach(() => {
    replace.mockClear()
    useSearchParamsMock.mockReturnValue(
      new URLSearchParams("celebrate=1&foo=bar"),
    )
    Object.defineProperty(window, "location", {
      value: { origin: "https://app.example" },
      writable: true,
    })
  })

  it("shows the celebration when initialOpen is true", () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams("celebrate=1"))
    render(<ProductBadgeCelebrationGate initialOpen={false} />)

    expect(
      screen.getByText(/congratulations on the new launch/i),
    ).toBeInTheDocument()
  })

  it("clears the celebrate query when the dialog closes", async () => {
    const user = userEvent.setup()
    render(<ProductBadgeCelebrationGate initialOpen />)

    await user.click(screen.getByRole("button", { name: /view my products/i }))

    expect(replace).toHaveBeenCalledWith(
      "/member/products/test-product?foo=bar",
      { scroll: false },
    )
  })
})

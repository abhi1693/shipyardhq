import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

const replace = vi.fn()
const searchParams = new URLSearchParams("foo=bar")

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/member/products/test-product",
  useSearchParams: () => searchParams,
}))

import ProductBadgeCelebrationTrigger from "@/components/molecules/ProductBadgeCelebrationTrigger"

describe("ProductBadgeCelebrationTrigger", () => {
  it("adds the celebrate query and replaces the URL", async () => {
    const user = userEvent.setup()
    render(<ProductBadgeCelebrationTrigger />)

    await user.click(screen.getByRole("button", { name: /get badge/i }))

    expect(replace).toHaveBeenCalledWith(
      "/member/products/test-product?foo=bar&celebrate=1",
      { scroll: false },
    )
  })
})

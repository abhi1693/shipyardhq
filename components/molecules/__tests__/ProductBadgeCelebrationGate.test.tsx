import { act, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/components/molecules/ProductBadgeCelebrationDialog", () => ({
  __esModule: true,
  default: ({
    open,
    onOpenChange,
    productPublicPath,
  }: {
    open: boolean
    onOpenChange: (nextOpen: boolean) => void
    productPublicPath?: string
  }) =>
    open ? (
      <div data-testid="badge-dialog" data-path={productPublicPath ?? ""}>
        <button type="button" onClick={() => onOpenChange(false)}>
          Close dialog
        </button>
      </div>
    ) : null,
}))

import {
  BADGE_CELEBRATION_EVENT,
  default as ProductBadgeCelebrationGate,
} from "@/components/molecules/ProductBadgeCelebrationGate"

const TEST_URL = "/member/products/test?foo=bar"
const PUBLIC_PATH = "/products/test"

describe("ProductBadgeCelebrationGate", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", TEST_URL)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    window.history.replaceState(null, "", TEST_URL)
  })

  it("shows the celebration when initialOpen is true", async () => {
    render(
      <ProductBadgeCelebrationGate
        initialOpen
        productPublicPath={PUBLIC_PATH}
      />,
    )

    const dialog = await screen.findByTestId("badge-dialog")
    expect(dialog).toBeInTheDocument()
    expect(dialog).toHaveAttribute("data-path", PUBLIC_PATH)
    await waitFor(() => {
      expect(window.location.search).toContain("celebrate=1")
    })
  })

  it("opens the dialog and sets the query when the event fires", async () => {
    render(
      <ProductBadgeCelebrationGate
        initialOpen={false}
        productPublicPath={PUBLIC_PATH}
      />,
    )

    act(() => {
      window.dispatchEvent(new CustomEvent(BADGE_CELEBRATION_EVENT))
    })

    const dialog = await screen.findByTestId("badge-dialog")
    expect(dialog).toBeInTheDocument()
    expect(dialog).toHaveAttribute("data-path", PUBLIC_PATH)
    await waitFor(() => {
      expect(window.location.search).toContain("celebrate=1")
    })
  })

  it("clears the celebrate query when the dialog closes", async () => {
    const user = userEvent.setup()
    render(
      <ProductBadgeCelebrationGate
        initialOpen
        productPublicPath={PUBLIC_PATH}
      />,
    )

    await screen.findByTestId("badge-dialog")

    await user.click(screen.getByRole("button", { name: /close dialog/i }))

    await waitFor(() => {
      expect(window.location.search).not.toContain("celebrate")
    })
  })
})

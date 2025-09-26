import { act, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/components/molecules/ProductBadgeCelebrationDialog", () => ({
  __esModule: true,
  default: ({
    open,
    onOpenChange,
  }: {
    open: boolean
    onOpenChange: (nextOpen: boolean) => void
  }) =>
    open ? (
      <div data-testid="badge-dialog">
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

describe("ProductBadgeCelebrationGate", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", TEST_URL)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    window.history.replaceState(null, "", TEST_URL)
  })

  it("shows the celebration when initialOpen is true", async () => {
    render(<ProductBadgeCelebrationGate initialOpen />)

    expect(await screen.findByTestId("badge-dialog")).toBeInTheDocument()
    await waitFor(() => {
      expect(window.location.search).toContain("celebrate=1")
    })
  })

  it("opens the dialog and sets the query when the event fires", async () => {
    render(<ProductBadgeCelebrationGate initialOpen={false} />)

    act(() => {
      window.dispatchEvent(new CustomEvent(BADGE_CELEBRATION_EVENT))
    })

    expect(await screen.findByTestId("badge-dialog")).toBeInTheDocument()
    await waitFor(() => {
      expect(window.location.search).toContain("celebrate=1")
    })
  })

  it("clears the celebrate query when the dialog closes", async () => {
    const user = userEvent.setup()
    render(<ProductBadgeCelebrationGate initialOpen />)

    await screen.findByTestId("badge-dialog")

    await user.click(screen.getByRole("button", { name: /close dialog/i }))

    await waitFor(() => {
      expect(window.location.search).not.toContain("celebrate")
    })
  })
})

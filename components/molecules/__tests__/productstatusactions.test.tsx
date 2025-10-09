import { describe, it, expect, vi, beforeEach } from "vitest"
import React from "react"
import { render, screen, within, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

const refresh = vi.fn()
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock("@/actions/admin/products/actions", () => ({
  setProductStatusAction: vi.fn(),
}))

import ProductStatusActions from "@/components/molecules/ProductStatusActions"
import { toast } from "sonner"
import * as actions from "@/actions/admin/products/actions"

beforeEach(() => {
  refresh.mockReset()
  ;(toast.success as any).mockReset()
  ;(toast.error as any).mockReset()
  ;(actions.setProductStatusAction as any).mockReset()
})

describe("ProductStatusActions", () => {
  it("shows correct buttons for draft and updates to published", async () => {
    ;(actions.setProductStatusAction as any).mockResolvedValueOnce({})
    ;(actions.setProductStatusAction as any).mockResolvedValueOnce({})
    render(<ProductStatusActions productId="p1" status="draft" />)
    const user = userEvent.setup()
    // Publish and Archive present; Unpublish absent
    expect(screen.getByRole("button", { name: /publish/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /archive/i })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /unpublish/i })).toBeNull()
    await user.click(screen.getByRole("button", { name: /publish/i }))
    await waitFor(() =>
      expect(actions.setProductStatusAction).toHaveBeenCalledWith(
        "p1",
        "published",
      ),
    )
    // success toast and refresh called
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Status set to published"),
    )
    expect(refresh).toHaveBeenCalled()
  })

  it("archives from draft when Archive is clicked", async () => {
    ;(actions.setProductStatusAction as any).mockResolvedValueOnce({})
    render(<ProductStatusActions productId="p1" status="draft" />)
    const user = userEvent.setup()
    await user.click(screen.getByRole("button", { name: /archive/i }))
    const dialog = screen.getByRole("dialog")
    await user.click(within(dialog).getByRole("button", { name: /archive/i }))
    await waitFor(() =>
      expect(actions.setProductStatusAction).toHaveBeenCalledWith(
        "p1",
        "archived",
      ),
    )
  })

  it("shows correct buttons for published and handles error", async () => {
    ;(actions.setProductStatusAction as any).mockResolvedValueOnce({
      error: "nope",
    })
    render(<ProductStatusActions productId="p1" status="published" />)
    const user = userEvent.setup()
    expect(
      screen.getByRole("button", { name: /unpublish/i }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: /unpublish/i }))
    const dialog = screen.getByRole("dialog")
    await user.click(within(dialog).getByRole("button", { name: /unpublish/i }))
    await waitFor(() =>
      expect(actions.setProductStatusAction).toHaveBeenCalledWith(
        "p1",
        "draft",
      ),
    )
    expect(toast.error).toHaveBeenCalled()
    expect(refresh).toHaveBeenCalled()
  })

  it("shows correct buttons for archived", async () => {
    ;(actions.setProductStatusAction as any).mockResolvedValueOnce({})
    render(<ProductStatusActions productId="p1" status="archived" />)
    const user = userEvent.setup()
    expect(
      screen.getByRole("button", { name: /unarchive/i }),
    ).toBeInTheDocument()
    // Archive hidden when archived
    expect(screen.queryByRole("button", { name: /^Archive$/i })).toBeNull()

    // Unarchive transitions back to draft
    await user.click(screen.getByRole("button", { name: /unarchive/i }))
    const dialog = screen.getByRole("dialog")
    await user.click(within(dialog).getByRole("button", { name: /restore/i }))
    await waitFor(() =>
      expect(actions.setProductStatusAction).toHaveBeenCalledWith(
        "p1",
        "draft",
      ),
    )
  })
})

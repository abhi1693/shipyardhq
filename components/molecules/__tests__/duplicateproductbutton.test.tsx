import { describe, it, expect, vi } from "vitest"
import React from "react"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

// Mock action and router
vi.mock("@/actions/admin/products/actions", () => ({
  duplicateProductAction: vi.fn(async (_id: string) => ({ slug: "new-slug" })),
}))
const push = vi.fn()
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}))

import DuplicateProductButton from "@/components/molecules/DuplicateProductButton"

describe("DuplicateProductButton", () => {
  it("handles success and error states", async () => {
    const { toast } = await import("sonner")
    vi.spyOn(toast, "success")
    vi.spyOn(toast, "error")
    const actions = await import("@/actions/admin/products/actions")

    render(<DuplicateProductButton productId="p1" />)
    const user = userEvent.setup()
    const btn = screen.getByRole("button", { name: /duplicate/i })

    // Success path
    ;(actions.duplicateProductAction as any).mockResolvedValueOnce({
      slug: "copy",
    })
    await user.click(btn)
    await waitFor(() => expect(toast.success).toHaveBeenCalled())
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith("/member/products/copy/edit"),
    )

    // Error path
    ;(actions.duplicateProductAction as any).mockResolvedValueOnce({
      error: "No",
    })
    await user.click(btn)
    await waitFor(() => expect(toast.error).toHaveBeenCalled())
  })
})

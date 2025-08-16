import { describe, it, expect, vi } from "vitest"
import React from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { AlertModal } from "@/components/atoms/alert-modal"

describe("AlertModal", () => {
  it("opens via trigger and confirms action", async () => {
    const onConfirm = vi.fn()
    const user = userEvent.setup()

    render(
      <AlertModal
        trigger={(open) => <button onClick={open}>Open</button>}
        onConfirm={onConfirm}
        title="Confirm Delete"
        description="This cannot be undone."
        confirmText="Delete"
      />,
    )

    await user.click(screen.getByRole("button", { name: "Open" }))
    // Modal content shows
    expect(await screen.findByText("Confirm Delete")).toBeInTheDocument()
    expect(screen.getByText("This cannot be undone.")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: /delete/i }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })
})

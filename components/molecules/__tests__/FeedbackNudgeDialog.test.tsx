import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import FeedbackNudgeDialog from "../FeedbackNudgeDialog"

describe("FeedbackNudgeDialog", () => {
  it("renders the nudge copy when open", () => {
    render(
      <FeedbackNudgeDialog open onOpenChange={() => {}} onAddMore={() => {}} />,
    )

    expect(screen.getByText(/have a few more thoughts/i)).toBeInTheDocument()
    expect(screen.getByText(/another quick entry/i)).toBeInTheDocument()
  })

  it("prompts the caller to open the form again", async () => {
    const onOpenChange = vi.fn()
    const onAddMore = vi.fn()
    const user = userEvent.setup()

    render(
      <FeedbackNudgeDialog
        open
        onOpenChange={onOpenChange}
        onAddMore={onAddMore}
      />,
    )

    await user.click(
      screen.getByRole("button", { name: /share another idea/i }),
    )

    expect(onAddMore).toHaveBeenCalledTimes(1)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("allows the user to dismiss without extra feedback", async () => {
    const onOpenChange = vi.fn()
    const onAddMore = vi.fn()
    const user = userEvent.setup()

    render(
      <FeedbackNudgeDialog
        open
        onOpenChange={onOpenChange}
        onAddMore={onAddMore}
      />,
    )

    await user.click(screen.getByRole("button", { name: /maybe later/i }))

    expect(onAddMore).not.toHaveBeenCalled()
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})

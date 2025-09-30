import { act, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import AnalyticsFeedbackPrompt from "../AnalyticsFeedbackPrompt"
import { MEMBER_FEEDBACK_PATH } from "@/lib/routes"

const pushMock = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}))

describe("AnalyticsFeedbackPrompt", () => {
  beforeEach(() => {
    pushMock.mockReset()
    try {
      window.sessionStorage.clear()
    } catch {
      // ignore in environments without sessionStorage
    }
    vi.useRealTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("auto-opens after the configured delay when not dismissed", async () => {
    vi.useFakeTimers()

    render(
      <AnalyticsFeedbackPrompt
        storageKey="test-analytics-nudge"
        autoOpenDelayMs={75}
        title="Auto-open test"
      />,
    )

    expect(screen.queryByText("Auto-open test")).not.toBeInTheDocument()

    await act(async () => {
      vi.advanceTimersByTime(100)
    })

    expect(screen.getByText("Auto-open test")).toBeInTheDocument()
  })

  it("navigates to the feedback form when the user accepts the nudge", async () => {
    const user = userEvent.setup()

    render(
      <AnalyticsFeedbackPrompt
        storageKey="test-analytics-share"
        autoOpenDelayMs={9999}
        title="Share analytics feedback"
        primaryLabel="Go share feedback"
        buttonLabel="Open analytics feedback"
      />,
    )

    await user.click(
      screen.getByRole("button", { name: "Open analytics feedback" }),
    )

    expect(
      screen.getByText("Share analytics feedback"),
    ).toBeInTheDocument()

    await user.click(
      screen.getByRole("button", { name: "Go share feedback" }),
    )

    expect(pushMock).toHaveBeenCalledWith(MEMBER_FEEDBACK_PATH)
    await waitFor(() =>
      expect(
        screen.queryByText("Share analytics feedback"),
      ).not.toBeInTheDocument(),
    )
    expect(window.sessionStorage.getItem("test-analytics-share")).toBe(
      "dismissed",
    )
  })

  it("does not auto-open again after dismissal", async () => {
    window.sessionStorage.setItem("test-analytics-done", "dismissed")
    vi.useFakeTimers()

    render(
      <AnalyticsFeedbackPrompt
        storageKey="test-analytics-done"
        autoOpenDelayMs={50}
        title="Should stay hidden"
      />,
    )

    act(() => {
      vi.advanceTimersByTime(200)
    })

    expect(screen.queryByText("Should stay hidden")).not.toBeInTheDocument()
  })
})

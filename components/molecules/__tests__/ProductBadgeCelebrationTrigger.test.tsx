import { afterEach, describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { BADGE_CELEBRATION_EVENT } from "@/components/molecules/ProductBadgeCelebrationGate"
import ProductBadgeCelebrationTrigger from "@/components/molecules/ProductBadgeCelebrationTrigger"

describe("ProductBadgeCelebrationTrigger", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("dispatches the celebration event", async () => {
    const user = userEvent.setup()
    const dispatchSpy = vi.spyOn(window, "dispatchEvent")

    render(<ProductBadgeCelebrationTrigger />)

    await user.click(screen.getByRole("button", { name: /get badge/i }))

    expect(dispatchSpy).toHaveBeenCalled()
    const dispatchedEvent = dispatchSpy.mock.calls.at(-1)?.[0]
    expect(dispatchedEvent).toBeInstanceOf(CustomEvent)
    expect(dispatchedEvent?.type).toBe(BADGE_CELEBRATION_EVENT)
  })
})

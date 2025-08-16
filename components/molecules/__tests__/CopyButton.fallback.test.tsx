import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import React from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import CopyButton from "@/components/molecules/CopyButton"

// Mock toast from sonner
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe("CopyButton copy paths", () => {
  const originalNavigator = global.navigator
  const originalExec = (document as any).execCommand
  const originalLocation = window.location

  beforeEach(() => {
    // Ensure no modern clipboard API so we hit fallback path
    global.navigator = { ...originalNavigator, clipboard: undefined } as any
    Object.defineProperty(window, "location", {
      value: { origin: "https://example.com" },
      writable: true,
    })
  })

  afterEach(() => {
    // Restore globals
    global.navigator = originalNavigator as any
    ;(document as any).execCommand = originalExec
    // @ts-expect-error test restore
    window.location = originalLocation
    vi.restoreAllMocks()
  })

  it("uses fallback execCommand to copy successfully", async () => {
    ;(document as any).execCommand = vi.fn().mockReturnValue(true)

    render(<CopyButton text="/p/xyz" resolveAbsolute label="Copy" />)
    const user = userEvent.setup()
    await user.click(screen.getByRole("button", { name: "Copy" }))

    // Button label flips to Copied when successful
    expect(await screen.findByText("Copied")).toBeInTheDocument()
  })

  it("uses modern clipboard API and resolves absolute when requested", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator as any, "clipboard", {
      value: { writeText },
      configurable: true,
    })
    Object.defineProperty(window, "location", {
      value: { origin: "https://example.com" },
      writable: true,
    })

    render(<CopyButton text="/p/abc" resolveAbsolute label="Copy" />)
    const user = userEvent.setup()
    await user.click(screen.getByRole("button", { name: "Copy" }))
    expect(await screen.findByText("Copied")).toBeInTheDocument()
  })
})

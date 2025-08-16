import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import React from "react"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import CopyButton from "@/components/molecules/CopyButton"

// Mock toast from sonner to observe success/error paths
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe("CopyButton branch coverage", () => {
  // placeholder to keep globals consistent in some environments
  const origExec = (document as any).execCommand
  let restoreLocation: any

  beforeEach(() => {
    // Ensure modern path is disabled unless explicitly enabled in a test
    // Hard-stub navigator to undefined so modern path is skipped
    vi.stubGlobal("navigator", undefined as any)
    // fresh execCommand baseline
    ;(document as any).execCommand = undefined
    // Keep a restorable location descriptor
    const current = Object.getOwnPropertyDescriptor(window, "location")
    restoreLocation = current
    Object.defineProperty(window, "location", {
      value: { origin: "https://example.com" },
      configurable: true,
      writable: true,
    })
  })

  afterEach(() => {
    // Restore globals
    vi.unstubAllGlobals()
    ;(document as any).execCommand = origExec
    if (restoreLocation)
      Object.defineProperty(window, "location", restoreLocation)
    vi.restoreAllMocks()
  })

  it("falls back to execCommand when modern API unavailable", async () => {
    ;(document as any).execCommand = vi.fn().mockReturnValue(true)
    // Ensure writeText is truly absent
    // navigator is undefined from stub; ensures fallback

    render(<CopyButton text="/p/xyz" resolveAbsolute label="Copy" />)
    fireEvent.click(screen.getByRole("button", { name: "Copy" }))

    // Button label flips to Copied when successful
    expect(await screen.findByText("Copied")).toBeInTheDocument()
    expect((document as any).execCommand).toHaveBeenCalledWith("copy")
  })

  it("emits error toast when both modern and fallback copy fail", async () => {
    // Disable modern and make fallback return false
    ;(document as any).execCommand = vi.fn().mockReturnValue(false)
    // navigator is undefined from stub; ensures fallback
    const { toast } = await import("sonner")

    render(<CopyButton text="/p/fail" resolveAbsolute label="Copy" />)
    fireEvent.click(screen.getByRole("button", { name: "Copy" }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Copy failed")
    })
  })

  it("uses default text path when resolveAbsolute is false", async () => {
    ;(document as any).execCommand = vi.fn().mockReturnValue(true)
    render(<CopyButton text="/p/def" label="Copy" />)
    fireEvent.click(screen.getByRole("button", { name: "Copy" }))
    expect(await screen.findByText("Copied")).toBeInTheDocument()
  })

  it("handles fallback try/catch failure and emits error", async () => {
    const origCreate = document.createElement
    const { toast } = await import("sonner")
    render(<CopyButton text="/p/err" resolveAbsolute label="Copy" />)
    // Make DOM operations throw inside fallbackCopy (after initial render)
    document.createElement = vi.fn(() => {
      throw new Error("nope")
    }) as any
    fireEvent.click(screen.getByRole("button", { name: "Copy" }))
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Copy failed")
    })
    document.createElement = origCreate
  })

  it("hits resolveAbsolute catch and still copies", async () => {
    ;(document as any).execCommand = vi.fn().mockReturnValue(true)
    const desc = Object.getOwnPropertyDescriptor(window, "location")
    Object.defineProperty(window, "location", {
      get() {
        throw new Error("blocked")
      },
      configurable: true,
    } as any)
    render(<CopyButton text="/p/catch" resolveAbsolute label="Copy" />)
    fireEvent.click(screen.getByRole("button", { name: "Copy" }))
    expect(await screen.findByText("Copied")).toBeInTheDocument()
    if (desc) Object.defineProperty(window, "location", desc)
  })

  // Note: resolveAbsolute catch branch is difficult to simulate reliably across jsdom versions.
  // The two tests above exercise the success path (fallback) and the error toast path.
})

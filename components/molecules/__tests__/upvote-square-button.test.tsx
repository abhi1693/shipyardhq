import { describe, it, expect, vi } from "vitest"
import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"

describe("UpvoteSquareButton", () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.resetModules()
    fetchMock.mockReset()
    vi.stubGlobal("fetch", fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("wraps with tooltip and disables when signed out", async () => {
    vi.doMock("@clerk/nextjs", () => ({
      useUser: () => ({ isSignedIn: false }),
    }))
    const { default: UpvoteSquareButton } = await import(
      "@/components/molecules/UpvoteSquareButton"
    )
    render(
      <UpvoteSquareButton
        productId="p1"
        initialCount={5}
        initialUpvoted={false}
        title="Vote"
      />,
    )
    // Wrapped with tooltip trigger wrapper
    expect(document.querySelector('[data-slot="tooltip-trigger"]')).toBeTruthy()
    // Button is disabled
    expect(screen.getByRole("button")).toBeDisabled()
  })

  it("submits form action and updates count when signed in", async () => {
    vi.doMock("@clerk/nextjs", () => ({
      useUser: () => ({ isSignedIn: true }),
    }))
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ upvotes: 2, upvoted: true }),
    } as Response)
    const { default: UpvoteSquareButton } = await import(
      "@/components/molecules/UpvoteSquareButton"
    )
    render(
      <UpvoteSquareButton
        productId="p1"
        initialCount={1}
        initialUpvoted={false}
      />,
    )
    // Initial count
    expect(screen.getByText("1")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button"))
    await waitFor(() => expect(screen.getByText("2")).toBeInTheDocument())
    expect(fetchMock).toHaveBeenCalledWith("/api/products/p1/upvote", {
      method: "POST",
    })
  })
})

import { describe, it, expect, vi } from "vitest"
import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"

describe("UpvoteSquareButton", () => {
  const action = vi.fn(async (prev: { upvotes: number; upvoted: boolean }) => ({
    upvotes: prev.upvotes + (prev.upvoted ? -1 : 1),
    upvoted: !prev.upvoted,
  }))

  it("wraps with tooltip and disables when signed out", async () => {
    vi.resetModules()
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
        action={action}
      />,
    )
    // Wrapped with tooltip trigger wrapper
    expect(document.querySelector('[data-slot="tooltip-trigger"]')).toBeTruthy()
    // Button is disabled
    expect(screen.getByRole("button")).toBeDisabled()
  })

  it("submits form action and updates count when signed in", async () => {
    vi.resetModules()
    vi.doMock("@clerk/nextjs", () => ({
      useUser: () => ({ isSignedIn: true }),
    }))
    const { default: UpvoteSquareButton } = await import(
      "@/components/molecules/UpvoteSquareButton"
    )
    render(
      <UpvoteSquareButton
        productId="p1"
        initialCount={1}
        initialUpvoted={false}
        action={action}
      />,
    )
    // Initial count
    expect(screen.getByText("1")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button"))
    await waitFor(() => expect(screen.getByText("2")).toBeInTheDocument())
  })
})

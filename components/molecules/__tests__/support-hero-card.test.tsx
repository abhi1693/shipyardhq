import { describe, it, expect, vi, beforeEach } from "vitest"
import React from "react"
import { render, screen } from "@testing-library/react"

vi.mock("@/components/molecules/UpvoteSquareButton", () => ({
  __esModule: true,
  default: ({ productId }: { productId: string }) => (
    <div data-testid="upvote-square-button">button:{productId}</div>
  ),
}))

describe("SupportHeroCard", () => {
  const baseProps = {
    productId: "prod_123",
    productName: "Launch Compass",
    initialCount: 42,
    initialUpvoted: false,
    action: vi.fn(),
  }

  beforeEach(() => {
    vi.resetModules()
  })

  it("highlights support message for signed in viewers", async () => {
    const { SupportHeroCard } = await import(
      "@/components/molecules/SupportHeroCard"
    )
    render(<SupportHeroCard {...baseProps} isSignedIn />)

    expect(screen.getByText(/support this product/i)).toBeInTheDocument()
    expect(
      screen.getByText(/cheer this crew on to keep their launch on the radar/i),
    ).toBeInTheDocument()
    expect(screen.getByTestId("upvote-square-button")).toHaveTextContent(
      "button:prod_123",
    )
  })

  it("nudges signed out viewers to sign in", async () => {
    const { SupportHeroCard } = await import(
      "@/components/molecules/SupportHeroCard"
    )
    render(<SupportHeroCard {...baseProps} isSignedIn={false} />)

    expect(
      screen.getByText(
        /sign in to add your vote and help this launch get discovered/i,
      ),
    ).toBeInTheDocument()
  })
})

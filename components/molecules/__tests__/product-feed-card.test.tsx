import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"

vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({ isSignedIn: false }),
}))

vi.mock("@/components/molecules/UpvoteSquareButton", () => ({
  __esModule: true,
  default: ({ children }: any) => (
    <button data-testid="mock-upvote" type="button">
      {children ?? "Upvote"}
    </button>
  ),
}))

import ProductFeedCard from "@/components/molecules/ProductFeedCard"
import type { HomepageFeedItem } from "@/actions/public/homepage/feed"

const baseItem: HomepageFeedItem = {
  id: "prod_1",
  slug: "first-product",
  name: "First Product",
  logo: "/logo.png",
  tagline: "A helpful description for the first product.",
  badges: [],
  category: "Automation",
  categorySlug: "automation",
  voteCount: 42,
  isSponsored: false,
  isVoted: false,
}

describe("ProductFeedCard", () => {
  it("renders product details with default state", () => {
    render(<ProductFeedCard item={baseItem} />)

    expect(screen.getByText("First Product")).toBeInTheDocument()
    expect(
      screen.getByText("A helpful description for the first product."),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("link", { name: "Automation" }),
    ).toHaveAttribute("href", "/browse?category=automation")

    expect(screen.queryByText("Sponsored")).not.toBeInTheDocument()

    expect(screen.getByTestId("mock-upvote")).toBeInTheDocument()
    expect(screen.getByText(/builders watching/i)).toBeInTheDocument()
  })

  it("shows badges and sponsored styling when supplied", () => {
    const item: HomepageFeedItem = {
      ...baseItem,
      badges: ["Trending", "Featured"],
      isSponsored: true,
    }

    render(<ProductFeedCard item={item} />)

    expect(screen.getByText(/Trending/i)).toBeInTheDocument()
    expect(screen.getByText("Featured")).toBeInTheDocument()
    expect(screen.getByText("Sponsored")).toBeInTheDocument()
  })
})

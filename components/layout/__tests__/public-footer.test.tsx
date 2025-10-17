import { render, screen } from "@testing-library/react"
import PublicFooter from "@/components/layout/footers/public-footer"
import {
  BROWSE_PATH,
  LEADERBOARD_PATH,
  MEMBER_PRODUCTS_PATH,
  PRICING_PATH,
  RANK_IN_PUBLIC_PATH,
} from "@/lib/routes"

describe("PublicFooter", () => {
  it("renders brand, nav links and CTA", () => {
    render(<PublicFooter />)

    // Brand logo/text
    expect(screen.getAllByAltText(/^ShipYardHQ$/i).length).toBeGreaterThan(0)

    // CTA buttons
    expect(
      screen.getByRole("link", { name: /Submit your launch/i }),
    ).toHaveAttribute("href", MEMBER_PRODUCTS_PATH)
    expect(
      screen.getByRole("link", { name: /Book a spotlight tour/i }),
    ).toHaveAttribute("href", PRICING_PATH)

    // A few representative links
    expect(screen.getByRole("link", { name: /All Products/i })).toHaveAttribute(
      "href",
      BROWSE_PATH,
    )
    expect(screen.getByRole("link", { name: /Leaderboard/i })).toHaveAttribute(
      "href",
      LEADERBOARD_PATH,
    )
    expect(
      screen.getByRole("link", { name: /Rank in Public/i }),
    ).toHaveAttribute("href", RANK_IN_PUBLIC_PATH)
    expect(screen.getByRole("link", { name: /Privacy/i })).toHaveAttribute(
      "href",
      "/legal/privacy-policy",
    )
  })

  it("shows the current year in the copyright", () => {
    render(<PublicFooter />)
    const year = new Date().getFullYear().toString()
    expect(
      screen.getByText(new RegExp(`©\\s+${year}\\s+ShipYardHQ`, "i")),
    ).toBeInTheDocument()
  })
})

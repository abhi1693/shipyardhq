import { render, screen } from "@testing-library/react"
import PublicFooter from "@/components/layout/footers/public-footer"

describe("PublicFooter", () => {
  it("renders brand, nav links and CTA", () => {
    render(<PublicFooter />)

    // Brand logo/text
    const logos = screen.getAllByAltText(/ShipYardHQ/i)
    expect(logos).toHaveLength(2)

    // CTA button
    expect(
      screen.getByRole("button", { name: /Explore Products/i }),
    ).toBeInTheDocument()

    // A few representative links
    expect(screen.getByRole("link", { name: /All Products/i })).toHaveAttribute(
      "href",
      "/browse",
    )
    expect(screen.getByRole("link", { name: /Leaderboard/i })).toHaveAttribute(
      "href",
      "/leaderboard",
    )
    expect(
      screen.getByRole("link", { name: /Privacy Policy/i }),
    ).toHaveAttribute("href", "/legal/privacy-policy")
  })

  it("shows the current year in the copyright", () => {
    render(<PublicFooter />)
    const year = new Date().getFullYear().toString()
    expect(
      screen.getByText(new RegExp(`©\\s+${year}\\s+ShipYardHQ`, "i")),
    ).toBeInTheDocument()
  })
})

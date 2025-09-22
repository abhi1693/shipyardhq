import { describe, it, expect, vi, beforeEach } from "vitest"
import React from "react"
import { render, screen } from "@testing-library/react"

const signInMock = vi.fn()
const signUpMock = vi.fn()

// Mock Clerk UI components used by AuthFormPanel
vi.mock("@clerk/nextjs", () => ({
  SignIn: (props: any) => {
    signInMock(props)
    return <div data-testid="sign-in" />
  },
  SignUp: (props: any) => {
    signUpMock(props)
    return <div data-testid="sign-up" />
  },
}))

import AuthFormPanel from "@/components/organisms/AuthFormPanel"
import AuthMarketingPanel from "@/components/organisms/AuthMarketingPanel"
import { TopCategories } from "@/components/organisms/TopCategories"
import { Leaderboard } from "@/components/organisms/Leaderboard"

describe("AuthFormPanel", () => {
  beforeEach(() => {
    signInMock.mockClear()
    signUpMock.mockClear()
  })

  it("renders sign-in variant with redirect props", () => {
    render(<AuthFormPanel mode="sign-in" redirectUrl="/dashboard" />)
    expect(screen.getByTestId("sign-in")).toBeInTheDocument()
    expect(signInMock).toHaveBeenCalledWith(
      expect.objectContaining({
        forceRedirectUrl: "/dashboard",
        fallbackRedirectUrl: "/dashboard",
      }),
    )
    expect(signUpMock).not.toHaveBeenCalled()
  })

  it("renders sign-up variant with default redirect", () => {
    render(<AuthFormPanel mode="sign-up" />)
    expect(screen.getByTestId("sign-up")).toBeInTheDocument()
    expect(signUpMock).toHaveBeenCalledWith(
      expect.objectContaining({
        forceRedirectUrl: "/member",
        fallbackRedirectUrl: "/member",
      }),
    )
    expect(signInMock).not.toHaveBeenCalled()
  })
})

describe("AuthMarketingPanel", () => {
  it("shows brand, hero copy, features and testimonial", () => {
    render(<AuthMarketingPanel />)
    expect(screen.getByText("Chart Your Course")).toBeInTheDocument()
    expect(screen.getByText("ShipYardHQ")).toBeInTheDocument()
    expect(screen.getByText("A harbor for indie SaaS")).toBeInTheDocument()
    expect(screen.getByText("Set sail. Build boldly.")).toBeInTheDocument()
    expect(
      screen.getByText("Built for indie makers, by indie makers"),
    ).toBeInTheDocument()
    expect(
      screen.getByText("Friendly waters, honest feedback, real momentum"),
    ).toBeInTheDocument()
  })
})

describe("Top sections", () => {
  it("TopCategories renders a grid of category cards", () => {
    const categories = [
      {
        id: "1",
        name: "Analytics",
        slug: "analytics",
        description: "Track metrics",
        icon: "BarChart",
        _count: { products: 10 },
      },
      {
        id: "2",
        name: "Email",
        slug: "email",
        description: "Send newsletters",
        icon: "Mail",
        _count: { products: 5 },
      },
    ]
    render(<TopCategories categories={categories as any} />)
    // Names visible and links point to category pages
    expect(screen.getByText("Analytics")).toBeInTheDocument()
    const links = screen.getAllByRole("link")
    expect(
      links.some((a) => a.getAttribute("href") === "/categories/analytics"),
    ).toBe(true)
  })

  it("Leaderboard renders nothing when empty and shows CTA when populated", () => {
    const { container, rerender } = render(<Leaderboard products={[]} />)
    expect(container.firstChild).toBeNull()

    rerender(
      <Leaderboard
        products={
          [
            {
              id: "fb1",
              product: {
                id: "p1",
                slug: "a",
                name: "A",
                logo: "/a.png",
                tagline: "tag",
                ProductBadge: [],
                analytics: { upvotes: 2 },
                user: { firstName: "A", lastName: "B" },
                category: { name: "Cat" },
              },
            },
            {
              id: "fb2",
              product: {
                id: "p2",
                slug: "b",
                name: "B",
                logo: "/b.png",
                tagline: "tag",
                ProductBadge: [],
                analytics: { upvotes: 1 },
                user: { firstName: "C", lastName: "D" },
                category: { name: "Cat" },
              },
            },
          ] as any
        }
      />,
    )
    expect(screen.getByText("Trending Fleet")).toBeInTheDocument()
    expect(screen.getByText("Fleet Standings")).toBeInTheDocument()
    expect(
      screen.getByRole("link", { name: "See leaderboard" }),
    ).toHaveAttribute("href", "/leaderboard")
  })
})

import { describe, it, expect } from "vitest"
import React from "react"
import { render, screen } from "@testing-library/react"

import { PricingCard } from "@/components/molecules/PricingCard"
import PerformanceCard from "@/components/molecules/PerformanceCard"
import ProductList from "@/components/molecules/ProductList"

describe("PricingCard, PerformanceCard, ProductList", () => {
  it("PricingCard renders Free plan and paid price with features", () => {
    const features = [
      {
        id: "1",
        name: "A",
        key: "a",
        description: "da",
        enabled: true,
        isExperimental: false,
      },
      {
        id: "2",
        name: "B",
        key: "b",
        description: "db",
        enabled: false,
        isExperimental: false,
      },
      {
        id: "3",
        name: "Beta labs",
        key: "c",
        description: "beta",
        enabled: true,
        isExperimental: true,
      },
    ]
    const { rerender } = render(
      <PricingCard
        name="Free"
        description="desc"
        price={0}
        isPopular
        features={features}
        ctaHref="/go"
        ctaLabel="Go"
        boostForDays={3}
      />,
    )
    expect(screen.getAllByText("Free").length).toBeGreaterThan(0)
    // Only enabled feature shows
    expect(screen.getByText("A")).toBeInTheDocument()
    expect(screen.queryByText("B")).not.toBeInTheDocument()
    expect(screen.getByText("Beta labs")).toBeInTheDocument()
    expect(screen.getByText(/Boosts your launch for 3 days/i)).toBeInTheDocument()
    expect(screen.getByText(/Experimental/i)).toBeInTheDocument()
    const btn = screen.getByRole("link", { name: /start for free/i })
    expect(btn).toHaveAttribute("href", "/go")

    // Paid
    rerender(
      <PricingCard name="Pro" price={12345} features={features} boostForDays={1} />,
    )
    expect(screen.getByText(/\$123\.45/)).toBeInTheDocument()
    expect(screen.getByText(/Boosts your launch for 1 day/i)).toBeInTheDocument()
    // Popular badge when paid and isPopular
    rerender(
      <PricingCard name="Pro" price={12345} isPopular features={features} />,
    )
    expect(screen.getByText(/popular/i)).toBeInTheDocument()
  })

  it("PerformanceCard renders KPIs, upvoters empty and badges empty, SEO snippet, edit link", () => {
    const { rerender } = render(
      <PerformanceCard
        upvotes={10}
        clicks={20}
        productName="Prod"
        tagline="Tag"
        hasBanner={false}
        ogImageUrl={null}
        editHref="/edit"
      />,
    )
    expect(screen.getByText("10")).toBeInTheDocument()
    expect(screen.getByText("20")).toBeInTheDocument()
    expect(screen.getByText("No recent upvotes")).toBeInTheDocument()
    expect(screen.getByText("No badges")).toBeInTheDocument()
    expect(screen.getByText("Prod")).toBeInTheDocument()
    expect(screen.getByText("Tag")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /improve seo/i })).toHaveAttribute(
      "href",
      "/edit",
    )

    rerender(
      <PerformanceCard
        upvotes={1}
        clicks={2}
        upvoters={[{ id: "u1", user: { firstName: "A", lastName: "B" } }]}
        badges={[
          {
            id: "b1",
            badge: "featured",
            expiresAt: new Date(Date.now() + 86400000).toISOString(),
          },
          { id: "b2", badge: "unknown", expiresAt: null },
        ]}
        productName="Prod"
        tagline={null}
        hasBanner
        ogImageUrl="https://img"
        editHref="/edit"
      />,
    )
    // Upvoters now present (avatar fallback with initials visible via title)
    expect(screen.queryByText("No recent upvotes")).not.toBeInTheDocument()
    // Badge pill rendered with text from BADGE_OPTIONS
    expect(screen.getByText("Featured")).toBeInTheDocument()
    // Unknown badge falls back to raw badge string
    expect(screen.getByText("unknown")).toBeInTheDocument()
  })

  it("ProductList renders items with rank, verified, category and upvotes", () => {
    const items = [
      {
        id: "1",
        slug: "one",
        name: "One",
        logo: "/logo1.png",
        tagline: "First",
        badges: ["featured"],
        analytics: { upvotes: 5 },
        user: { firstName: "A", lastName: "Z" },
        category: { name: "AI" },
        verification: { isVerified: true },
      },
      {
        id: "2",
        slug: "two",
        name: "Two",
        logo: "/logo2.png",
        tagline: "Second",
        badges: [],
        analytics: null,
        user: null,
        category: { name: "Dev" },
        verification: { isVerified: false },
      },
      {
        id: "3",
        slug: "three",
        name: "Three",
        logo: "/logo3.png",
        tagline: "Third",
        badges: [],
        analytics: { upvotes: 9 },
        user: { firstName: null, lastName: null },
        category: null,
        verification: null,
      },
    ]
    const { rerender } = render(
      <ProductList
        items={items}
        compact={false}
        showCategory
        showVerified
        columns="grid-cols-2"
        className="extra"
        showRank={false}
        imagePriorityFirstN={0}
      />,
    )
    expect(screen.getByText("One")).toBeInTheDocument()
    expect(screen.getByText("First")).toBeInTheDocument()
    // Verified pill appears for first
    expect(screen.getByText("Verified")).toBeInTheDocument()
    // imagePriorityFirstN=0 -> images load lazily
    const imgs = screen.getAllByRole("img")
    expect(imgs[0]).toHaveAttribute("loading", "lazy")
    // boundary: first image eager when imagePriorityFirstN=1
    rerender(
      <ProductList
        items={items}
        compact={false}
        showCategory
        showVerified
        columns="grid-cols-2"
        showRank={false}
        imagePriorityFirstN={1}
      />,
    )
    const imgs2 = screen.getAllByRole("img")
    expect(imgs2[0]).toHaveAttribute("loading", "eager")
    expect(imgs2[1]).toHaveAttribute("loading", "lazy")

    // Rerender with rank
    rerender(
      <ProductList
        items={items}
        compact
        showCategory={false}
        showVerified={false}
        showRank
        rankStartAt={10}
      />,
    )
    expect(screen.getByText("#11")).toBeInTheDocument()
    expect(screen.getByText("#12")).toBeInTheDocument()

    // Rerender with topRight callback branch (overrides rank badge)
    rerender(
      <ProductList
        items={items}
        compact
        showCategory={false}
        showVerified={false}
        showRank
        rankStartAt={10}
        topRight={(item, i) => <span data-testid={`tr-${i}`}>TR</span>}
      />,
    )
    expect(screen.getByTestId("tr-0")).toBeInTheDocument()
  })
})

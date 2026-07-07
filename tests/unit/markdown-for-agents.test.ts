import { describe, expect, it } from "vitest"
import { estimateTokens, negotiateFormat, toMarkdownPath } from "@dualmark/core"

import { BRAND_NAME } from "@/lib/brand"
import { dualmarkConfig } from "@/lib/dualmark"
import { buildPageMetadata } from "@/lib/metadata"
import { HOME_PATH } from "@/lib/routes"
import { buildDirectoryMarkdownDocument } from "@/lib/server/directoryMarkdownDocument"
import { buildProductMarkdownDocument } from "@/lib/server/productMarkdownDocument"

describe("markdown for agents", () => {
  it("negotiates markdown with Dualmark", () => {
    expect(negotiateFormat("text/markdown")).toBe("markdown")
    expect(negotiateFormat("text/html, text/markdown; q=0.8")).toBe("html")
    expect(negotiateFormat("text/markdown; q=0")).toBeNull()
    expect(negotiateFormat("application/json")).toBeNull()
  })

  it("estimates a positive token count for non-empty markdown", () => {
    expect(estimateTokens(`# ${BRAND_NAME}\n\nLaunch data`)).toBeGreaterThan(0)
  })

  it("maps public paths to visible markdown twin paths", () => {
    expect(toMarkdownPath("/")).toBe("/index.md")
    expect(toMarkdownPath("/products/example")).toBe("/products/example.md")
    expect(toMarkdownPath("/products/example.md")).toBe("/products/example.md")
  })

  it("renders a substantive home index markdown document", () => {
    const homePage = dualmarkConfig.staticPages.find(
      (page) => page.pattern === HOME_PATH,
    )
    const markdown = homePage?.render()

    expect(markdown).toContain("# Shipyard HQ")
    expect(markdown).toContain("## Core Entity Facts")
    expect(markdown).toContain("## Submission and Listing Workflow")
    expect(markdown).toContain("## Key Directories and Retrieval Targets")
    expect(markdown).toContain("## Example Public Pages")
    expect(markdown).toContain("Canonical: http://localhost:3000/")
  })

  it("adds markdown alternates to canonical page metadata", () => {
    const metadata = buildPageMetadata({
      title: "Analytics",
      canonical: "/categories/analytics",
    })

    expect(metadata.alternates?.canonical).toBe("/categories/analytics")
    expect(metadata.alternates?.types?.["text/markdown"]).toBe(
      "/categories/analytics.md",
    )
  })

  it("renders directory markdown with facts and representative products", () => {
    const markdown = buildDirectoryMarkdownDocument({
      title: "Free Analytics Products",
      canonicalPath: "/categories/analytics/pricing/free",
      description:
        "Free analytics products on Shipyard are filtered by category and pricing model.",
      total: 2,
      facts: ["Category: Analytics", "Filter: Free"],
      products: [
        {
          slug: "metric-lens",
          name: "Metric Lens",
          tagline: "Simple product analytics dashboards",
          category: { name: "Analytics", slug: "analytics" },
          analytics: { upvotes: 12 },
          isVerified: true,
        },
      ],
    })

    expect(markdown).toContain("# Free Analytics Products")
    expect(markdown).toContain(
      "Canonical: http://localhost:3000/categories/analytics/pricing/free",
    )
    expect(markdown).toContain(
      "Markdown alternate: http://localhost:3000/categories/analytics/pricing/free.md",
    )
    expect(markdown).toContain("- Total products: 2")
    expect(markdown).toContain(
      "Metric Lens: http://localhost:3000/products/metric-lens",
    )
    expect(markdown).toContain("Verified")
  })

  it("renders product markdown from product data without page chrome", () => {
    const product = {
      id: "prod_1",
      slug: "embed-bot",
      name: "Embed-Bot",
      tagline: "AI Customer Support for Chat & Email that lives in Slack",
      description:
        "Embed-Bot integrates with Slack and email.\n\n- Handles support conversations\n- Escalates important replies",
      websiteUrl: "https://www.embed-bot.com",
      pricingModel: "freemium",
      startingPriceCents: 3900,
      currencyCode: "USD",
      platforms: ["web"],
      type: "saas",
      publishedAt: new Date("2026-05-20T00:00:00.000Z"),
      createdAt: new Date("2026-05-20T00:00:00.000Z"),
      updatedAt: new Date("2026-05-20T00:00:00.000Z"),
      category: { slug: "customer-support" },
      user: { firstName: "Aminu", lastName: "Example" },
      metadata: { demoUrl: null },
      verification: {
        isVerified: true,
        verifiedAt: new Date("2026-05-21T00:00:00.000Z"),
      },
      alternatives: [
        {
          slug: "intercom",
          name: "Intercom",
          websiteUrl: "https://www.intercom.com",
          description: "Customer service platform",
        },
      ],
      badges: ["top-10-monthly"],
      leaderboardScores: [
        {
          rank: 3,
          score: 120,
          views: 400,
          uniqueVisitors: 250,
          upvotes: 18,
          run: {
            periodStart: new Date("2026-05-01T00:00:00.000Z"),
            periodEnd: new Date("2026-05-31T00:00:00.000Z"),
            status: "finalized",
          },
        },
      ],
      _count: { ProductUpvote: 0 },
    } as unknown as Parameters<typeof buildProductMarkdownDocument>[0]
    const meta = {
      slug: "embed-bot",
      name: "Embed-Bot",
      tagline: "AI Customer Support for Chat & Email that lives in Slack",
      description: product.description,
      logo: "https://media.shipyardhq.dev/logo.webp",
      bannerImage: "https://media.shipyardhq.dev/banner.webp",
      keywords: ["AI customer support", "Slack integration"],
      ProductMedia: [{ imageUrl: "https://media.shipyardhq.dev/screen.webp" }],
      category: { name: "Customer Support", slug: "customer-support" },
    } as unknown as Parameters<typeof buildProductMarkdownDocument>[1]

    const markdown = buildProductMarkdownDocument(product, meta)

    expect(markdown).toContain("# Embed-Bot")
    expect(markdown).toContain(
      "Canonical Shipyard page: http://localhost:3000/products/embed-bot",
    )
    expect(markdown).toContain("Starting price: $39.00")
    expect(markdown).toContain("Verified product: yes")
    expect(markdown).toContain("Verified at: 2026-05-21")
    expect(markdown).toContain("Embed-Bot integrates with Slack and email.")
    expect(markdown).toContain("- Handles support conversations")
    expect(markdown).toContain("## Alternatives")
    expect(markdown).toContain(
      "Intercom: http://localhost:3000/alternatives/intercom",
    )
    expect(markdown).toContain("## Shipyard Badges")
    expect(markdown).toContain("- top-10-monthly")
    expect(markdown).toContain("## Rank History")
    expect(markdown).toContain(
      "| 2026-05-01 to 2026-05-31 | #3 | 120 | 400 | 250 | 18 |",
    )
    expect(markdown).toContain("- AI customer support")
    expect(markdown).not.toContain("Discover")
    expect(markdown).not.toContain("Show more")
  })
})

import { describe, expect, it } from "vitest"
import { estimateTokens, negotiateFormat, toMarkdownPath } from "@dualmark/core"

import { BRAND_NAME } from "@/lib/brand"
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
      verification: { isVerified: false },
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
    expect(markdown).toContain("Embed-Bot integrates with Slack and email.")
    expect(markdown).toContain("- Handles support conversations")
    expect(markdown).toContain("- AI customer support")
    expect(markdown).not.toContain("Discover")
    expect(markdown).not.toContain("Show more")
  })
})

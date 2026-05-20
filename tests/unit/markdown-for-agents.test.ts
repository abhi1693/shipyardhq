import { describe, expect, it } from "vitest"

import {
  convertHtmlToMarkdown,
  estimateMarkdownTokens,
  hasExplicitMarkdownAccept,
} from "@/lib/server/markdownForAgents"
import { buildProductMarkdownDocument } from "@/lib/server/productMarkdownDocument"

describe("markdown for agents", () => {
  it("detects explicit text/markdown negotiation", () => {
    expect(hasExplicitMarkdownAccept("text/markdown")).toBe(true)
    expect(hasExplicitMarkdownAccept("text/html, text/markdown; q=0.8")).toBe(
      true,
    )
    expect(hasExplicitMarkdownAccept("text/markdown; q=0")).toBe(false)
    expect(hasExplicitMarkdownAccept("text/html, */*")).toBe(false)
    expect(hasExplicitMarkdownAccept(null)).toBe(false)
  })

  it("estimates a positive token count for non-empty markdown", () => {
    expect(
      estimateMarkdownTokens("# ShipYard HQ\n\nLaunch data"),
    ).toBeGreaterThan(0)
  })

  it("converts rendered HTML into markdown without script content", () => {
    const markdown = convertHtmlToMarkdown(
      `
        <html>
          <body>
            <main>
              <h1>Shipyard</h1>
              <a href="/cdn-cgi/content"></a>
              <p>Launch data for <a href="/products/example">Example</a>.</p>
              <table>
                <thead><tr><th>Feature</th><th>Shipyard</th></tr></thead>
                <tbody><tr><td>Discovery</td><td>Curated</td></tr></tbody>
              </table>
              <script>window.__NEXT_DATA__ = "ignore me"</script>
            </main>
          </body>
        </html>
      `,
      new URL("https://shipyardhq.dev/"),
    )

    expect(markdown).toContain("# Shipyard")
    expect(markdown).toContain(
      "[Example](https://shipyardhq.dev/products/example)",
    )
    expect(markdown).toContain("| Feature | Shipyard |")
    expect(markdown).not.toContain("/cdn-cgi/content")
    expect(markdown).not.toContain("__NEXT_DATA__")
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

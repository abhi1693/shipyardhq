import { describe, expect, it } from "vitest"

import { analyzeSeoHtml, auditToMarkdown } from "@/lib/tools/seo-audit"

const HEALTHY_HTML = `<!doctype html>
<html lang="en"><head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <title>A useful, specific product page title for founders</title>
  <meta name="description" content="A specific page description that explains the audience, the product outcome, and enough useful detail to help a searcher decide whether to visit.">
  <link rel="canonical" href="https://example.com/product"><link rel="icon" href="/favicon.ico">
  <meta property="og:title" content="A useful product"><meta property="og:description" content="A useful description"><meta property="og:image" content="https://example.com/card.png">
  <meta name="twitter:card" content="summary_large_image">
  <script type="application/ld+json">{"@context":"https://schema.org","@type":"Product","name":"Useful product"}</script>
</head><body><main><h1>A useful product for founders</h1><h2>How it works</h2>
  <p>${"Useful evidence explains the workflow and outcome. ".repeat(55)}</p>
  <a href="/pricing">Pricing</a><a href="https://example.org/source">Source</a>
  <img src="/hero.png" alt="Product dashboard showing launch analytics">
</main></body></html>`

describe("SEO HTML audit", () => {
  it("extracts transparent page metrics and passes healthy essentials", () => {
    const audit = analyzeSeoHtml({
      requestedUrl: "https://example.com/product",
      finalUrl: "https://example.com/product",
      status: 200,
      responseTimeMs: 180,
      sizeBytes: 18_000,
      html: HEALTHY_HTML,
      robotsTxt: { found: true, mentionsSitemap: true },
      sitemap: { found: true },
    })

    expect(audit.title).toContain("specific product")
    expect(audit.h1).toEqual(["A useful product for founders"])
    expect(audit.links).toEqual({ total: 2, internal: 1, external: 1 })
    expect(audit.images).toEqual({ total: 1, missingAlt: 0, lazy: 0 })
    expect(audit.score).toBeGreaterThan(85)
    expect(audit.findings.find((item) => item.id === "schema")?.tone).toBe(
      "pass",
    )
  })

  it("prioritizes missing crawl and accessibility essentials", () => {
    const audit = analyzeSeoHtml({
      requestedUrl: "http://example.com",
      finalUrl: "http://example.com",
      status: 404,
      responseTimeMs: 3000,
      sizeBytes: 700_000,
      html: "<html><body><img src='/missing.png'></body></html>",
    })

    const errors = audit.findings
      .filter((item) => item.tone === "error")
      .map((item) => item.id)
    expect(errors).toEqual(
      expect.arrayContaining([
        "status",
        "https",
        "title",
        "description",
        "viewport",
        "h1",
        "image-alt",
      ]),
    )
    expect(audit.score).toBeLessThan(60)
  })

  it("exports findings and recommendations as Markdown", () => {
    const audit = analyzeSeoHtml({
      requestedUrl: "https://example.com",
      finalUrl: "https://example.com",
      status: 200,
      responseTimeMs: 100,
      sizeBytes: 100,
      html: "<!doctype html><html lang='en'><body><h1>Example</h1></body></html>",
    })
    const markdown = auditToMarkdown(audit)
    expect(markdown).toContain("# SEO audit: https://example.com")
    expect(markdown).toContain("**Page title** (error)")
    expect(markdown).toContain("Recommended:")
  })
})

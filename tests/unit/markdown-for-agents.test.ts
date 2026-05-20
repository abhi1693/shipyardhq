import { describe, expect, it } from "vitest"

import {
  convertHtmlToMarkdown,
  estimateMarkdownTokens,
  hasExplicitMarkdownAccept,
} from "@/lib/server/markdownForAgents"

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
})

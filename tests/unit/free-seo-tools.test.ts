import { describe, expect, it } from "vitest"

import {
  FREE_SEO_TOOL_BY_SLUG,
  FREE_SEO_TOOLS,
  getFreeTool,
  getRelatedFreeTools,
  isFreeToolSlug,
} from "@/lib/tools/catalog"
import {
  escapeHtmlAttribute,
  escapeXml,
  extractSeoSlugSource,
  generateFaqSchema,
  generateOpenGraphTags,
  generateRobotsTxt,
  generateSoftwareApplicationSchema,
  generateXmlSitemap,
  parseSitemapUrls,
  wrapJsonLdInScriptTag,
} from "@/lib/tools/generators"
import { FREE_TOOL_SLUGS } from "@/lib/tools/types"

describe("free SEO tool catalog", () => {
  it("defines exactly one complete catalog entry for each of the ten slugs", () => {
    expect(FREE_TOOL_SLUGS).toHaveLength(10)
    expect(FREE_SEO_TOOLS).toHaveLength(FREE_TOOL_SLUGS.length)
    expect(new Set(FREE_TOOL_SLUGS).size).toBe(FREE_TOOL_SLUGS.length)
    expect(new Set(FREE_SEO_TOOLS.map((tool) => tool.slug)).size).toBe(
      FREE_SEO_TOOLS.length,
    )
    expect(FREE_SEO_TOOLS.map((tool) => tool.slug)).toEqual(
      expect.arrayContaining([...FREE_TOOL_SLUGS]),
    )

    for (const tool of FREE_SEO_TOOLS) {
      expect(FREE_SEO_TOOL_BY_SLUG[tool.slug]).toBe(tool)
      expect(tool.name).not.toHaveLength(0)
      expect(tool.description).not.toHaveLength(0)
      expect(tool.metaDescription).not.toHaveLength(0)
      expect(tool.features.length).toBeGreaterThanOrEqual(3)
      expect(tool.guide.length).toBeGreaterThanOrEqual(2)
      expect(tool.faqs.length).toBeGreaterThanOrEqual(3)
    }
  })

  it("keeps every related-tool reference valid, unique, and non-recursive", () => {
    for (const tool of FREE_SEO_TOOLS) {
      expect(new Set(tool.relatedTools).size).toBe(tool.relatedTools.length)
      expect(tool.relatedTools).not.toContain(tool.slug)

      for (const relatedSlug of tool.relatedTools) {
        expect(FREE_SEO_TOOL_BY_SLUG[relatedSlug]).toBeDefined()
      }
    }
  })

  it("looks up only supported slugs and respects related-tool limits", () => {
    const slug = FREE_TOOL_SLUGS[0]
    const tool = getFreeTool(slug)

    expect(isFreeToolSlug(slug)).toBe(true)
    expect(isFreeToolSlug("not-a-real-tool")).toBe(false)
    expect(tool?.slug).toBe(slug)
    expect(getFreeTool("not-a-real-tool")).toBeUndefined()

    expect(getRelatedFreeTools(tool!, 2)).toHaveLength(2)
    expect(getRelatedFreeTools(tool!, 0)).toEqual([])
    expect(getRelatedFreeTools(tool!, 20)).not.toContain(tool)
    expect(getRelatedFreeTools(tool!, 20).length).toBeLessThanOrEqual(
      FREE_SEO_TOOLS.length - 1,
    )
  })
})

describe("free SEO tool generators", () => {
  it("escapes every HTML attribute and XML-sensitive character", () => {
    const unsafe = `A&B <launch> "today" 'now'`

    expect(escapeHtmlAttribute(unsafe)).toBe(
      "A&amp;B &lt;launch&gt; &quot;today&quot; &#39;now&#39;",
    )
    expect(escapeXml(unsafe)).toBe(
      "A&amp;B &lt;launch&gt; &quot;today&quot; &apos;now&apos;",
    )
  })

  it("generates escaped Open Graph and X tags while omitting blank values", () => {
    const output = generateOpenGraphTags({
      title: `Ship & "Launch" <fast>`,
      description: "  Founder tools & launch intelligence  ",
      url: " ",
      imageUrl: "https://example.com/card.png?size=1200&fit=crop",
      siteName: "Shipyard",
      twitterCard: "summary_large_image",
    })

    expect(output).toContain(
      'property="og:title" content="Ship &amp; &quot;Launch&quot; &lt;fast&gt;"',
    )
    expect(output).toContain(
      'name="twitter:card" content="summary_large_image"',
    )
    expect(output).toContain("size=1200&amp;fit=crop")
    expect(output).not.toContain("og:url")
    expect(output).not.toContain('content=""')
  })

  it("preserves title punctuation content while cleaning recognized URLs", () => {
    expect(extractSeoSlugSource("What is RAG? A founder's guide")).toBe(
      "What is RAG? A founder's guide",
    )
    expect(extractSeoSlugSource("C# SDK tutorial")).toBe("C# SDK tutorial")
    expect(
      extractSeoSlugSource(
        "https://example.com/guides/what-is-rag?utm_source=test#intro",
      ),
    ).toBe("what-is-rag")
  })

  it("generates FAQ JSON-LD from complete, trimmed entries only", () => {
    const schema = JSON.parse(
      generateFaqSchema([
        { question: "  Who is this for? ", answer: " Founders. " },
        { question: "Missing answer", answer: " " },
        { question: " ", answer: "Missing question" },
      ]),
    )

    expect(schema).toEqual({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Who is this for?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Founders.",
          },
        },
      ],
    })
  })

  it("generates normalized software schema and preserves a free price", () => {
    const schema = JSON.parse(
      generateSoftwareApplicationSchema({
        name: "  Shipyard  ",
        description: "  Launch intelligence  ",
        url: " https://shipyard.example ",
        imageUrl: " ",
        applicationCategory: " BusinessApplication ",
        operatingSystem: " Web ",
        price: " 0 ",
        currency: " usd ",
      }),
    )

    expect(schema).toMatchObject({
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Shipyard",
      description: "Launch intelligence",
      url: "https://shipyard.example",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
    })
    expect(schema).not.toHaveProperty("image")

    const withoutPrice = JSON.parse(
      generateSoftwareApplicationSchema({
        name: "Shipyard",
        description: "Launch intelligence",
        url: "https://shipyard.example",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        price: " ",
        currency: "eur",
      }),
    )
    expect(withoutPrice).not.toHaveProperty("offers")
  })

  it("keeps user content from closing generated JSON-LD script tags", () => {
    const unsafeText = "</script><script>alert(1)</script>"
    const jsonDocuments = [
      generateFaqSchema([{ question: "Is this safe?", answer: unsafeText }]),
      generateSoftwareApplicationSchema({
        name: "Shipyard",
        description: unsafeText,
        url: "https://shipyard.example",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        price: "0",
        currency: "USD",
      }),
    ]
    const prefix = '<script type="application/ld+json">\n'
    const suffix = "\n</script>"

    for (const json of jsonDocuments) {
      const script = wrapJsonLdInScriptTag(json)
      const embeddedJson = script.slice(prefix.length, -suffix.length)

      expect(script.startsWith(prefix)).toBe(true)
      expect(script.endsWith(suffix)).toBe(true)
      expect(script.match(/<\/script>/gi)).toHaveLength(1)
      expect(embeddedJson).not.toContain("<")
      expect(embeddedJson).toContain("\\u003c/script>")
      expect(JSON.stringify(JSON.parse(embeddedJson))).toContain(unsafeText)
    }
  })

  it("builds independent global, crawler, and sitemap robots directives", () => {
    expect(
      generateRobotsTxt({
        allowAll: true,
        crawlerRules: [
          { userAgent: " GPTBot ", allowed: false },
          { userAgent: "ClaudeBot", allowed: true },
        ],
        sitemapUrl: " https://example.com/sitemap.xml ",
        disallowPaths: [" /member ", "api", "/member"],
      }),
    ).toBe(
      [
        "User-agent: *",
        "Disallow: /member",
        "Disallow: /api",
        "",
        "User-agent: GPTBot",
        "Disallow: /",
        "",
        "User-agent: ClaudeBot",
        "Disallow: /member",
        "Disallow: /api",
        "",
        "Sitemap: https://example.com/sitemap.xml",
        "",
      ].join("\n"),
    )
  })

  it("parses HTTP URLs, normalizes and deduplicates them, and reports rejects", () => {
    const result = parseSitemapUrls(
      [
        "https://example.com",
        "https://example.com/",
        "https://example.com/product",
        "https://example.com/about",
        "ftp://example.com/file",
        "not a URL",
      ].join("\n"),
    )

    expect(result.valid).toEqual([
      "https://example.com/",
      "https://example.com/product",
      "https://example.com/about",
    ])
    expect(result.invalid).toEqual(["ftp://example.com/file", "not a URL"])
  })

  it("preserves commas inside sitemap URL paths and queries", () => {
    const result = parseSitemapUrls(
      [
        "https://example.com/items/a,b",
        "https://example.com/search?tags=alpha,beta",
      ].join("\r\n"),
    )

    expect(result.valid).toEqual([
      "https://example.com/items/a,b",
      "https://example.com/search?tags=alpha,beta",
    ])
    expect(result.invalid).toEqual([])
  })

  it("rejects URLs outside the first supported sitemap origin", () => {
    const result = parseSitemapUrls(
      [
        "ftp://example.com/file",
        "not a URL",
        "https://EXAMPLE.com:443",
        "https://example.com/",
        "https://example.com/product",
        "http://example.com/insecure",
        "https://www.example.com/subdomain",
        "https://example.com:8443/non-default-port",
        "https://EXAMPLE.COM/about",
      ].join("\n"),
    )

    expect(result.valid).toEqual([
      "https://example.com/",
      "https://example.com/product",
      "https://example.com/about",
    ])
    expect(result.invalid).toEqual([
      "ftp://example.com/file",
      "not a URL",
      "http://example.com/insecure",
      "https://www.example.com/subdomain",
      "https://example.com:8443/non-default-port",
    ])
  })

  it("generates escaped sitemap XML and clamps priority to protocol limits", () => {
    const upperBound = generateXmlSitemap(
      ["https://example.com/products?type=app&stage=live"],
      {
        lastModified: "2026-07-13",
        changeFrequency: "weekly",
        priority: 4,
      },
    )

    expect(upperBound).toContain(
      "<loc>https://example.com/products?type=app&amp;stage=live</loc>",
    )
    expect(upperBound).toContain("<lastmod>2026-07-13</lastmod>")
    expect(upperBound).toContain("<changefreq>weekly</changefreq>")
    expect(upperBound).toContain("<priority>1.0</priority>")
    expect(upperBound).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>/)
    expect(upperBound).toMatch(/<\/urlset>\n$/)

    expect(
      generateXmlSitemap(["https://example.com"], { priority: -2 }),
    ).toContain("<priority>0.0</priority>")
    expect(generateXmlSitemap(["https://example.com"])).not.toContain(
      "<priority>",
    )
  })
})

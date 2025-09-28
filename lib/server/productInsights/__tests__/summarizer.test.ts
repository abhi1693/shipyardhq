import { describe, expect, it } from "vitest"

import {
  sanitizePage,
  simplifyJsonLd,
} from "@/lib/server/productInsights/summarizer"
import type { ProductInsightPageSnapshot } from "@/lib/server/productInsights/types"

describe("product ideas summarizer helpers", () => {
  it("sanitizes page snapshots for model consumption", () => {
    const rawPage: ProductInsightPageSnapshot = {
      url: "https://example.com/features",
      status: "ok",
      fetchedAt: new Date().toISOString(),
      headings: Array.from({ length: 8 }, (_, index) => `Heading ${index + 1}`),
      textSnippet: "a".repeat(1505),
      keywords: Array.from({ length: 12 }, (_, index) => `kw${index}`),
      title: "Example Features",
      metaDescription: "Purpose-built for busy teams.",
      ogDescription: "Deep dive into product features.",
      jsonLd: [
        {
          "@type": "Product",
          name: "ExampleApp",
          description: "All-in-one toolkit",
          offers: {
            price: "49",
            priceCurrency: "USD",
          },
        },
      ],
    }

    const sanitized = sanitizePage(rawPage)

    expect(sanitized.url).toEqual(rawPage.url)
    expect(sanitized.headings).toHaveLength(6)
    expect(sanitized.keywords).toHaveLength(8)
    expect(sanitized.snippet).toBeDefined()
    expect(sanitized.snippet!.length).toBeLessThanOrEqual(1200)
    expect(sanitized.jsonLd).toEqual([
      {
        "@type": "Product",
        description: "All-in-one toolkit",
        name: "ExampleApp",
        offers: {
          price: "49",
          priceCurrency: "USD",
        },
      },
    ])
  })

  it("reduces json-ld payloads to key attributes", () => {
    const payload = [
      {
        "@type": "Organization",
        name: "Example LLC",
        description: "We help startups ship faster.",
        url: "https://example.com",
        audience: { name: "Startup founders" },
        offers: [
          { price: "0", priceCurrency: "USD", description: "Free tier" },
          { price: "99", priceCurrency: "USD", description: "Pro tier" },
        ],
      },
      null,
    ]

    const simplified = simplifyJsonLd(payload)

    expect(simplified).toHaveLength(1)
    expect(simplified[0]).toMatchObject({
      "@type": "Organization",
      name: "Example LLC",
      description: "We help startups ship faster.",
      url: "https://example.com",
    })
    expect(Array.isArray(simplified[0].offers)).toBe(true)
    expect((simplified[0].offers as any[])[0]).toMatchObject({
      price: "0",
      priceCurrency: "USD",
      description: "Free tier",
    })
  })
})

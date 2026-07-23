import { describe, expect, it, vi } from "vitest"

const sitemapDataMocks = vi.hoisted(() => ({
  getProductSitemapStats: vi.fn().mockResolvedValue({
    total: 50_001,
    lastUpdated: new Date("2026-07-22T00:00:00.000Z"),
  }),
  getAlternativeSitemapStats: vi.fn().mockResolvedValue({
    total: 1,
    lastUpdated: new Date("2026-07-21T00:00:00.000Z"),
  }),
  getKeywordTagSitemapStats: vi.fn().mockResolvedValue({
    total: 50_001,
    lastUpdated: new Date("2026-07-20T00:00:00.000Z"),
  }),
}))

vi.mock("@/lib/server/sitemap-data", () => ({
  getProductSitemapStats: sitemapDataMocks.getProductSitemapStats,
  getAlternativeSitemapStats: sitemapDataMocks.getAlternativeSitemapStats,
}))

vi.mock("@/actions/public/tags/actions", () => ({
  getKeywordTagSitemapStats: sitemapDataMocks.getKeywordTagSitemapStats,
}))

import { GET as getToolsSitemap } from "@/app/(sitemaps)/sitemap-tools.xml/route"
import { GET as getSitemapIndex } from "@/app/(sitemaps)/sitemap.xml/route"
import { resolveSiteUrl } from "@/lib/siteConfig"
import {
  escapeXml,
  getSitemapShardCount,
  getSitemapShardEntries,
  isSitemapShardOutOfRange,
  parseSitemapShardIndex,
  sitemapIndexXml,
  sitemapResponse,
  urlsetXml,
} from "@/lib/sitemap"
import { PUBLIC_CONTENT_CACHE_CONTROL } from "@/lib/public-cache"
import { FREE_SEO_TOOLS, freeToolPath } from "@/lib/tools/catalog"

describe("sitemap utilities", () => {
  it("escapes XML-sensitive values", () => {
    expect(escapeXml(`https://example.com/a?x=1&name="A < B"`)).toBe(
      "https://example.com/a?x=1&amp;name=&quot;A &lt; B&quot;",
    )
  })

  it("calculates sitemap shard counts without creating empty shards", () => {
    expect(getSitemapShardCount(0)).toBe(0)
    expect(getSitemapShardCount(1)).toBe(1)
    expect(getSitemapShardCount(50000)).toBe(1)
    expect(getSitemapShardCount(50001)).toBe(2)
  })

  it("builds canonical leaf sitemap shard entries", () => {
    expect(
      getSitemapShardEntries({
        base: "https://example.com/",
        route: "/sitemap-products/",
        total: 50_001,
        lastmod: "2026-07-22T00:00:00.000Z",
      }),
    ).toEqual([
      {
        loc: "https://example.com/sitemap-products/1.xml",
        lastmod: "2026-07-22T00:00:00.000Z",
      },
      {
        loc: "https://example.com/sitemap-products/2.xml",
        lastmod: "2026-07-22T00:00:00.000Z",
      },
    ])
  })

  it("validates shard indexes and ranges", () => {
    expect(parseSitemapShardIndex("1")).toBe(1)
    expect(parseSitemapShardIndex("0")).toBeNull()
    expect(parseSitemapShardIndex("1.5")).toBeNull()
    expect(parseSitemapShardIndex("abc")).toBeNull()

    expect(isSitemapShardOutOfRange(1, 0)).toBe(true)
    expect(isSitemapShardOutOfRange(1, 1)).toBe(false)
    expect(isSitemapShardOutOfRange(2, 50000)).toBe(true)
    expect(isSitemapShardOutOfRange(2, 50001)).toBe(false)
  })

  it("builds escaped sitemap XML documents", () => {
    expect(
      sitemapIndexXml([
        {
          loc: "https://example.com/sitemap-products.xml?x=1&y=2",
          lastmod: "2026-06-10T00:00:00.000Z",
        },
      ]),
    ).toContain("x=1&amp;y=2")

    expect(
      urlsetXml([
        {
          loc: "https://example.com/tags/a&b",
          lastmod: new Date("2026-06-10T00:00:00.000Z"),
          changefreq: "weekly",
          priority: "0.7",
        },
      ]),
    ).toContain("https://example.com/tags/a&amp;b")
  })

  it("returns public cache headers for sitemap responses", () => {
    const response = sitemapResponse("<urlset />")

    expect(response.headers.get("content-type")).toBe(
      "application/xml; charset=utf-8",
    )
    expect(response.headers.get("cache-control")).toBe(
      PUBLIC_CONTENT_CACHE_CONTROL,
    )
  })

  it("indexes the tools sitemap and every canonical free-tool URL", async () => {
    const indexXml = await (await getSitemapIndex()).text()
    const toolsXml = await getToolsSitemap().text()
    const base = resolveSiteUrl()

    expect(indexXml).toContain(`${base}/sitemap-tools.xml`)
    expect(toolsXml.match(/<loc>/g)).toHaveLength(FREE_SEO_TOOLS.length + 1)
    expect(toolsXml).toContain(`<loc>${base}/tools</loc>`)

    for (const tool of FREE_SEO_TOOLS) {
      expect(toolsXml).toContain(`<loc>${base}${freeToolPath(tool.slug)}</loc>`)
    }
  })

  it("lists leaf shards instead of nesting sitemap indexes", async () => {
    const indexXml = await (await getSitemapIndex()).text()
    const base = resolveSiteUrl()

    expect(indexXml).toContain(`<loc>${base}/sitemap-products/1.xml</loc>`)
    expect(indexXml).toContain(`<loc>${base}/sitemap-products/2.xml</loc>`)
    expect(indexXml).toContain(`<loc>${base}/sitemap-alternatives/1.xml</loc>`)
    expect(indexXml).toContain(`<loc>${base}/sitemap-tags/1.xml</loc>`)
    expect(indexXml).toContain(`<loc>${base}/sitemap-tags/2.xml</loc>`)

    expect(indexXml).not.toContain(`<loc>${base}/sitemap-products.xml</loc>`)
    expect(indexXml).not.toContain(
      `<loc>${base}/sitemap-alternatives.xml</loc>`,
    )
    expect(indexXml).not.toContain(`<loc>${base}/sitemap-tags.xml</loc>`)
  })
})

import { describe, expect, it } from "vitest"

import { GET as getToolsSitemap } from "@/app/(sitemaps)/sitemap-tools.xml/route"
import { GET as getSitemapIndex } from "@/app/(sitemaps)/sitemap.xml/route"
import { resolveSiteUrl } from "@/lib/siteConfig"
import {
  escapeXml,
  getSitemapShardCount,
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
})

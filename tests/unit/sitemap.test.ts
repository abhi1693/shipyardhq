import { describe, expect, it } from "vitest"

import {
  escapeXml,
  getSitemapShardCount,
  isSitemapShardOutOfRange,
  parseSitemapShardIndex,
  sitemapIndexXml,
  urlsetXml,
} from "@/lib/sitemap"

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
})

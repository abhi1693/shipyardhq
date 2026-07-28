import { describe, expect, it } from "vitest"

import {
  hasSeoQueryNoindexParams,
  resolveSitemapChunkRewritePath,
  shouldRunClerkMiddleware,
} from "@/lib/proxy-routing"

describe("proxy routing", () => {
  it("does not run Clerk middleware for public SEO pages", () => {
    expect(shouldRunClerkMiddleware("/")).toBe(false)
    expect(shouldRunClerkMiddleware("/products/savefbs")).toBe(false)
    expect(shouldRunClerkMiddleware("/categories/developer-tools")).toBe(false)
    expect(shouldRunClerkMiddleware("/alternatives/notion")).toBe(false)
  })

  it("keeps Clerk middleware on private, auth, and API paths", () => {
    expect(shouldRunClerkMiddleware("/member")).toBe(true)
    expect(shouldRunClerkMiddleware("/member/products")).toBe(true)
    expect(shouldRunClerkMiddleware("/login")).toBe(true)
    expect(shouldRunClerkMiddleware("/register")).toBe(true)
    expect(shouldRunClerkMiddleware("/auth/suspended")).toBe(true)
    expect(shouldRunClerkMiddleware("/api/products/savefbs/upvote")).toBe(true)
  })

  it("rewrites sitemap chunk urls without Clerk middleware", () => {
    expect(resolveSitemapChunkRewritePath("/sitemap-products/2.xml")).toBe(
      "/sitemap-products/2",
    )
    expect(resolveSitemapChunkRewritePath("/sitemap-alternatives/3.xml")).toBe(
      "/sitemap-alternatives/3",
    )
    expect(resolveSitemapChunkRewritePath("/sitemap-tags/4.xml")).toBe(
      "/sitemap-tags/4",
    )
    expect(resolveSitemapChunkRewritePath("/sitemap.xml")).toBeNull()
  })

  it("identifies SEO query variants that should stay crawlable but noindex", () => {
    expect(
      hasSeoQueryNoindexParams(new URLSearchParams("page=1&sort=az")),
    ).toBe(true)
    expect(hasSeoQueryNoindexParams(new URLSearchParams("q=crm"))).toBe(true)
    expect(
      hasSeoQueryNoindexParams(new URLSearchParams("verified=true")),
    ).toBe(true)
    expect(hasSeoQueryNoindexParams(new URLSearchParams("utm_source=x"))).toBe(
      false,
    )
    expect(hasSeoQueryNoindexParams(new URLSearchParams("sort="))).toBe(false)
  })
})

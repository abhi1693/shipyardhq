import { describe, expect, it } from "vitest"

import { absoluteOgImageUrl, buildSiteSeo, siteConfig } from "@/lib/siteConfig"

describe("siteConfig", () => {
  it("builds absolute OG image from relative path", () => {
    const url = new URL(absoluteOgImageUrl)
    expect(url.pathname).toBe("/opengraph.png")
    expect(url.origin).toBe(new URL(siteConfig.url).origin)
  })

  it("builds SEO configuration with derived defaults", () => {
    const seo = buildSiteSeo()

    expect(seo.defaultTitle).toContain(siteConfig.name)
    expect(seo.titleTemplate).toBe(`%s | ${siteConfig.name}`)
    expect(seo.openGraph?.images?.[0]?.url).toBe(absoluteOgImageUrl)
    expect(seo.twitter?.images?.[0]).toBe(absoluteOgImageUrl)
  })
})

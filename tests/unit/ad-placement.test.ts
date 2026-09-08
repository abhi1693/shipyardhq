import { describe, expect, it } from "vitest"

import { isCarbonDiscoveryPath } from "@/lib/ads/placement"
import { isAdsensePublisherContentPath } from "@/lib/adsense/placement"
import nextConfig from "../../next.config"

describe("ad network placement", () => {
  it.each([
    "/",
    "/browse",
    "/categories",
    "/categories/developer-tools/",
    "/use-cases",
    "/use-cases/launch-a-saas",
    "/alternatives",
    "/alternatives/notion",
    "/tags",
    "/tags/developer-tools",
    "/platforms",
    "/platforms/web",
    "/product-types",
    "/product-types/saas",
    "/pricing/free",
    "/categories/developer-tools/platforms/web",
    "/categories/developer-tools/pricing/free",
    "/categories/developer-tools/product-types/saas",
    "/use-cases/launch-a-saas/categories/developer-tools",
    "/use-cases/launch-a-saas/platforms/web",
    "/use-cases/launch-a-saas/pricing/free",
    "/alternatives/notion/categories/developer-tools",
    "/verified/developer-tools",
    "/editor-picks/developer-tools",
    "/trends/categories/developer-tools",
    "/products/example",
    "/leaderboard",
    "/leaderboard/monthly",
    "/leaderboard/daily/2026/9/8",
    "/leaderboard/weekly/2026/36",
    "/leaderboard/monthly/2026/9",
  ])("reserves %s for Carbon without allowing AdSense", (path) => {
    expect(isCarbonDiscoveryPath(path)).toBe(true)
    expect(isAdsensePublisherContentPath(path)).toBe(false)
  })

  it.each([
    "/guides",
    "/guides/product-launch-checklist",
    "/guides/submit-product-to-directories",
    "/guides/startup-backlinks-domain-rating",
    "/users/example",
    "/member/products",
    "/legal/privacy-policy",
    "/pricing",
    "/tools",
    "/tools/seo-audit",
    "/tools/meta-tag-generator",
    "/tools/unknown",
    "/tools/seo-audit/results",
    "/platforms/web/other",
    "/trends",
    "/verified",
    "/tags/developer-tools/other",
    "/leaderboard/about",
    "/products/example/updates",
    "/categories-other",
    "/api/search/suggestions",
  ])("keeps Carbon off %s", (path) => {
    expect(isCarbonDiscoveryPath(path)).toBe(false)
  })

  it("permits the actual vendor tag and serving endpoints in CSP", async () => {
    const headers = await nextConfig.headers!()
    const csp = headers
      .flatMap((rule) => rule.headers)
      .find((header) => header.key === "Content-Security-Policy")!.value
    const directives = Object.fromEntries(
      csp.split("; ").map((directive) => {
        const [name, ...sources] = directive.split(" ")
        return [name, sources]
      }),
    )
    expect(directives["script-src"]).toContain("https://cdn.carbonads.com")
    expect(directives["script-src"]).toContain("https://cdn4.buysellads.net")
    expect(directives["connect-src"]).toContain("https://srv.carbonads.net")
    expect(directives["connect-src"]).toContain("https://srv.buysellads.com")
    expect(directives["script-src"]).not.toContain("https:")
    expect(directives["connect-src"]).not.toContain("https:")
  })
})

import { describe, expect, it } from "vitest"

import robots from "@/app/robots"
import { buildProductListItem } from "@/lib/seo/product-list"
import { toAbsoluteUrlFromSite } from "@/lib/seo/base"
import {
  FILTERED_BROWSE_ROBOTS,
  hasBrowseSearchParams,
  isPlainUseCaseBrowseState,
} from "@/lib/browse/seo"
import nextConfig from "@/next.config"
import {
  dailyLeaderboardPath,
  monthlyLeaderboardArchivePath,
  monthlyLeaderboardPath,
  tagPath,
  weeklyLeaderboardPath,
} from "@/lib/routes"
import { keywordToSlug, legacyKeywordToSlug } from "@/lib/tags"

describe("toAbsoluteUrlFromSite", () => {
  it("returns undefined for empty input", () => {
    expect(
      toAbsoluteUrlFromSite("", "https://shipyard.example"),
    ).toBeUndefined()
  })

  it("keeps absolute URLs", () => {
    expect(
      toAbsoluteUrlFromSite(
        "https://example.com/a",
        "https://shipyard.example",
      ),
    ).toBe("https://example.com/a")
  })

  it("resolves relative paths against site URL", () => {
    expect(toAbsoluteUrlFromSite("/pricing", "https://shipyard.example")).toBe(
      "https://shipyard.example/pricing",
    )
  })

  it("handles invalid/odd URL values", () => {
    // Function does not validate already-absolute http(s) URLs.
    expect(
      toAbsoluteUrlFromSite("http://[invalid", "https://shipyard.example"),
    ).toBe("http://[invalid")

    // It should return undefined when the base site URL is invalid.
    expect(toAbsoluteUrlFromSite("/pricing", "not a url")).toBeUndefined()
  })
})

describe("buildProductListItem", () => {
  it("adds an offer for free products so Product snippets are valid", () => {
    const listItem = buildProductListItem({
      siteUrl: "https://shipyard.example",
      position: 1,
      product: {
        slug: "free-tool",
        name: "Free Tool",
        logo: "/logo.png",
        tagline: "A free tool",
        pricingModel: "free",
      },
    })

    expect(listItem.item).toMatchObject({
      "@type": "Product",
      "@id": "https://shipyard.example/products/free-tool#product",
      image: "https://shipyard.example/logo.png",
      offers: {
        "@type": "Offer",
        url: "https://shipyard.example/products/free-tool",
        price: "0",
        priceCurrency: "USD",
        availability: "https://schema.org/OnlineOnly",
      },
    })
  })

  it("uses concrete starting prices when present", () => {
    const listItem = buildProductListItem({
      siteUrl: "https://shipyard.example",
      position: 1,
      product: {
        slug: "paid-tool",
        name: "Paid Tool",
        logo: "https://cdn.example/logo.png",
        tagline: "A paid tool",
        pricingModel: "subscription",
        startingPriceCents: 1299,
        currencyCode: "eur",
      },
    })

    expect(listItem.item).toMatchObject({
      "@type": "Product",
      image: "https://cdn.example/logo.png",
      offers: {
        price: "12.99",
        priceCurrency: "EUR",
      },
    })
  })

  it("does not emit invalid Product markup when no offer price exists", () => {
    const listItem = buildProductListItem({
      siteUrl: "https://shipyard.example",
      position: 1,
      product: {
        slug: "custom-tool",
        name: "Custom Tool",
        logo: "/logo.png",
        tagline: "Custom pricing",
        pricingModel: "custom",
      },
    })

    expect(listItem.item).toMatchObject({
      "@type": "Thing",
      "@id": "https://shipyard.example/products/custom-tool#thing",
    })
    expect(listItem.item).not.toHaveProperty("offers")
  })
})

describe("crawler directives", () => {
  it("blocks redirect tracking paths from robots.txt", () => {
    const rules = robots().rules
    const publicRule = Array.isArray(rules) ? rules[0] : rules

    expect(publicRule.disallow).toContain("/r/")
    expect(publicRule.disallow).toContain("/_next/static/")
  })

  it("marks redirect and static asset endpoints as non-indexable", async () => {
    const headers = await nextConfig.headers?.()

    expect(headers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "/_next/static/:path*",
          headers: expect.arrayContaining([
            { key: "X-Robots-Tag", value: "noindex" },
          ]),
        }),
        expect.objectContaining({
          source: "/r/:path*",
          headers: expect.arrayContaining([
            { key: "X-Robots-Tag", value: "noindex, nofollow" },
          ]),
        }),
      ]),
    )
  })

  it("allows the production Clerk frontend domain in the content security policy", async () => {
    const headers = await nextConfig.headers?.()
    const globalHeaders = headers?.find((entry) => entry.source === "/(.*)")
    const csp = globalHeaders?.headers.find(
      (header) => header.key === "Content-Security-Policy",
    )?.value

    expect(csp).toContain("script-src")
    expect(csp).toContain("connect-src")
    expect(csp).toContain("frame-src")
    expect(csp).toContain("https://clerk.shipyardhq.dev")
  })

  it("keeps canonical browse indexable and marks filtered browse states noindex", () => {
    expect(hasBrowseSearchParams({})).toBe(false)
    expect(isPlainUseCaseBrowseState({ useCase: "launch-marketplace" })).toBe(
      true,
    )
    expect(
      isPlainUseCaseBrowseState({
        useCase: "launch-marketplace",
        page: "1",
        sort: "new",
      }),
    ).toBe(true)
    expect(
      hasBrowseSearchParams({
        tag: "ai-procesi-da871c",
        badge: "product-of-week-2",
        sort: "new",
        category: "developer-tools",
        pricingModel: "free",
      }),
    ).toBe(true)
    expect(
      isPlainUseCaseBrowseState({
        useCase: "launch-marketplace",
        tag: "ai-procesi-da871c",
        badge: "trending",
        sort: "votes",
        productType: "open-source",
        platform: "ios",
        category: "analytics",
        pricingModel: "free",
      }),
    ).toBe(false)

    expect(FILTERED_BROWSE_ROBOTS).toMatchObject({
      index: false,
      follow: true,
      googleBot: {
        index: false,
        follow: true,
      },
    })
  })
})

describe("canonical route helpers", () => {
  it("builds clean canonical paths for leaderboard archives", () => {
    expect(dailyLeaderboardPath(2025, 12, 29)).toBe(
      "/leaderboard/daily/2025/12/29",
    )
    expect(weeklyLeaderboardPath(2025, 52)).toBe("/leaderboard/weekly/2025/52")
    expect(monthlyLeaderboardPath(2025, 12)).toBe(
      "/leaderboard/monthly/2025/12",
    )
    expect(monthlyLeaderboardArchivePath("31-12-2025")).toBe(
      "/leaderboard/monthly/2025/12",
    )
  })

  it("builds clean canonical paths for tag detail pages", () => {
    expect(tagPath("ai-tools")).toBe("/tags/ai-tools")
    expect(keywordToSlug("Coloring Pages")).toBe("coloring-pages")
    expect(legacyKeywordToSlug("Coloring Pages")).toMatch(
      /^coloring-pages-[a-f0-9]{6}$/,
    )
  })
})

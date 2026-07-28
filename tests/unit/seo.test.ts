import { describe, expect, it } from "vitest"

import robots from "@/app/robots"
import { buildProductListItem } from "@/lib/seo/product-list"
import { toAbsoluteUrlFromSite } from "@/lib/seo/base"
import {
  FILTERED_BROWSE_ROBOTS,
  hasBrowseSearchParams,
  isPlainUseCaseBrowseState,
} from "@/lib/browse/seo"
import {
  buildProductStructuredData,
  resolveProductOfferFromPricing,
} from "@/lib/seo/product"
import { buildBreadcrumbListStructuredData } from "@/lib/seo/breadcrumbs"
import { buildWebApplicationStructuredData } from "@/lib/seo/web-application"
import { buildWebPageStructuredData } from "@/lib/seo/webpage"
import nextConfig from "@/next.config"
import {
  dailyLeaderboardPath,
  monthlyLeaderboardArchivePath,
  monthlyLeaderboardPath,
  tagPath,
  weeklyLeaderboardPath,
} from "@/lib/routes"
import { keywordToSlug, legacyKeywordToSlug } from "@/lib/tags"
import {
  canonicalForInventoryCount,
  MIN_INDEXABLE_PRODUCTS,
  NOINDEX_FOLLOW_ROBOTS,
  robotsForInventoryCount,
} from "@/lib/seo/indexing"
import {
  TAG_MIN_INDEXABLE_PRODUCTS,
  isTagIndexable,
  tagRobotsForProductCount,
} from "@/lib/tags/indexing"

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
  it("uses neutral Thing markup in directory lists to avoid Product snippet errors", () => {
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
      "@type": "Thing",
      "@id": "https://shipyard.example/products/free-tool#thing",
      image: "https://shipyard.example/logo.png",
    })
    expect(listItem.item).not.toHaveProperty("offers")
  })

  it("does not emit Product or Offer markup from list item prices", () => {
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
      "@type": "Thing",
      image: "https://cdn.example/logo.png",
    })
    expect(listItem.item).not.toHaveProperty("offers")
  })

  it("keeps custom-priced list items as plain directory entities", () => {
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

describe("product detail structured data", () => {
  it("resolves Product offers from existing pricing metadata only", () => {
    expect(
      resolveProductOfferFromPricing({
        pricingModel: "free",
        currencyCode: "usd",
      }),
    ).toEqual({ price: "0", priceCurrency: "USD" })
    expect(
      resolveProductOfferFromPricing({
        pricingModel: "subscription",
        startingPriceCents: 1299,
        currencyCode: "eur",
      }),
    ).toEqual({ price: "12.99", priceCurrency: "EUR" })
    expect(
      resolveProductOfferFromPricing({
        pricingModel: "custom",
        currencyCode: "USD",
      }),
    ).toBeUndefined()
  })

  it("emits richer product entity data without reviews or ratings by default", () => {
    const structuredData = buildProductStructuredData({
      path: "/products/embed-bot",
      id: "http://localhost:3000/products/embed-bot#product",
      name: "Embed-Bot",
      description: "AI customer support for Slack and email.",
      image: ["/logo.png", "/screenshot.png"],
      logo: "/logo.png",
      category: "Customer Support",
      keywords: ["AI customer support", "Slack"],
      mainEntityOfPage: "http://localhost:3000/products/embed-bot#webpage",
      creator: {
        type: "Person",
        name: "Aminu Example",
        url: "/users/user_1",
      },
      manufacturer: {
        type: "Person",
        name: "Aminu Example",
        url: "/users/user_1",
      },
      brand: {
        type: "Organization",
        name: "Embed-Bot",
        url: "https://www.embed-bot.com",
        image: "/logo.png",
      },
      sameAs: ["https://www.embed-bot.com"],
      offers: {
        price: "39.00",
        priceCurrency: "USD",
      },
    })

    expect(structuredData).toMatchObject({
      "@type": "Product",
      "@id": "http://localhost:3000/products/embed-bot#product",
      mainEntityOfPage: "http://localhost:3000/products/embed-bot#webpage",
      logo: "http://localhost:3000/logo.png",
      creator: {
        "@type": "Person",
        name: "Aminu Example",
        url: "http://localhost:3000/users/user_1",
      },
      manufacturer: {
        "@type": "Person",
        name: "Aminu Example",
      },
      brand: {
        "@type": "Organization",
        name: "Embed-Bot",
        url: "https://www.embed-bot.com",
        logo: "http://localhost:3000/logo.png",
      },
      sameAs: ["https://www.embed-bot.com"],
      offers: {
        "@type": "Offer",
        price: "39.00",
        priceCurrency: "USD",
      },
    })
    expect(structuredData).not.toHaveProperty("review")
    expect(structuredData).not.toHaveProperty("aggregateRating")
  })

  it("does not emit product or application offers without a real price", () => {
    expect(
      buildProductStructuredData({
        name: "Custom Tool",
        offers: { priceCurrency: "USD" },
      }),
    ).not.toHaveProperty("offers")

    expect(
      buildWebApplicationStructuredData({
        name: "Custom Tool",
        offers: { priceCurrency: "USD" },
      }),
    ).not.toHaveProperty("offers")
  })

  it("describes free web tools with their language and concrete features", () => {
    const structuredData = buildWebApplicationStructuredData({
      path: "/tools/seo-audit",
      name: "Free SEO Audit",
      featureList: ["Technical checks", "Markdown export"],
      isAccessibleForFree: true,
      inLanguage: "en",
      offers: { price: 0, priceCurrency: "USD" },
    })

    expect(structuredData).toMatchObject({
      "@type": "WebApplication",
      "@id": "http://localhost:3000/tools/seo-audit#webapplication",
      featureList: ["Technical checks", "Markdown export"],
      isAccessibleForFree: true,
      inLanguage: "en",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
    })
  })

  it("links WebPage schema to the product entity", () => {
    const structuredData = buildWebPageStructuredData({
      path: "/products/embed-bot",
      id: "http://localhost:3000/products/embed-bot#webpage",
      name: "Embed-Bot",
      description: "AI customer support for Slack and email.",
      primaryImageOfPage: "/screenshot.png",
      mainEntity: {
        type: "Product",
        id: "http://localhost:3000/products/embed-bot#product",
      },
    })

    expect(structuredData).toMatchObject({
      "@type": "WebPage",
      "@id": "http://localhost:3000/products/embed-bot#webpage",
      primaryImageOfPage: {
        "@type": "ImageObject",
        url: "http://localhost:3000/screenshot.png",
      },
      mainEntity: {
        "@type": "Product",
        "@id": "http://localhost:3000/products/embed-bot#product",
      },
    })
  })

  it("can link WebPage schema by entity id without creating a partial typed node", () => {
    const structuredData = buildWebPageStructuredData({
      path: "/products/embed-bot",
      id: "http://localhost:3000/products/embed-bot#webpage",
      name: "Embed-Bot",
      mainEntity: {
        id: "http://localhost:3000/products/embed-bot#product",
      },
    })

    expect(structuredData).toMatchObject({
      "@type": "WebPage",
      "@id": "http://localhost:3000/products/embed-bot#webpage",
      mainEntity: {
        "@id": "http://localhost:3000/products/embed-bot#product",
      },
    })
    expect(structuredData.mainEntity).not.toHaveProperty("@type")
  })
})

describe("breadcrumb structured data", () => {
  it("infers a stable BreadcrumbList id from the current page crumb", () => {
    const breadcrumbs = buildBreadcrumbListStructuredData([
      { name: "Home", path: "/" },
      { name: "Leaderboard", path: "/leaderboard" },
      {
        name: "Best of July 2026",
        path: "/leaderboard/monthly/2026/7",
      },
    ])

    expect(breadcrumbs).toMatchObject({
      "@type": "BreadcrumbList",
      "@id": "http://localhost:3000/leaderboard/monthly/2026/7#breadcrumb",
      itemListElement: [
        {
          position: 1,
          name: "Home",
          item: { "@id": "http://localhost:3000/", name: "Home" },
        },
        {
          position: 2,
          name: "Leaderboard",
          item: {
            "@id": "http://localhost:3000/leaderboard",
            name: "Leaderboard",
          },
        },
        {
          position: 3,
          name: "Best of July 2026",
          item: {
            "@id": "http://localhost:3000/leaderboard/monthly/2026/7",
            name: "Best of July 2026",
          },
        },
      ],
    })
  })
})

describe("crawler directives", () => {
  it("blocks private and tracking paths without hiding canonical query signals", () => {
    const rules = robots().rules
    const publicRule = Array.isArray(rules) ? rules[0] : rules

    expect(publicRule.disallow).toContain("/r/")
    expect(publicRule.disallow).not.toContain("/browse?")
    expect(publicRule.disallow).not.toContain("/*?*sort=")
    expect(publicRule.disallow).not.toContain("/*?*verified=")
    expect(publicRule.disallow).not.toContain("/_next/static/")
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

  it("keeps Lighthouse on the cacheable metadata path", () => {
    expect(nextConfig.htmlLimitedBots).toBeInstanceOf(RegExp)
    expect(nextConfig.htmlLimitedBots?.test("Chrome-Lighthouse")).toBe(false)
    expect(nextConfig.htmlLimitedBots?.test("Twitterbot")).toBe(true)
    expect(nextConfig.htmlLimitedBots?.test("facebookexternalhit")).toBe(true)
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

  it("only indexes primary pSEO and tag pages with at least ten products", () => {
    expect(MIN_INDEXABLE_PRODUCTS).toBe(10)
    expect(TAG_MIN_INDEXABLE_PRODUCTS).toBe(10)

    expect(robotsForInventoryCount(9)).toMatchObject({
      index: false,
      follow: true,
      googleBot: {
        index: false,
        follow: true,
      },
    })
    expect(robotsForInventoryCount(10)).toBeUndefined()
    expect(
      canonicalForInventoryCount({
        canonical: "/categories/analytics/pricing/free",
        parent: "/categories/analytics",
        productCount: 9,
      }),
    ).toBe("/categories/analytics")
    expect(
      canonicalForInventoryCount({
        canonical: "/categories/analytics/pricing/free",
        parent: "/categories/analytics",
        productCount: 10,
      }),
    ).toBe("/categories/analytics/pricing/free")

    expect(isTagIndexable(9)).toBe(false)
    expect(isTagIndexable(10)).toBe(true)
    expect(tagRobotsForProductCount(9)).toMatchObject({
      index: false,
      follow: true,
      googleBot: {
        index: false,
        follow: true,
      },
    })
    expect(tagRobotsForProductCount(10)).toBeUndefined()
    expect(NOINDEX_FOLLOW_ROBOTS).toMatchObject({
      index: false,
      follow: true,
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

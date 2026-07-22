import { describe, expect, it } from "vitest"

import { isAdsensePublisherContentPath } from "@/lib/adsense/placement"

describe("AdSense publisher-content placement", () => {
  it("allows only substantial editorial guide pages", () => {
    expect(
      isAdsensePublisherContentPath("/guides/submit-product-to-directories"),
    ).toBe(true)
    expect(
      isAdsensePublisherContentPath("/guides/startup-backlinks-domain-rating/"),
    ).toBe(true)
  })

  it("keeps ads off directory, profile, product, and search inventory", () => {
    expect(isAdsensePublisherContentPath("/")).toBe(false)
    expect(isAdsensePublisherContentPath("/browse")).toBe(false)
    expect(isAdsensePublisherContentPath("/products/example")).toBe(false)
    expect(isAdsensePublisherContentPath("/users/example")).toBe(false)
    expect(isAdsensePublisherContentPath("/categories/ai-tools")).toBe(false)
  })
})

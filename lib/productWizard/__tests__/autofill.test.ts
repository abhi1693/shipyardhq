import { describe, expect, it } from "vitest"

import { normalizeProductAutofill } from "../autofill"

describe("normalizeProductAutofill", () => {
  it("maps common synonyms and sanitizes values", () => {
    const { suggestion, warnings } = normalizeProductAutofill({
      name: " Shipyard ",
      tagline: "Build faster ships",
      description: "  Collaborative devops platform.  ",
      logoUrl: "https://example.com/logo.png",
      productType: "SaaS platform for developers",
      pricingModel: "Monthly subscription",
      startingPriceCents: 2999,
      currencyCode: "usd",
      keywords: ["DevOps", " devops ", "Automation"],
      platforms: ["Web App", "iOS", "Nintendo"],
      categoryName: "Developer Tools",
      githubUrl: "https://github.com/shipyardhq/app",
      twitterUrl: "https://x.com/shipyard",
      demoUrl: "notaurl",
      contactEmail: "hello@shipyard.dev",
      ctaLabel: "Start trial",
      ctaUrl: "https://shipyard.dev/start",
    })

    expect(suggestion).toEqual({
      name: "Shipyard",
      tagline: "Build faster ships",
      description: "Collaborative devops platform.",
      logo: "https://example.com/logo.png",
      type: "saas",
      pricingModel: "subscription",
      startingPriceCents: 2999,
      currencyCode: "USD",
      keywords: ["DevOps", "Automation"],
      platforms: ["web", "ios"],
      categoryName: "Developer Tools",
      githubUrl: "https://github.com/shipyardhq/app",
      twitterUrl: "https://x.com/shipyard",
      contactEmail: "hello@shipyard.dev",
      ctaLabel: "Start trial",
      ctaUrl: "https://shipyard.dev/start",
    })

    expect(warnings).toEqual(["demoUrl rejected: invalid URL"])
  })

  it("drops unusable fields but keeps partial suggestions", () => {
    const { suggestion, warnings } = normalizeProductAutofill({
      name: "",
      tagline: null,
      description: null,
      logoUrl: "ftp://example.com/logo.png",
      productType: "unknown",
      pricingModel: "enterprise",
      startingPriceCents: -5,
      currencyCode: "usd -",
      keywords: [],
      platforms: ["chrome extension", "firefox extension", "random"],
      contactEmail: "invalid-email",
    })

    expect(suggestion).toEqual({
      platforms: ["chrome_extension", "firefox_extension"],
    })

    expect(warnings).toEqual([
      "logoUrl rejected: invalid URL",
      "productType ignored: unknown",
      "pricingModel ignored: enterprise",
      "currencyCode ignored: usd -",
      "contactEmail rejected: invalid email",
    ])
  })
})

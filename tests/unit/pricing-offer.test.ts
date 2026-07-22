import { describe, expect, it } from "vitest"

import {
  getDiscountedPriceCents,
  getPricingOfferPresentation,
  getPricingPlanCtaLabel,
  resolveInitialPricingPlanType,
  resolveRecommendedPlanId,
  selectPricingOfferPlans,
  type OfferPlan,
  type PricingPlanType,
} from "@/lib/pricing/offer"

function buildPlan({
  name,
  type,
  price,
  boostForDays,
  featureKeys = [],
  ...overrides
}: {
  name: string
  type: PricingPlanType
  price: number
  boostForDays: number
  featureKeys?: string[]
} & Partial<OfferPlan>): OfferPlan {
  const slug = overrides.slug ?? name.toLowerCase().replace(/ /g, "-")

  return {
    id: overrides.id ?? `${slug}-${type}`,
    name,
    slug,
    type,
    price,
    boostForDays,
    discount: overrides.discount ?? null,
    isDefault: overrides.isDefault ?? false,
    features: featureKeys.map((key) => ({
      id: `${slug}-${key}`,
      key,
      name: key,
      displayName: key,
      enabled: true,
    })),
  }
}

const free = buildPlan({
  name: "Free",
  type: "one_time_price",
  price: 0,
  boostForDays: 1,
  isDefault: true,
  featureKeys: ["analytics.basic", "product.sitemap"],
})
const spotlight = buildPlan({
  name: "Spotlight",
  type: "one_time_price",
  price: 499,
  boostForDays: 7,
  featureKeys: ["analytics.basic", "product.sitemap", "priorityPlacement"],
})
const featured = buildPlan({
  name: "Featured",
  type: "one_time_price",
  price: 999,
  boostForDays: 14,
  featureKeys: [
    "analytics.basic",
    "product.sitemap",
    "backlink",
    "featured",
    "priorityPlacement",
    "sponsoredProducts",
  ],
})
const featuredRecurring = buildPlan({
  name: "Featured",
  slug: "featured-recurring",
  type: "recurring_price",
  price: 899,
  boostForDays: 14,
  featureKeys: featured.features.map((feature) => feature.key),
})
const pro = buildPlan({
  name: "Pro",
  type: "one_time_price",
  price: 2499,
  boostForDays: 30,
  featureKeys: [
    ...featured.features.map((feature) => feature.key),
    "analytics.advanced",
    "product.aiSearchReady",
    "partnerSpotlight",
  ],
})
const proRecurring = buildPlan({
  name: "Pro",
  slug: "pro-recurring",
  type: "recurring_price",
  price: 2499,
  boostForDays: 30,
  featureKeys: pro.features.map((feature) => feature.key),
})

describe("pricing offer packaging", () => {
  it("defaults to a paid one-time offer when both cadences exist", () => {
    expect(
      resolveInitialPricingPlanType([
        free,
        featuredRecurring,
        proRecurring,
        featured,
        pro,
      ]),
    ).toBe("one_time_price")
  })

  it("falls back to recurring when it is the only paid cadence", () => {
    expect(
      resolveInitialPricingPlanType([free, featuredRecurring, proRecurring]),
    ).toBe("recurring_price")
  })

  it("shows Free, the 14-day Featured offer, and Pro together", () => {
    const selected = selectPricingOfferPlans(
      [free, spotlight, featured, pro, featuredRecurring, proRecurring],
      "one_time_price",
    )

    expect(selected.map((plan) => plan.name)).toEqual([
      "Free",
      "Featured",
      "Pro",
    ])
    expect(selected).not.toContain(spotlight)
  })

  it("uses Spotlight as the middle-tier fallback", () => {
    const selected = selectPricingOfferPlans(
      [free, spotlight, pro],
      "one_time_price",
    )

    expect(selected.map((plan) => plan.name)).toEqual([
      "Free",
      "Spotlight",
      "Pro",
    ])
    expect(resolveRecommendedPlanId(selected)).toBe(spotlight.id)
  })

  it("keeps Free beside the recurring paid plans", () => {
    const selected = selectPricingOfferPlans(
      [free, featured, pro, featuredRecurring, proRecurring],
      "recurring_price",
    )

    expect(selected).toEqual([free, featuredRecurring, proRecurring])
  })

  it("recommends Featured without making a popularity claim", () => {
    expect(resolveRecommendedPlanId([free, featured, pro])).toBe(featured.id)
    expect(resolveRecommendedPlanId([free])).toBeUndefined()
  })

  it("builds value-led CTAs from duration and charged price", () => {
    expect(getPricingPlanCtaLabel(free)).toBe("Launch free")
    expect(getPricingPlanCtaLabel(featured)).toBe(
      "Boost my launch for 14 days — $9.99",
    )
    expect(getPricingPlanCtaLabel(pro)).toBe(
      "Get 30 days + advanced insights — $24.99",
    )
    expect(getPricingPlanCtaLabel(spotlight)).toBe(
      "Boost my launch for 7 days — $4.99",
    )
  })

  it("uses the discounted price in the CTA", () => {
    const discountedFeatured = { ...featured, price: 2000, discount: 25 }

    expect(getDiscountedPriceCents(discountedFeatured)).toBe(1500)
    expect(getPricingPlanCtaLabel(discountedFeatured)).toBe(
      "Boost my launch for 14 days — $15",
    )
  })

  it("states incremental, implemented surfaces without a featured-badge claim", () => {
    const displayed = [free, featured, pro]
    const featuredOffer = getPricingOfferPresentation(featured, displayed)
    const proOffer = getPricingOfferPresentation(pro, displayed)

    expect(featuredOffer.intro).toBe("Everything in Free, plus…")
    expect(featuredOffer.items.map((item) => item.label)).toEqual(
      expect.arrayContaining([
        "Sponsored card in the homepage launch feed",
        "Direct website link with aggregate click tracking",
      ]),
    )
    expect(featuredOffer.items.map((item) => item.label).join(" ")).not.toMatch(
      /featured badge/i,
    )

    expect(proOffer.intro).toBe("Everything in Featured, plus…")
    expect(proOffer.items.map((item) => item.label)).toEqual(
      expect.arrayContaining([
        "AI crawler, device, browser & location insights",
        "AI-search ready badge + dedicated Markdown profile",
      ]),
    )
  })
})

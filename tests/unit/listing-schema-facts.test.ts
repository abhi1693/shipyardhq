import { describe, expect, it } from "vitest"
import { listingSchemaClassification } from "@/lib/seo/listing-classification"
import { resolveProductOfferFromPricing } from "@/lib/seo/product"

describe("listing entity classification", () => {
  it.each(["food donation page", "newsletter", "content site"])(
    "does not turn an unclassified %s into software because it has a Web platform",
    () => {
      expect(listingSchemaClassification("other", ["web"])).toEqual({
        softwareProduct: false,
        webApplication: false,
        mobileApplication: false,
      })
    },
  )
  it("does not infer an application from an open-source licensing label", () => {
    expect(listingSchemaClassification("open_source", ["web"])).toEqual({
      softwareProduct: false,
      webApplication: false,
      mobileApplication: false,
    })
  })
  it("retains web application markup for an explicitly classified SaaS with Web support", () => {
    expect(listingSchemaClassification("saas", ["web"])).toMatchObject({
      softwareProduct: true,
      webApplication: true,
    })
  })
  it("requires a mobile application classification and mobile platform for native markup", () => {
    expect(listingSchemaClassification("mobile_app", ["ios"])).toMatchObject({
      mobileApplication: true,
    })
    expect(listingSchemaClassification("saas", ["ios"])).toMatchObject({
      mobileApplication: false,
    })
    expect(listingSchemaClassification("mobile_app", ["web"])).toMatchObject({
      webApplication: false,
      mobileApplication: false,
    })
  })
  it("does not equate an API, desktop app or browser extension with a Web application", () => {
    for (const type of ["api", "desktop_app", "browser_extension"]) {
      expect(listingSchemaClassification(type, ["web"])).toMatchObject({
        softwareProduct: true,
        webApplication: false,
      })
    }
  })
})

describe("verified visible offer facts", () => {
  it.each(["free", "freemium", "custom"])(
    "does not infer a zero-dollar offer from %s alone",
    (pricingModel) => {
      expect(
        resolveProductOfferFromPricing({ pricingModel, currencyCode: "USD" }),
      ).toBeUndefined()
    },
  )
  it.each([undefined, null, "", "ZZZ", "not-currency"])(
    "does not invent USD for an unknown currency: %s",
    (currencyCode) => {
      expect(
        resolveProductOfferFromPricing({
          startingPriceCents: 100,
          currencyCode,
        }),
      ).toBeUndefined()
    },
  )
  it.each([-1, NaN, Infinity])(
    "omits an invalid price: %s",
    (startingPriceCents) => {
      expect(
        resolveProductOfferFromPricing({
          startingPriceCents,
          currencyCode: "USD",
        }),
      ).toBeUndefined()
    },
  )
  it("retains explicit free and paid offers with a known currency", () => {
    expect(
      resolveProductOfferFromPricing({
        startingPriceCents: 0,
        currencyCode: "USD",
      }),
    ).toEqual({ price: "0.00", priceCurrency: "USD" })
    expect(
      resolveProductOfferFromPricing({
        startingPriceCents: 1299,
        currencyCode: "eur",
      }),
    ).toEqual({ price: "12.99", priceCurrency: "EUR" })
  })
})

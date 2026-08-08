import { describe, expect, it } from "vitest"

import {
  productCardPath,
  productPath,
  productWebsiteRedirectPath,
  sponsoredProductRedirectPath,
} from "@/lib/routes"

describe("product card routes", () => {
  it("keeps regular product cards on the product detail page", () => {
    expect(productCardPath("example-product")).toBe(
      productPath("example-product"),
    )
    expect(productCardPath("example-product", { sponsored: false })).toBe(
      "/products/example-product",
    )
  })

  it("routes sponsored product cards through the sponsored redirect endpoint", () => {
    expect(productCardPath("example-product", { sponsored: true })).toBe(
      sponsoredProductRedirectPath("example-product"),
    )
    expect(productCardPath("example-product", { sponsored: true })).toBe(
      "/r/sponsored/example-product",
    )
  })

  it("exposes the direct product website redirect path", () => {
    expect(productWebsiteRedirectPath("example-product")).toBe(
      "/r/example-product",
    )
  })
})

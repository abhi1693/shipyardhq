import { describe, expect, it } from "vitest"
import {
  getAlternativeSeoDescription,
  getProductSeoTitle,
} from "@/lib/seo/editorial-metadata"

describe("product search titles", () => {
  it("uses a reviewed editorial title before the name", () => {
    expect(
      getProductSeoTitle({
        slug: "example",
        name: "Example",
        editorialTitle: "Example: scheduling for small teams",
      }),
    ).toBe("Example: scheduling for small teams")
  })
  it.each([
    "OmegleAppMe",
    "An unusually long but complete product name that should never be cut off in the middle of its last word",
  ])(
    "preserves the full identity of %s without a tagline or repeated section labels",
    (name) => {
      expect(getProductSeoTitle({ slug: "example", name })).toBe(name)
    },
  )
  it.each([undefined, null, "", "   ", "<br>"])(
    "uses an explicit fallback for missing names: %s",
    (name) => {
      expect(
        getProductSeoTitle({ slug: "missing", name, editorialTitle: " " }),
      ).toBe("Product listing")
    },
  )
  it("normalizes malformed whitespace and markup", () => {
    expect(
      getProductSeoTitle({ slug: "example", name: " <b>Example</b>\n Tool  " }),
    ).toBe("Example Tool")
  })
})

describe("alternative search descriptions", () => {
  it("describes the comparison instead of the incumbent", () => {
    const description = getAlternativeSeoDescription({
      slug: "product-hunt",
      name: "Product Hunt",
      count: 7,
    })
    expect(description).toContain("7 listed Product Hunt alternatives")
    expect(description).toContain("pricing models")
    expect(description).not.toMatch(/best|trusted|curated/i)
  })
  it("supports a dedicated reviewed description", () => {
    expect(
      getAlternativeSeoDescription({
        slug: "example",
        name: "Example",
        count: 3,
        editorialDescription: "Compare launch channels for indie makers.",
      }),
    ).toBe("Compare launch channels for indie makers.")
  })
  it.each([0, -1, NaN])(
    "describes missing inventory truthfully: %s",
    (count) => {
      expect(
        getAlternativeSeoDescription({
          slug: "example",
          name: "Example",
          count,
        }),
      ).toMatch(/^No published alternatives/)
    },
  )
})

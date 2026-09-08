import { describe, expect, it } from "vitest"

import type { ProductCardBase } from "@/components/molecules/ProductCard"
import {
  buildTaxonomyProductSections,
  mapProductCardBaseToTaxonomyFeedItem,
} from "@/components/templates/public/common/TaxonomyProductRows"

describe("taxonomy launch dates", () => {
  it("keeps UTC day and Sunday week boundaries and labels across timezones", () => {
    const products = [
      ["latest", "2026-09-08T00:05:00Z"],
      ["previous", "2026-09-07T23:50:00Z"],
      ["week", "2026-09-06T00:05:00Z"],
      ["earlier", "2026-09-05T23:50:00Z"],
    ].map(([id, publishedAt]) =>
      mapProductCardBaseToTaxonomyFeedItem({
        id,
        slug: id,
        name: id,
        logo: "",
        tagline: "A useful product",
        publishedAt,
        createdAt: publishedAt,
      } as ProductCardBase),
    )

    expect(
      buildTaxonomyProductSections(products, "2026-09-08T10:00:00Z").map(
        (section) => ({
          key: section.key,
          date: section.dateLabel,
          products: section.products.map((product) => product.id),
        }),
      ),
    ).toEqual([
      { key: "latest", date: "Sep 8, 2026", products: ["latest"] },
      { key: "previous", date: "Sep 7, 2026", products: ["previous"] },
      { key: "week", date: "Sep 6, 2026", products: ["week"] },
      { key: "earlier", date: "Sep 5, 2026", products: ["earlier"] },
    ])
  })
})

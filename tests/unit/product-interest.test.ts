import { describe, expect, it } from "vitest"

import { buildProductInterestBadges } from "@/lib/products/interest"

const interest = {
  pageViews: 2,
  pageViewChangeRatio: 0,
  visitors: 3,
  repeatVisits: 0,
}

describe("product interest visit badge", () => {
  it("labels the stored visitor signal as visits", () => {
    expect(buildProductInterestBadges(interest)).toContainEqual(
      expect.objectContaining({
        key: "visit-count",
        label: "3 visits",
      }),
    )
  })

  it("respects the visit count visibility options", () => {
    expect(
      buildProductInterestBadges(interest, { includeVisitCount: false }),
    ).toEqual([])
    expect(buildProductInterestBadges(interest, { minVisitCount: 4 })).toEqual(
      [],
    )
  })
})

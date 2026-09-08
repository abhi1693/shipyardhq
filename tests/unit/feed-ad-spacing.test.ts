import { describe, expect, it } from "vitest"
import { canPlaceFeedAdAfter, feedAdIndex } from "@/lib/ads/feed"

const regular = {}
const sponsored = { isSponsored: true }
const products = (pattern: string) =>
  [...pattern].map((entry) => (entry === "S" ? sponsored : regular))

describe("Feed ad placement spacing", () => {
  it.each([
    ["", -1],
    ["O", 0],
    ["SOO", -1],
    ["SOOO", 3],
    ["OOOS", -1],
    ["OOOOS", 0],
    ["OSOOO", 4],
    ["SOOOOOS", -1],
    ["SOOOOOOS", 3],
    ["SSOOO", 4],
  ])("finds the earliest spaced position in %s", (pattern, expected) => {
    expect(feedAdIndex(products(pattern))).toBe(expected)
  })

  it("accounts for sponsors across section boundaries", () => {
    expect(feedAdIndex(products("OOO"), { before: products("S") })).toBe(2)
    expect(feedAdIndex(products("OOO"), { after: products("S") })).toBe(-1)
    expect(
      feedAdIndex(products("OOOOOO"), {
        before: products("S"),
        after: products("S"),
      }),
    ).toBe(2)
    expect(feedAdIndex(products("O"), { before: products("SOO") })).toBe(0)
  })

  it("checks a fixed grid-end placement separately from an in-list position", () => {
    expect(canPlaceFeedAdAfter(products("OOO"), 2)).toBe(true)
    expect(canPlaceFeedAdAfter(products("SOO"), 2)).toBe(false)
    expect(
      canPlaceFeedAdAfter(products("OOO"), 2, { after: products("SOOO") }),
    ).toBe(false)
  })

  it("never leaves fewer than three regular products between Carbon and a sponsor", () => {
    for (let count = 1; count <= 9; count++) {
      for (let mask = 0; mask < 2 ** count; mask++) {
        const items = Array.from({ length: count }, (_, i) =>
          mask & (1 << i) ? sponsored : regular,
        )
        const index = feedAdIndex(items)
        const sponsorIndices = items.flatMap((item, i) =>
          item === sponsored ? [i] : [],
        )
        const safe = (position: number) =>
          sponsorIndices.every((sponsorIndex) =>
            sponsorIndex <= position
              ? position - sponsorIndex >= 3
              : sponsorIndex - position - 1 >= 3,
          )
        if (index >= 0) expect(safe(index)).toBe(true)
        else expect(items.some((_, position) => safe(position))).toBe(false)
      }
    }
  })
})

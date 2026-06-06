import { describe, expect, it } from "vitest"

import { pickWeightedBySeed, stableUnitInterval } from "@/lib/stable-random"

describe("stable random helpers", () => {
  it("returns the same unit interval value for the same seed", () => {
    const first = stableUnitInterval("shipyard:seed")
    const second = stableUnitInterval("shipyard:seed")

    expect(first).toBe(second)
    expect(first).toBeGreaterThanOrEqual(0)
    expect(first).toBeLessThanOrEqual(1)
  })

  it("picks weighted items deterministically", () => {
    const items = [
      { id: "a", weight: 1 },
      { id: "b", weight: 3 },
      { id: "c", weight: 1 },
    ] as const

    const first = pickWeightedBySeed(items, "daily-seed", (item) => item.weight)
    const second = pickWeightedBySeed(
      items,
      "daily-seed",
      (item) => item.weight,
    )

    expect(first).toBe(second)
    expect(items).toContain(first)
  })

  it("falls back to the first item when all weights are zero", () => {
    const items = [
      { id: "a", weight: 0 },
      { id: "b", weight: 0 },
    ] as const

    expect(pickWeightedBySeed(items, "seed", (item) => item.weight)).toBe(
      items[0],
    )
  })
})

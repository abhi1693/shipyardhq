import { describe, expect, it } from "vitest"

import { computeTrendRadarMetrics } from "@/lib/trend-radar"

describe("computeTrendRadarMetrics", () => {
  it("normalizes metrics and aggregates totals", () => {
    const { metrics, totals } = computeTrendRadarMetrics(
      [
        { id: "1", slug: "automation", name: "Automation", productCount: 12 },
        { id: "2", slug: "marketing", name: "Marketing", productCount: 8 },
        { id: "3", slug: "finance", name: "Finance", productCount: 4 },
      ],
      [
        { categoryName: "Automation", upvotes: 45 },
        { categoryName: "Automation", upvotes: 15 },
        { categoryName: "Marketing", upvotes: 20 },
      ],
      { totalProducts: 40 },
    )

    expect(metrics).toHaveLength(3)

    const automation = metrics.find((item) => item.slug === "automation")
    expect(automation).toBeDefined()
    expect(automation?.trendingCount).toBe(2)
    expect(automation?.trendingUpvotes).toBe(60)
    expect(automation?.catalogShare).toBeCloseTo(0.3, 5)
    expect(automation?.normalizedDepth).toBe(100)
    expect(automation?.normalizedMomentum).toBe(100)
    expect(automation?.normalizedSignal).toBe(100)
    expect(automation?.momentumPerProduct).toBeCloseTo(0.17, 2)
    expect(automation?.upvotesPerLaunch).toBeCloseTo(5, 5)

    const marketing = metrics.find((item) => item.slug === "marketing")
    expect(marketing).toBeDefined()
    expect(marketing?.normalizedMomentum).toBeLessThan(
      automation!.normalizedMomentum,
    )

    expect(totals).toEqual({
      products: 24,
      trendingProducts: 3,
      upvotes: 80,
    })
  })

  it("falls back to depth when momentum and signal data are missing", () => {
    const { metrics } = computeTrendRadarMetrics(
      [
        { id: "1", slug: "automation", name: "Automation", productCount: 10 },
        { id: "2", slug: "marketing", name: "Marketing", productCount: 5 },
      ],
      [],
      { totalProducts: 30 },
    )

    const automation = metrics.find((item) => item.slug === "automation")
    const marketing = metrics.find((item) => item.slug === "marketing")

    expect(automation?.normalizedMomentum).toBe(100)
    expect(marketing?.normalizedMomentum).toBeLessThan(
      automation!.normalizedMomentum,
    )
    expect(marketing?.normalizedSignal).toBeLessThan(
      automation!.normalizedSignal,
    )
  })
})

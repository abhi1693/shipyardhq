import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/prisma", () => ({ default: {} }))

import { buildProductAiCrawlerAttention } from "@/lib/server/analytics/productAiCrawlerAttention"

describe("product AI crawler attention", () => {
  it("builds product-level category and daily attention from stored endpoints", () => {
    const attention = buildProductAiCrawlerAttention({
      totalProductRequests: 200,
      dateRange: { startDate: "2026-07-12", endDate: "2026-07-14" },
      rows: [
        {
          date: new Date("2026-07-12T00:00:00Z"),
          category: "AI Crawler",
          endpoint: "/products/launchpad",
          matchedEndpoint: "/products/:slug",
          managedLabels: ["cf-llm"],
          requests: 30,
        },
        {
          date: new Date("2026-07-14T00:00:00Z"),
          category: "AI Search",
          endpoint: "/products/launchpad",
          matchedEndpoint: "/products/:slug",
          managedLabels: ["cf-llm", "cf-content"],
          requests: 10,
        },
        {
          date: new Date("2026-07-14T00:00:00Z"),
          category: "Search Engine Crawler",
          endpoint: "/products/launchpad",
          matchedEndpoint: "",
          managedLabels: [],
          requests: 100,
        },
      ],
    })

    expect(attention.totalRequests).toBe(40)
    expect(attention.shareOfProductTraffic).toBe(20)
    expect(attention.activeDays).toBe(2)
    expect(attention.categories).toEqual([
      { category: "AI Crawler", requests: 30, share: 75 },
      { category: "AI Search", requests: 10, share: 25 },
    ])
    expect(attention.timeseries.map((point) => point.requests)).toEqual([
      30, 0, 10,
    ])
    expect(attention.matchedEndpoints).toEqual(["/products/:slug"])
    expect(attention.managedLabels).toEqual(["cf-content", "cf-llm"])
  })
})

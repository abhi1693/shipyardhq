import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  createMany: vi.fn(),
  deleteMany: vi.fn(),
  findMany: vi.fn(),
  queryCloudflareHttpGroups: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({
  default: {
    product: { findMany: mocks.findMany },
    productTrafficDaily: {
      createMany: mocks.createMany,
      deleteMany: mocks.deleteMany,
    },
  },
}))

vi.mock("@/lib/server/analytics/cloudflareAnalytics", () => ({
  queryCloudflareHttpGroups: mocks.queryCloudflareHttpGroups,
}))

import { syncProductTrafficDaily } from "@/lib/server/analytics/ingestion/productTrafficDaily"

describe("product traffic scoring ingestion", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.findMany.mockResolvedValue([{ id: "product-1", slug: "example" }])
    mocks.deleteMany.mockResolvedValue({ count: 0 })
    mocks.createMany.mockResolvedValue({ count: 1 })
  })

  it("stores raw totals while scoring only regular browser traffic", async () => {
    mocks.queryCloudflareHttpGroups
      .mockResolvedValueOnce([
        {
          count: 100,
          sum: { visits: 50 },
          dimensions: {
            date: "2026-07-14",
            clientRequestPath: "/products/example",
          },
        },
      ])
      .mockResolvedValueOnce([
        {
          count: 40,
          sum: { visits: 20 },
          dimensions: {
            date: "2026-07-14",
            clientRequestPath: "/products/example",
            userAgentBrowser: "Chrome",
            requestSource: "eyeball",
          },
        },
        {
          count: 50,
          sum: { visits: 25 },
          dimensions: {
            date: "2026-07-14",
            clientRequestPath: "/products/example",
            verifiedBotCategory: "AI Crawler",
            userAgentBrowser: "Chrome",
            requestSource: "eyeball",
          },
        },
        {
          count: 10,
          sum: { visits: 5 },
          dimensions: {
            date: "2026-07-14",
            clientRequestPath: "/products/example",
            userAgentBrowser: "Unknown",
            requestSource: "earlyHintsCache",
          },
        },
      ])

    await syncProductTrafficDaily({
      window: {
        start: new Date("2026-07-14T00:00:00Z"),
        end: new Date("2026-07-14T00:00:00Z"),
        startDate: "2026-07-14",
        endDate: "2026-07-14",
        days: 1,
      },
    })

    expect(mocks.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          pageViews: 100,
          uniqueVisitors: 50,
          browserRequests: 40,
          browserVisits: 20,
        }),
      ],
    })
  })
})

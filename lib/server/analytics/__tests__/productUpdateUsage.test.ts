import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const prismaMock = vi.hoisted(() => ({
  productUpdate: {
    count: vi.fn(),
    findMany: vi.fn(),
  },
}))

vi.mock("@/lib/prisma", () => ({
  default: prismaMock,
}))

import { getProductUpdateUsageSummary } from "@/lib/server/analytics/productUpdateUsage"

describe("getProductUpdateUsageSummary", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2024-03-10T12:00:00Z"))
    prismaMock.productUpdate.count.mockReset()
    prismaMock.productUpdate.findMany.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("aggregates usage metrics from existing product updates", async () => {
    prismaMock.productUpdate.count
      .mockResolvedValueOnce(12) // total updates
      .mockResolvedValueOnce(8) // total published
      .mockResolvedValueOnce(4) // total drafts
      .mockResolvedValueOnce(2) // previous created
      .mockResolvedValueOnce(1) // previous published

    prismaMock.productUpdate.findMany
      .mockResolvedValueOnce([
        { productId: "prod-1" },
        { productId: "prod-2" },
        { productId: "prod-3" },
        { productId: "prod-4" },
        { productId: "prod-5" },
      ])
      .mockResolvedValueOnce([
        {
        id: "upd-1",
        title: "Shipped new onboarding",
        status: "published",
        createdAt: new Date("2024-03-05T12:00:00Z"),
        publishedAt: new Date("2024-03-06T09:00:00Z"),
        productId: "prod-1",
        product: { id: "prod-1", name: "Voyager", slug: "voyager" },
      },
      {
        id: "upd-2",
        title: "Improved dashboard",
        status: "draft",
        createdAt: new Date("2024-03-08T14:30:00Z"),
        publishedAt: null,
        productId: "prod-1",
        product: { id: "prod-1", name: "Voyager", slug: "voyager" },
      },
      {
        id: "upd-3",
        title: "Billing revamp",
        status: "published",
        createdAt: new Date("2024-03-02T16:00:00Z"),
        publishedAt: new Date("2024-03-09T10:15:00Z"),
        productId: "prod-2",
        product: { id: "prod-2", name: "Harbor", slug: "harbor" },
      },
    ])

    const summary = await getProductUpdateUsageSummary(7)

    expect(prismaMock.productUpdate.count).toHaveBeenCalledTimes(5)

    expect(prismaMock.productUpdate.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        distinct: ["productId"],
        select: { productId: true },
      }),
    )
    expect(prismaMock.productUpdate.findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.any(Array),
        }),
      }),
    )

    expect(summary.totals.range.created).toBe(2)
    expect(summary.totals.range.published).toBe(2)
    expect(summary.totals.range.drafts).toBe(1)

    expect(summary.totals.allTime.updates).toBe(12)
    expect(summary.totals.allTime.published).toBe(8)
    expect(summary.totals.allTime.drafts).toBe(4)
    expect(summary.totals.allTime.productsWithUpdates).toBe(5)

    expect(summary.perProduct.activeProducts).toBe(2)
    expect(summary.perProduct.averageCreatedPerActiveProduct).toBeCloseTo(
      1,
      5,
    )

    expect(summary.perProduct.topProducts[0]).toMatchObject({
      productId: "prod-1",
      created: 2,
      published: 1,
    })

    expect(summary.recentActivity.map((item) => item.updateId)).toEqual([
      "upd-3",
      "upd-2",
      "upd-1",
    ])

    const createdMarch8 = summary.trend.find(
      (point) => point.date === "2024-03-08",
    )
    expect(createdMarch8?.created).toBe(1)

    const publishedMarch9 = summary.trend.find(
      (point) => point.date === "2024-03-09",
    )
    expect(publishedMarch9?.published).toBe(1)
  })
})

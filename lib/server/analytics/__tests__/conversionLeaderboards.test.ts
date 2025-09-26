import { beforeEach, describe, expect, it, vi } from "vitest"

const prismaMocks = vi.hoisted(() => ({
  productTrafficEvent: {
    groupBy: vi.fn(),
  },
  productClickEvent: {
    groupBy: vi.fn(),
  },
  productUpvote: {
    groupBy: vi.fn(),
  },
  product: {
    findMany: vi.fn(),
  },
}))

const cacheHitMock = vi.hoisted(() => vi.fn())
const cacheMissMock = vi.hoisted(() => vi.fn())

vi.mock("@/lib/prisma", () => ({
  default: prismaMocks,
}))

vi.mock("@/lib/server/cache", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/server/cache")>(
      "@/lib/server/cache",
    )
  return {
    ...actual,
    cacheHit: cacheHitMock,
    cacheMiss: cacheMissMock,
  }
})

import { getConversionLeaderboards } from "@/lib/server/analytics/conversionLeaderboards"

describe("getConversionLeaderboards", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2024-05-01T00:00:00.000Z"))

    cacheHitMock.mockReset()
    cacheMissMock.mockReset()
    cacheHitMock.mockResolvedValue(null)
    cacheMissMock.mockResolvedValue(undefined)

    prismaMocks.productTrafficEvent.groupBy.mockReset()
    prismaMocks.productClickEvent.groupBy.mockReset()
    prismaMocks.productUpvote.groupBy.mockReset()
    prismaMocks.product.findMany.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("returns cached leaderboards when available", async () => {
    const cached = {
      products: { topCtr: [], topUpvoteRate: [], fastestGrowing: [] },
      categories: { topCtr: [], topUpvoteRate: [], fastestGrowing: [] },
    }
    cacheHitMock.mockResolvedValueOnce(cached)

    const result = await getConversionLeaderboards(14)

    expect(result).toBe(cached)
    expect(prismaMocks.productTrafficEvent.groupBy).not.toHaveBeenCalled()
    expect(cacheMissMock).not.toHaveBeenCalled()
  })

  it("computes leaderboards and caches the result on miss", async () => {
    prismaMocks.productTrafficEvent.groupBy
      .mockResolvedValueOnce([{ productId: "prod-a", _count: { _all: 40 } }])
      .mockResolvedValueOnce([{ productId: "prod-a", _count: { _all: 20 } }])
    prismaMocks.productClickEvent.groupBy
      .mockResolvedValueOnce([{ productId: "prod-a", _count: { _all: 10 } }])
      .mockResolvedValueOnce([{ productId: "prod-a", _count: { _all: 5 } }])
    prismaMocks.productUpvote.groupBy
      .mockResolvedValueOnce([{ productId: "prod-a", _count: { _all: 8 } }])
      .mockResolvedValueOnce([{ productId: "prod-a", _count: { _all: 2 } }])
    prismaMocks.product.findMany.mockResolvedValueOnce([
      {
        id: "prod-a",
        name: "Alpha",
        slug: "alpha",
        categoryId: "cat-1",
        category: { id: "cat-1", name: "Automation" },
      },
    ])

    const result = await getConversionLeaderboards(7)

    expect(result.products.topCtr[0]).toMatchObject({ id: "prod-a" })
    expect(result.categories.topCtr[0]).toMatchObject({ id: "cat-1" })

    expect(cacheMissMock).toHaveBeenCalledWith(
      expect.objectContaining({
        key: expect.stringContaining("analytics:conversionLeaderboards"),
        ttlSeconds: 3600,
      }),
    )
  })
})

import { beforeEach, describe, expect, it, vi } from "vitest"

const prismaMock = vi.hoisted(() => ({
  product: {
    findUnique: vi.fn(),
  },
}))

const cacheHitMock = vi.hoisted(() => vi.fn())
const cacheMissMock = vi.hoisted(() => vi.fn())

vi.mock("@/lib/prisma", () => ({
  default: prismaMock,
}))

vi.mock("@/lib/server/cache", async () => {
  const actual = await vi.importActual<typeof import("@/lib/server/cache")>(
    "@/lib/server/cache",
  )
  return {
    ...actual,
    cacheHit: cacheHitMock,
    cacheMiss: cacheMissMock,
  }
})

import {
  getProductAnalyticsRecord,
  toProductAnalyticsViewProduct,
} from "@/lib/server/analytics/productAnalytics"

describe("productAnalytics", () => {
  beforeEach(() => {
    prismaMock.product.findUnique.mockReset()
    cacheHitMock.mockReset()
    cacheMissMock.mockReset()
    cacheHitMock.mockResolvedValue(null)
    cacheMissMock.mockResolvedValue(undefined)
  })

  it("fetches a product analytics record by id", async () => {
    prismaMock.product.findUnique.mockResolvedValue({ id: "prod-1" })

    const record = await getProductAnalyticsRecord("prod-1")

    expect(prismaMock.product.findUnique).toHaveBeenCalledWith({
      where: { id: "prod-1" },
      select: expect.any(Object),
    })
    expect(record).toEqual({ id: "prod-1" })
    expect(cacheMissMock).toHaveBeenCalledWith(
      expect.objectContaining({
        key: expect.stringContaining("analytics:productAnalytics:prod-1"),
        ttlSeconds: 60,
      }),
    )
  })

  it("returns cached record when available", async () => {
    const cached = { id: "cached" } as any
    cacheHitMock.mockResolvedValueOnce(cached)

    const result = await getProductAnalyticsRecord("prod-2")

    expect(result).toBe(cached)
    expect(prismaMock.product.findUnique).not.toHaveBeenCalled()
    expect(cacheMissMock).not.toHaveBeenCalled()
  })

  it("maps the record into a view-friendly shape", () => {
    const now = new Date()
    const record = {
      id: "prod-2",
      slug: "product-two",
      name: "Product Two",
      createdAt: now,
      updatedAt: now,
      analytics: { upvotes: 12, clicks: 34 },
    } as any

    const view = toProductAnalyticsViewProduct(record)

    expect(view).toEqual({
      id: "prod-2",
      slug: "product-two",
      name: "Product Two",
      createdAt: now,
      updatedAt: now,
      analytics: { upvotes: 12, clicks: 34 },
    })
  })

})

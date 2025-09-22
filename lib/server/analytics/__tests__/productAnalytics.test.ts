import { beforeEach, describe, expect, it, vi } from "vitest"

const prismaMock = vi.hoisted(() => ({
  product: {
    findUnique: vi.fn(),
  },
}))

vi.mock("@/lib/prisma", () => ({
  default: prismaMock,
}))

import {
  getProductAnalyticsRecord,
  toProductAnalyticsViewProduct,
} from "@/lib/server/analytics/productAnalytics"

describe("productAnalytics", () => {
  beforeEach(() => {
    prismaMock.product.findUnique.mockReset()
  })

  it("fetches a product analytics record by id", async () => {
    prismaMock.product.findUnique.mockResolvedValue({ id: "prod-1" })

    const record = await getProductAnalyticsRecord("prod-1")

    expect(prismaMock.product.findUnique).toHaveBeenCalledWith({
      where: { id: "prod-1" },
      select: expect.any(Object),
    })
    expect(record).toEqual({ id: "prod-1" })
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

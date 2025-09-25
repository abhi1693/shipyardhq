import { beforeEach, describe, expect, it, vi } from "vitest"

const prismaMock = vi.hoisted(() => ({
  productReview: {
    findMany: vi.fn(),
    aggregate: vi.fn(),
    upsert: vi.fn(),
  },
}))

vi.mock("@/lib/prisma", () => ({
  default: prismaMock,
}))

const cacheMock = vi.hoisted(() => ({
  accelerateTags: vi.fn((tags: string[]) => tags),
  cached: (fn: any) => fn,
  DEFAULT_TTL: { short: 60, medium: 120 },
  DEFAULT_SWR: { short: 60, medium: 120 },
  TAGS: {
    productReviews: "product-reviews",
    productReview: (id: string) => `product-review:${id}`,
  },
}))

vi.mock("@/lib/cache", () => cacheMock)

import {
  getProductReviewSummary,
  getProductReviewsForDigest,
  upsertProductReview,
} from "@/lib/server/productReviews"

describe("getProductReviewSummary", () => {
  beforeEach(() => {
    prismaMock.productReview.findMany.mockReset()
    prismaMock.productReview.aggregate.mockReset()
  })

  it("returns empty summary without querying prisma when productId is missing", async () => {
    const summary = await getProductReviewSummary("", 5)
    expect(summary).toEqual({ averageRating: 0, totalReviews: 0, reviews: [] })
    expect(prismaMock.productReview.findMany).not.toHaveBeenCalled()
    expect(prismaMock.productReview.aggregate).not.toHaveBeenCalled()
  })

  it("maps rows and aggregate data", async () => {
    const createdAt = new Date("2024-01-01T00:00:00Z")
    prismaMock.productReview.findMany.mockResolvedValue([
      {
        id: "rev-1",
        rating: 5,
        message: "Great",
        createdAt,
        updatedAt: createdAt,
        user: { id: "user-1", firstName: "Ada", lastName: "Lovelace" },
      },
    ])
    prismaMock.productReview.aggregate.mockResolvedValue({
      _avg: { rating: 4.66 },
      _count: { _all: 7 },
    })

    const summary = await getProductReviewSummary("prod-1", 10)

    expect(prismaMock.productReview.findMany).toHaveBeenCalledWith({
      where: { productId: "prod-1" },
      select: expect.any(Object),
      orderBy: { createdAt: "desc" },
      take: 10,
    })
    expect(prismaMock.productReview.aggregate).toHaveBeenCalledWith({
      where: { productId: "prod-1" },
      _avg: { rating: true },
      _count: { _all: true },
    })
    expect(summary).toEqual({
      averageRating: 4.7,
      totalReviews: 7,
      reviews: [
        {
          id: "rev-1",
          rating: 5,
          message: "Great",
          createdAt,
          updatedAt: createdAt,
          user: { id: "user-1", firstName: "Ada", lastName: "Lovelace" },
        },
      ],
    })
  })

  it("bounds the limit between 1 and 50", async () => {
    prismaMock.productReview.findMany.mockResolvedValue([])
    prismaMock.productReview.aggregate.mockResolvedValue({
      _avg: { rating: null },
      _count: { _all: 0 },
    })

    await getProductReviewSummary("prod-1", -5)
    expect(prismaMock.productReview.findMany).toHaveBeenCalledWith({
      where: { productId: "prod-1" },
      select: expect.any(Object),
      orderBy: { createdAt: "desc" },
      take: 1,
    })

    await getProductReviewSummary("prod-1", 99)
    expect(prismaMock.productReview.findMany).toHaveBeenLastCalledWith({
      where: { productId: "prod-1" },
      select: expect.any(Object),
      orderBy: { createdAt: "desc" },
      take: 50,
    })
  })
})

describe("upsertProductReview", () => {
  beforeEach(() => {
    prismaMock.productReview.upsert.mockReset()
  })

  it("persists trimmed payload and rounds rating", async () => {
    prismaMock.productReview.upsert.mockResolvedValue({ id: "rev-1" })

    await upsertProductReview({
      productId: "prod-1",
      userId: "user-1",
      rating: 4.4,
      message: "  Helpful tool  ",
    })

    expect(prismaMock.productReview.upsert).toHaveBeenCalledWith({
      where: { productId_userId: { productId: "prod-1", userId: "user-1" } },
      update: { rating: 4, message: "Helpful tool" },
      create: {
        productId: "prod-1",
        userId: "user-1",
        rating: 4,
        message: "Helpful tool",
      },
    })
  })

  it("throws when rating is outside bounds", async () => {
    await expect(
      upsertProductReview({
        productId: "prod-1",
        userId: "user-1",
        rating: 6,
        message: "Too high",
      }),
    ).rejects.toThrow("Rating must be between 0 and 5")
  })

  it("throws when message is blank", async () => {
    await expect(
      upsertProductReview({
        productId: "prod-1",
        userId: "user-1",
        rating: 3,
        message: "   ",
      }),
    ).rejects.toThrow("Message is required")
  })
})

describe("getProductReviewsForDigest", () => {
  beforeEach(() => {
    prismaMock.productReview.findMany.mockReset()
  })

  it("returns mapped rows with owner and reviewer info", async () => {
    const since = new Date("2024-02-01T00:00:00Z")
    const until = new Date("2024-02-02T00:00:00Z")
    const createdAt = new Date("2024-02-01T12:00:00Z")

    prismaMock.productReview.findMany.mockResolvedValue([
      {
        id: "rev-1",
        rating: 5,
        message: "Loved it",
        createdAt,
        product: {
          id: "prod-1",
          slug: "prod-1",
          name: "Product One",
          userId: "owner-1",
          user: {
            id: "owner-1",
            email: "owner@example.com",
            firstName: "Owner",
            lastName: "One",
          },
        },
        user: {
          id: "user-99",
          firstName: "Review",
          lastName: "Hero",
        },
      },
    ])

    const rows = await getProductReviewsForDigest(since, until)

    expect(prismaMock.productReview.findMany).toHaveBeenCalledWith({
      where: {
        createdAt: { gte: since, lt: until },
        product: { status: "published" },
      },
      orderBy: { createdAt: "asc" },
      select: expect.any(Object),
    })

    expect(rows).toEqual([
      {
        id: "rev-1",
        rating: 5,
        message: "Loved it",
        createdAt,
        product: {
          id: "prod-1",
          slug: "prod-1",
          name: "Product One",
          ownerId: "owner-1",
          owner: {
            id: "owner-1",
            email: "owner@example.com",
            firstName: "Owner",
            lastName: "One",
          },
        },
        reviewer: {
          id: "user-99",
          firstName: "Review",
          lastName: "Hero",
        },
      },
    ])
  })
})

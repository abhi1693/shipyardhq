import { describe, it, expect, beforeEach, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getActiveUser: vi.fn(),
  revalidateProduct: vi.fn(),
  revalidateLeaderboard: vi.fn(),
  queryRaw: vi.fn(),
}))

const prismaMock = vi.hoisted(() => ({
  productUpvote: {
    findUnique: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
  productAnalytics: {
    upsert: vi.fn(),
    update: vi.fn(),
  },
  $transaction: vi.fn(),
  $queryRaw: mocks.queryRaw,
}))

vi.mock("@/lib/cache/revalidate", () => ({
  revalidateProduct: mocks.revalidateProduct,
  revalidateLeaderboard: mocks.revalidateLeaderboard,
}))

vi.mock("@/lib/server/userStatus", () => ({
  getActiveUserByClerkId: mocks.getActiveUser,
  INACTIVE_ACCOUNT_MESSAGE: "Account is not active",
}))

vi.mock("@/lib/prisma", () => ({
  default: prismaMock,
}))

import { toggleProductUpvote } from "../upvote"

describe("toggleProductUpvote", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.getActiveUser.mockResolvedValue({ id: "user_123" })

    Object.values(prismaMock.productUpvote).forEach((fn) => fn.mockReset())
    Object.values(prismaMock.productAnalytics).forEach((fn) => fn.mockReset())
    prismaMock.$transaction.mockReset()
    mocks.queryRaw.mockReset()

    prismaMock.productUpvote.findUnique.mockResolvedValue(null)
    prismaMock.productUpvote.create.mockResolvedValue({ id: "product-upvote" })
    prismaMock.productUpvote.delete.mockResolvedValue({})
    prismaMock.productAnalytics.upsert.mockResolvedValue({
      productId: "prod_123",
    })
    prismaMock.productAnalytics.update.mockResolvedValue({
      productId: "prod_123",
    })

    prismaMock.$transaction.mockImplementation(async (operation: any) =>
      operation({
        productUpvote: {
          findUnique: prismaMock.productUpvote.findUnique,
          create: prismaMock.productUpvote.create,
          delete: prismaMock.productUpvote.delete,
        },
        productAnalytics: {
          upsert: prismaMock.productAnalytics.upsert,
          update: prismaMock.productAnalytics.update,
        },
      }),
    )
  })

  it("creates a new upvote when none exists", async () => {
    mocks.queryRaw.mockResolvedValueOnce([
      { upvotes: 5, upvoted: true, delta: 1 },
    ])

    const result = await toggleProductUpvote({
      productId: "prod_123",
      clerkUserId: "clerk_123",
    })

    expect(result).toEqual({ upvotes: 5, upvoted: true })
    expect(mocks.queryRaw).toHaveBeenCalledTimes(1)
    expect(mocks.revalidateProduct).toHaveBeenCalledWith("prod_123")
    expect(mocks.revalidateLeaderboard).toHaveBeenCalledTimes(1)
  })

  it("removes an existing upvote and clamps analytics count", async () => {
    prismaMock.productUpvote.findUnique.mockResolvedValue({ id: "existing" })

    mocks.queryRaw.mockResolvedValueOnce([
      { upvotes: 4, upvoted: false, delta: -1 },
    ])

    const result = await toggleProductUpvote({
      productId: "prod_123",
      clerkUserId: "clerk_123",
    })

    expect(result).toEqual({ upvotes: 4, upvoted: false })
    expect(mocks.queryRaw).toHaveBeenCalledTimes(1)
    expect(mocks.revalidateProduct).toHaveBeenCalledWith("prod_123")
    expect(mocks.revalidateLeaderboard).toHaveBeenCalledTimes(1)
  })
})

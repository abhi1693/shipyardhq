import { describe, it, expect, beforeEach, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
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

vi.mock("@clerk/nextjs/server", () => ({
  auth: mocks.auth,
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

import type { UpvoteState } from "../upvote"
import { upvoteProductAction } from "../upvote"

describe("upvoteProductAction", () => {
  const baseState: UpvoteState = { upvotes: 0, upvoted: false }

  beforeEach(() => {
    vi.clearAllMocks()

    mocks.auth.mockResolvedValue({ userId: "clerk_123" })
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
    const formData = new FormData()
    formData.set("productId", "prod_123")

    mocks.queryRaw.mockResolvedValueOnce([
      { upvotes: 5, upvoted: true, delta: 1 },
    ])

    const result = await upvoteProductAction(baseState, formData)

    expect(result).toEqual({ upvotes: 5, upvoted: true })
    expect(mocks.queryRaw).toHaveBeenCalledTimes(1)
    expect(mocks.revalidateProduct).toHaveBeenCalledWith("prod_123")
    expect(mocks.revalidateLeaderboard).toHaveBeenCalledTimes(1)
  })

  it("removes an existing upvote and clamps analytics count", async () => {
    const formData = new FormData()
    formData.set("productId", "prod_123")

    prismaMock.productUpvote.findUnique.mockResolvedValue({ id: "existing" })

    mocks.queryRaw.mockResolvedValueOnce([
      { upvotes: 4, upvoted: false, delta: -1 },
    ])

    const result = await upvoteProductAction(
      { upvotes: 5, upvoted: true },
      formData,
    )

    expect(result).toEqual({ upvotes: 4, upvoted: false })
    expect(mocks.queryRaw).toHaveBeenCalledTimes(1)
    expect(mocks.revalidateProduct).toHaveBeenCalledWith("prod_123")
    expect(mocks.revalidateLeaderboard).toHaveBeenCalledTimes(1)
  })
})

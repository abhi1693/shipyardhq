import { describe, it, expect, beforeEach, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getActiveUser: vi.fn(),
  revalidateProduct: vi.fn(),
  revalidateLeaderboard: vi.fn(),
  queryRaw: vi.fn(),
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
  default: {
    $queryRaw: mocks.queryRaw,
  },
}))

import type { UpvoteState } from "../upvote"
import { upvoteProductAction } from "../upvote"

describe("upvoteProductAction", () => {
  const baseState: UpvoteState = { upvotes: 0, upvoted: false }

  beforeEach(() => {
    vi.clearAllMocks()

    mocks.auth.mockResolvedValue({ userId: "clerk_123" })
    mocks.getActiveUser.mockResolvedValue({ id: "user_123" })
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

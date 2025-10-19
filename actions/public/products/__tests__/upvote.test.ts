import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getActiveUser: vi.fn(),
  toggleVoteState: vi.fn(),
}))

vi.mock("@/lib/server/userStatus", () => ({
  getActiveUserByClerkId: mocks.getActiveUser,
  INACTIVE_ACCOUNT_MESSAGE: "Account is not active",
}))

vi.mock("@/lib/server/productVotesStore", () => ({
  toggleVoteState: mocks.toggleVoteState,
}))

import { toggleProductUpvote } from "../upvote"

describe("toggleProductUpvote", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getActiveUser.mockResolvedValue({ id: "user_123" })
    mocks.toggleVoteState.mockResolvedValue({
      previousState: "not_upvoted",
      newState: "upvoted",
      upvotes: 5,
    })
  })

  it("returns mutation result when state changes", async () => {
    const result = await toggleProductUpvote({
      productId: "prod_123",
      clerkUserId: "clerk_123",
    })

    expect(result).toEqual({ upvotes: 5, upvoted: true })
    expect(mocks.toggleVoteState).toHaveBeenCalledWith({
      productId: "prod_123",
      userId: "user_123",
    })
  })

  it("returns current state when vote state does not change", async () => {
    mocks.toggleVoteState.mockResolvedValueOnce({
      previousState: "upvoted",
      newState: "upvoted",
      upvotes: 7,
    })

    const result = await toggleProductUpvote({
      productId: "prod_123",
      clerkUserId: "clerk_123",
    })

    expect(result).toEqual({ upvotes: 7, upvoted: true })
  })

  it("throws when user is inactive", async () => {
    mocks.getActiveUser.mockResolvedValueOnce(null)

    await expect(
      toggleProductUpvote({
        productId: "prod_123",
        clerkUserId: "clerk_123",
      }),
    ).rejects.toThrowError("Account is not active")
  })
})

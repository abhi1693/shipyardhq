import { beforeEach, describe, expect, it, vi } from "vitest"

const prismaMock = vi.hoisted(() => ({
  productUpvote: {
    findUnique: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
  productAnalytics: {
    upsert: vi.fn(),
    update: vi.fn(),
    findUnique: vi.fn(),
  },
  $transaction: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({
  default: prismaMock,
}))

import {
  getLiveUpvoteCount,
  resolveVoteState,
  setDesiredVoteState,
} from "@/lib/server/productVotesStore"

const upsertResponse = { productId: "prod-1" }
const updateResponse = { productId: "prod-1" }

describe("productVotesStore (direct)", () => {
  beforeEach(() => {
    Object.values(prismaMock.productUpvote).forEach((value) => value.mockReset())
    Object.values(prismaMock.productAnalytics).forEach((value) =>
      value.mockReset(),
    )
    prismaMock.$transaction.mockReset()
  })

  it("resolves upvoted state from database", async () => {
    prismaMock.productUpvote.findUnique.mockResolvedValueOnce({ id: "vote-1" })

    const result = await resolveVoteState("prod-1", "user-1")

    expect(result.currentState).toBe("upvoted")
    expect(result.persistedState).toBe("upvoted")
  })

  it("resolves non-upvoted state when no record", async () => {
    prismaMock.productUpvote.findUnique.mockResolvedValueOnce(null)

    const result = await resolveVoteState("prod-1", "user-1")

    expect(result.currentState).toBe("not_upvoted")
    expect(result.persistedState).toBe("not_upvoted")
  })

  it("creates an upvote when desired", async () => {
    prismaMock.productUpvote.findUnique.mockResolvedValueOnce(null)
    prismaMock.productUpvote.create.mockResolvedValueOnce({
      id: "vote-1",
      createdAt: new Date("2024-01-01T00:00:00.000Z"),
    })
    prismaMock.productAnalytics.upsert.mockResolvedValueOnce(upsertResponse)
    prismaMock.$transaction.mockImplementation(async (cb) => cb(prismaMock))

    const result = await setDesiredVoteState({
      productId: "prod-1",
      userId: "user-1",
      desiredState: "upvoted",
    })

    expect(prismaMock.productUpvote.create).toHaveBeenCalledWith({
      data: { productId: "prod-1", userId: "user-1" },
      select: { id: true, createdAt: true },
    })
    expect(prismaMock.productAnalytics.upsert).toHaveBeenCalled()
    expect(result).toBe("upvoted")
  })

  it("removes an upvote when desired state is not_upvoted", async () => {
    prismaMock.productUpvote.findUnique.mockResolvedValueOnce({ id: "vote-1" })
    prismaMock.productAnalytics.update.mockResolvedValueOnce(updateResponse)
    prismaMock.$transaction.mockImplementation(async (cb) => cb(prismaMock))

    const result = await setDesiredVoteState({
      productId: "prod-1",
      userId: "user-1",
      desiredState: "not_upvoted",
    })

    expect(prismaMock.productUpvote.delete).toHaveBeenCalledWith({
      where: { productId_userId: { productId: "prod-1", userId: "user-1" } },
    })
    expect(prismaMock.productAnalytics.update).toHaveBeenCalled()
    expect(result).toBe("not_upvoted")
  })

  it("returns analytics upvote count", async () => {
    prismaMock.productAnalytics.findUnique.mockResolvedValueOnce({
      upvotes: 10,
    })

    const count = await getLiveUpvoteCount("prod-1")
    expect(count).toBe(10)
  })

})

import { beforeEach, describe, expect, it, vi } from "vitest"

const dispatchEventMock = vi.hoisted(() => vi.fn())

const prismaMock = vi.hoisted(() => ({
  productUpvote: {
    findUnique: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
  productAnalytics: {
    upsert: vi.fn(),
    findUnique: vi.fn(),
  },
  $transaction: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({
  default: prismaMock,
}))

const registerEventHandlerMock = vi.hoisted(() => vi.fn())

vi.mock("@/lib/server/events", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/server/events")>()
  return {
    ...actual,
    dispatchEvent: dispatchEventMock,
    registerEventHandler: registerEventHandlerMock,
  }
})

import {
  getLiveUpvoteCount,
  resolveVoteState,
  setDesiredVoteState,
  toggleVoteState,
} from "@/lib/server/productVotesStore"

describe("productVotesStore (direct)", () => {
  beforeEach(() => {
    Object.values(prismaMock.productUpvote).forEach((value) => value.mockReset())
    Object.values(prismaMock.productAnalytics).forEach((value) =>
      value.mockReset(),
    )
    prismaMock.$transaction.mockReset()
    dispatchEventMock.mockReset()
    dispatchEventMock.mockResolvedValue(undefined)
    registerEventHandlerMock.mockReset()
    registerEventHandlerMock.mockImplementation(() => vi.fn())
  })

  it("resolves upvoted state from database", async () => {
    prismaMock.productUpvote.findUnique.mockResolvedValueOnce({ id: "vote-1" })

    const result = await resolveVoteState("prod-1", "user-1")

    expect(result).toEqual({
      currentState: "upvoted",
      persistedState: "upvoted",
    })
  })

  it("resolves not_upvoted state when no record exists", async () => {
    prismaMock.productUpvote.findUnique.mockResolvedValueOnce(null)

    const result = await resolveVoteState("prod-1", "user-1")

    expect(result).toEqual({
      currentState: "not_upvoted",
      persistedState: "not_upvoted",
    })
  })

  it("creates an upvote when target state is upvoted", async () => {
    prismaMock.productUpvote.findUnique.mockResolvedValueOnce(null)
    prismaMock.productUpvote.create.mockResolvedValueOnce({
      id: "vote-1",
      createdAt: new Date("2024-01-01T00:00:00.000Z"),
    })
    prismaMock.productAnalytics.upsert.mockResolvedValueOnce({ upvotes: 5 })
    prismaMock.$transaction.mockImplementation(async (cb) => cb(prismaMock))

    const state = await setDesiredVoteState({
      productId: "prod-1",
      userId: "user-1",
      desiredState: "upvoted",
    })

    expect(state).toBe("upvoted")
    expect(dispatchEventMock).toHaveBeenCalledWith(
      "product.upvoted",
      expect.objectContaining({
        productId: "prod-1",
        userId: "user-1",
        occurredAt: new Date("2024-01-01T00:00:00.000Z"),
      }),
    )
  })

  it("removes an upvote when target state is not_upvoted", async () => {
    const createdAt = new Date("2024-01-02T00:00:00.000Z")
    prismaMock.productUpvote.findUnique.mockResolvedValueOnce({
      id: "vote-1",
      createdAt,
    })
    prismaMock.productAnalytics.upsert.mockResolvedValueOnce({ upvotes: 4 })
    prismaMock.$transaction.mockImplementation(async (cb) => cb(prismaMock))

    const result = await toggleVoteState({
      productId: "prod-1",
      userId: "user-1",
    })

    expect(result).toEqual({
      previousState: "upvoted",
      newState: "not_upvoted",
      upvotes: 4,
    })
    expect(dispatchEventMock).toHaveBeenCalledWith(
      "product.downvoted",
      expect.objectContaining({
        productId: "prod-1",
        userId: "user-1",
      }),
    )
  })

  it("returns analytics upvote count", async () => {
    prismaMock.productAnalytics.findUnique.mockResolvedValueOnce({
      upvotes: 10,
    })

    const count = await getLiveUpvoteCount("prod-1")
    expect(count).toBe(10)
  })
})

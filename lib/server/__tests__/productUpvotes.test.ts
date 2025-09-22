import { beforeEach, describe, expect, it, vi } from "vitest"

const prismaMock = vi.hoisted(() => ({
  productUpvote: {
    findMany: vi.fn(),
  },
}))

vi.mock("@/lib/prisma", () => ({
  default: prismaMock,
}))

import { getRecentProductUpvoters } from "@/lib/server/productUpvotes"

describe("getRecentProductUpvoters", () => {
  beforeEach(() => {
    prismaMock.productUpvote.findMany.mockReset()
  })

  it("returns empty array when productId is missing", async () => {
    const result = await getRecentProductUpvoters("")
    expect(result).toEqual([])
    expect(prismaMock.productUpvote.findMany).not.toHaveBeenCalled()
  })

  it("maps prisma rows to summary shape", async () => {
    const rows = [
      {
        id: "upvote-1",
        createdAt: new Date("2024-01-01T00:00:00Z"),
        user: {
          id: "user-1",
          firstName: "Ada",
          lastName: "Lovelace",
          email: "ada@example.com",
        },
      },
    ]
    prismaMock.productUpvote.findMany.mockResolvedValue(rows)

    const result = await getRecentProductUpvoters("prod-1", 4)

    expect(prismaMock.productUpvote.findMany).toHaveBeenCalledWith({
      where: { productId: "prod-1" },
      orderBy: { createdAt: "desc" },
      take: 4,
      select: expect.any(Object),
    })
    expect(result).toEqual([
      {
        id: "upvote-1",
        createdAt: rows[0].createdAt,
        user: {
          id: "user-1",
          firstName: "Ada",
          lastName: "Lovelace",
          email: "ada@example.com",
        },
      },
    ])
  })

  it("guards against negative limits", async () => {
    prismaMock.productUpvote.findMany.mockResolvedValue([])

    await getRecentProductUpvoters("prod-1", -5)

    expect(prismaMock.productUpvote.findMany).toHaveBeenCalledWith({
      where: { productId: "prod-1" },
      orderBy: { createdAt: "desc" },
      take: 0,
      select: expect.any(Object),
    })
  })
})

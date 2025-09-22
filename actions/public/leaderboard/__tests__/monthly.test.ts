import { beforeEach, describe, expect, it, vi } from "vitest"

const findManyMock = vi.hoisted(() => vi.fn())
const findFirstMock = vi.hoisted(() => vi.fn())

vi.mock("next/cache", () => ({
  unstable_cache: (fn: any) => fn,
}))

vi.mock("@/lib/prisma", () => ({
  default: {
    monthlyProductRanking: {
      findMany: findManyMock,
      findFirst: findFirstMock,
    },
  },
}))

import {
  getMonthlyLeaderboardMonths,
  getMonthlyTopRankedProducts,
} from "@/actions/public/leaderboard/actions"

const april = new Date(Date.UTC(2024, 3, 1))
const march = new Date(Date.UTC(2024, 2, 1))

describe("monthly leaderboard actions", () => {
  beforeEach(() => {
    findManyMock.mockReset()
    findFirstMock.mockReset()
  })

  it("formats distinct months in descending order", async () => {
    findManyMock.mockResolvedValueOnce([{ month: april }, { month: march }])

    const result = await getMonthlyLeaderboardMonths()

    expect(result).toEqual([
      { month: "2024-04", label: "April 2024" },
      { month: "2024-03", label: "March 2024" },
    ])

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        distinct: ["month"],
        orderBy: { month: "desc" },
      }),
    )
  })

  it("returns rankings for the target month when present", async () => {
    findFirstMock.mockResolvedValueOnce({ month: april })
    findManyMock.mockResolvedValueOnce([
      {
        id: "rank-1",
        month: april,
        rank: 1,
        score: 320,
        upvotes: 185,
        productId: "prod-1",
        product: {
          id: "prod-1",
          slug: "prod-one",
          name: "Prod One",
          tagline: "Tagline",
          logo: "/logo.png",
          analytics: { upvotes: 420 },
          category: { name: "Analytics" },
          user: { firstName: "Ada", lastName: "Lovelace" },
          ProductBadge: [],
        },
      },
    ])

    const result = await getMonthlyTopRankedProducts({ month: "2024-04" })

    expect(result.month).toBe("2024-04")
    expect(result.label).toBe("April 2024")
    expect(result.rankings).toHaveLength(1)
    expect(result.rankings[0]).toMatchObject({
      rank: 1,
      score: 320,
      upvotes: 185,
    })

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { month: april },
        take: 10,
      }),
    )
  })

  it("falls back to the latest available month when requested month has no data", async () => {
    findFirstMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ month: march })
    findManyMock.mockResolvedValueOnce([])

    const result = await getMonthlyTopRankedProducts({ month: "2024-04" })

    expect(result.month).toBe("2024-03")
    expect(findFirstMock).toHaveBeenCalledTimes(2)
    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { month: march } }),
    )
  })
})

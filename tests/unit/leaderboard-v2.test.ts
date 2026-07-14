import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  createMany: vi.fn(),
  deleteMany: vi.fn(),
  executeRaw: vi.fn(),
  hasAnalyticsIngestionCoverage: vi.fn(),
  leaderboardRunUpdate: vi.fn(),
  leaderboardRunUpsert: vi.fn(),
  productFindMany: vi.fn(),
  scoreCount: vi.fn(),
  scoreFindMany: vi.fn(),
  trafficFindMany: vi.fn(),
  upvoteGroupBy: vi.fn(),
}))

vi.mock("@/lib/cache", () => ({
  applyCache: vi.fn(),
  DEFAULT_TTL: { fast: 60 },
  TAGS: { leaderboard: "leaderboard", product: (id: string) => id },
}))

vi.mock("@/lib/server/analytics/ingestion/coverage", () => ({
  hasAnalyticsIngestionCoverage: mocks.hasAnalyticsIngestionCoverage,
}))

vi.mock("@/lib/prisma", () => ({
  default: {
    $executeRaw: mocks.executeRaw,
    leaderboardRun: {
      update: mocks.leaderboardRunUpdate,
      upsert: mocks.leaderboardRunUpsert,
    },
    product: { findMany: mocks.productFindMany },
    productLeaderboardScore: {
      count: mocks.scoreCount,
      createMany: mocks.createMany,
      deleteMany: mocks.deleteMany,
      findMany: mocks.scoreFindMany,
    },
    productTrafficDaily: { findMany: mocks.trafficFindMany },
    productUpvote: { groupBy: mocks.upvoteGroupBy },
  },
}))

import { generateLeaderboardRun } from "@/lib/server/leaderboard/v2"

describe("leaderboard generation", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.leaderboardRunUpsert.mockResolvedValue({
      id: "run-1",
      periodStart: new Date("2026-07-01T00:00:00Z"),
      periodEnd: new Date("2026-08-01T00:00:00Z"),
    })
    mocks.leaderboardRunUpdate.mockResolvedValue({})
    mocks.productFindMany.mockResolvedValue([
      { id: "active", slug: "active" },
      { id: "inactive", slug: "inactive" },
    ])
    mocks.trafficFindMany.mockResolvedValue([
      {
        productId: "active",
        browserRequests: 1,
        browserVisits: 1,
      },
      {
        productId: "inactive",
        browserRequests: 0,
        browserVisits: 0,
      },
    ])
    mocks.upvoteGroupBy.mockResolvedValue([])
    mocks.deleteMany.mockResolvedValue({ count: 0 })
    mocks.createMany.mockResolvedValue({ count: 1 })
    mocks.scoreCount.mockResolvedValue(1)
    mocks.executeRaw.mockResolvedValue(1)
    mocks.hasAnalyticsIngestionCoverage.mockResolvedValue(true)
    mocks.scoreFindMany.mockResolvedValue([{ rank: 1, productId: "active" }])
  })

  it("does not persist or rank products with a zero score", async () => {
    await generateLeaderboardRun({
      periodStart: new Date("2026-07-01T00:00:00Z"),
      periodEnd: new Date("2026-08-01T00:00:00Z"),
      asOf: new Date("2026-07-15T00:00:00Z"),
    })

    expect(mocks.createMany).toHaveBeenCalledOnce()
    const [{ data }] = mocks.createMany.mock.calls[0] as [
      { data: Array<{ productId: string; score: number }> },
    ]
    expect(data).toHaveLength(1)
    expect(data[0]).toEqual(
      expect.objectContaining({ productId: "active", score: 10 }),
    )
  })

  it("defers current-day signals to the next completed UTC day", async () => {
    const result = await generateLeaderboardRun({
      periodStart: new Date("2026-07-01T00:00:00Z"),
      periodEnd: new Date("2026-08-01T00:00:00Z"),
      asOf: new Date("2026-07-15T18:45:00Z"),
    })

    expect(result.windowEnd).toEqual(new Date("2026-07-15T00:00:00Z"))
    expect(mocks.trafficFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          date: {
            gte: new Date("2026-07-01T00:00:00Z"),
            lt: new Date("2026-07-15T00:00:00Z"),
          },
        }),
      }),
    )
    expect(mocks.upvoteGroupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          createdAt: {
            gte: new Date("2026-07-01T00:00:00Z"),
            lt: new Date("2026-07-15T00:00:00Z"),
          },
        }),
      }),
    )
  })

  it("leaves the existing leaderboard untouched while traffic is pending", async () => {
    mocks.hasAnalyticsIngestionCoverage.mockResolvedValueOnce(false)

    const result = await generateLeaderboardRun({
      periodStart: new Date("2026-07-01T00:00:00Z"),
      periodEnd: new Date("2026-08-01T00:00:00Z"),
      asOf: new Date("2026-07-15T18:45:00Z"),
    })

    expect(result).toEqual({
      runId: "",
      scores: 0,
      windowEnd: new Date("2026-07-15T00:00:00Z"),
      deferred: true,
    })
    expect(mocks.leaderboardRunUpsert).not.toHaveBeenCalled()
    expect(mocks.trafficFindMany).not.toHaveBeenCalled()
    expect(mocks.upvoteGroupBy).not.toHaveBeenCalled()
  })
})

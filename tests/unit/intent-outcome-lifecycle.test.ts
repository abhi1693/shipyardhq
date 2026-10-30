import { describe, expect, it, vi } from "vitest"
const mocks = vi.hoisted(() => ({
  user: { findMany: vi.fn() },
  launchLifecycleEvent: { groupBy: vi.fn(), count: vi.fn() },
  productUpvote: {
    groupBy: vi.fn().mockResolvedValue([]),
    findMany: vi.fn().mockResolvedValue([]),
  },
  userPlanPurchase: {
    groupBy: vi.fn().mockResolvedValue([]),
    findMany: vi.fn().mockResolvedValue([]),
  },
}))
vi.mock("@/lib/prisma", () => ({ default: mocks }))
vi.mock("@/lib/server/cache", () => ({
  buildCacheKey: (...x: unknown[]) => x.join(":"),
  cacheHit: vi.fn().mockResolvedValue(null),
  cacheMiss: vi.fn(),
}))
vi.mock("@/lib/server/cache/ttl", () => ({ resolveCacheTtl: () => 60 }))
import { getIntentOutcomeAnalytics } from "@/lib/server/analytics/intentOutcome"

describe("launch outcome semantics", () => {
  it("does not equate private completed submissions or legacy history with publication; uses actual publication time", async () => {
    const joined = new Date()
    joined.setDate(joined.getDate() - 20)
    const published = new Date(joined)
    published.setDate(joined.getDate() + 12)
    mocks.user.findMany.mockResolvedValue([
      {
        id: "u",
        createdAt: joined,
        roleIntent: null,
        heardFrom: null,
        acquisitionContext: {
          version: 1,
          firstTouch: {
            path: "/guides",
            source: "google",
            observedAt: joined.getTime(),
          },
        },
      },
    ])
    mocks.launchLifecycleEvent.count.mockResolvedValue(3)
    mocks.launchLifecycleEvent.groupBy.mockImplementation(
      ({ where }: { where: { kind: string } }) =>
        Promise.resolve([
          {
            userId: "u",
            _count: { _all: 1 },
            _min: {
              createdAt: where.kind === "first_published" ? published : joined,
            },
          },
        ]),
    )
    const result = await getIntentOutcomeAnalytics()
    const stage = result.summary.stageMetrics.find(
      (x) => x.key === "shippedProduct",
    )!
    expect(stage).toMatchObject({
      label: "Published a listing",
      count: 1,
      medianDaysToComplete: 12,
      timingSampleSize: 1,
    })
    expect(result.summary.legacyProductsWithUnknownHistory).toBe(3)
    expect(result.cohorts[0]).toMatchObject({
      acquisitionSource: "google",
      acquisitionLanding: "/guides",
    })
    mocks.launchLifecycleEvent.groupBy.mockImplementation(
      ({ where }: { where: { kind: string } }) =>
        Promise.resolve(
          where.kind === "first_published"
            ? []
            : [
                {
                  userId: "u",
                  _count: { _all: 1 },
                  _min: { createdAt: joined },
                },
              ],
        ),
    )
    const draft = await getIntentOutcomeAnalytics()
    expect(
      draft.summary.stageMetrics.find((x) => x.key === "submissionCompleted")
        ?.count,
    ).toBe(1)
    expect(
      draft.summary.stageMetrics.find((x) => x.key === "shippedProduct"),
    ).toMatchObject({
      count: 0,
      medianDaysToComplete: null,
      timingSampleSize: 0,
    })
  })
})

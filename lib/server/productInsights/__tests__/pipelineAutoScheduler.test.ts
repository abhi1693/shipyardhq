import { beforeEach, describe, expect, it, vi } from "vitest"

const prismaMock = vi.hoisted(() => ({
  product: {
    findMany: vi.fn(),
  },
}))

const enqueueMock = vi.hoisted(() => vi.fn())
const accessMock = vi.hoisted(() => vi.fn())

vi.mock("@/lib/prisma", () => ({
  default: prismaMock,
}))

vi.mock("@/lib/server/productInsights/pipelineQueue", () => ({
  enqueueProductInsightPipelineJob: enqueueMock,
}))

vi.mock("@/lib/server/productInsights/access", () => ({
  evaluateInsightsPipelineAccess: accessMock,
}))

describe("scheduleStaleProductInsightPipelines", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2024-05-08T12:00:00Z"))
    vi.resetModules()
    prismaMock.product.findMany.mockReset()
    enqueueMock.mockReset()
    accessMock.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("queues products that have never run", async () => {
    prismaMock.product.findMany.mockResolvedValueOnce([
      {
        id: "prod_1",
        slug: "alpha",
        userId: "user_1",
        insightProfile: null,
      },
    ])
    accessMock.mockResolvedValueOnce({ ok: true, policy: null })
    enqueueMock.mockResolvedValueOnce({ queued: true })

    const { scheduleStaleProductInsightPipelines } = await import(
      "@/lib/server/productInsights/pipelineAutoScheduler"
    )

    const result = await scheduleStaleProductInsightPipelines({ limit: 5 })

    expect(result.queued).toBe(1)
    expect(result.results).toEqual([
      {
        productId: "prod_1",
        productSlug: "alpha",
        status: "queued",
      },
    ])
    expect(accessMock).toHaveBeenCalledWith({
      productId: "prod_1",
      userId: "user_1",
      lastRunAt: null,
    })
    expect(enqueueMock).toHaveBeenCalledWith({
      productId: "prod_1",
      requestedByUserId: "user_1",
      stageSetId: "default",
    })
  })

  it("queues only up to the provided limit", async () => {
    prismaMock.product.findMany.mockResolvedValueOnce([
      {
        id: "prod_1",
        slug: "alpha",
        userId: "user_1",
        insightProfile: { lastRunAt: new Date("2024-04-01T00:00:00Z") },
      },
      {
        id: "prod_2",
        slug: "beta",
        userId: "user_2",
        insightProfile: { lastRunAt: new Date("2024-03-01T00:00:00Z") },
      },
    ])
    accessMock.mockResolvedValue({ ok: true, policy: null })
    enqueueMock
      .mockResolvedValueOnce({ queued: true })
      .mockResolvedValueOnce({ queued: true })

    const { scheduleStaleProductInsightPipelines } = await import(
      "@/lib/server/productInsights/pipelineAutoScheduler"
    )

    const result = await scheduleStaleProductInsightPipelines({ limit: 1 })

    expect(result.queued).toBe(1)
    expect(enqueueMock).toHaveBeenCalledTimes(1)
  })

  it("skips products when feature access is missing", async () => {
    prismaMock.product.findMany.mockResolvedValueOnce([
      {
        id: "prod_3",
        slug: "gamma",
        userId: "user_3",
        insightProfile: { lastRunAt: new Date("2024-01-01T00:00:00Z") },
      },
    ])
    accessMock.mockResolvedValueOnce({
      ok: false,
      reason: "missing_feature",
      policy: null,
    })

    const { scheduleStaleProductInsightPipelines } = await import(
      "@/lib/server/productInsights/pipelineAutoScheduler"
    )

    const result = await scheduleStaleProductInsightPipelines()

    expect(result.queued).toBe(0)
    expect(result.results[0]).toMatchObject({
      productId: "prod_3",
      status: "skipped",
      reason: "missing_feature",
    })
    expect(enqueueMock).not.toHaveBeenCalled()
  })
})

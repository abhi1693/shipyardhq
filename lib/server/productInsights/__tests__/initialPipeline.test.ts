import { beforeEach, describe, expect, it, vi } from "vitest"

const prismaMock = vi.hoisted(() => ({
  product: {
    findUnique: vi.fn(),
  },
}))

const enqueueMock = vi.hoisted(() => vi.fn())

vi.mock("@/lib/prisma", () => ({
  default: prismaMock,
}))

vi.mock("@/lib/server/productInsights/pipelineQueue", () => ({
  enqueueProductInsightPipelineJob: enqueueMock,
}))

describe("product.created initial pipeline listener", () => {
  beforeEach(() => {
    vi.resetModules()
    prismaMock.product.findUnique.mockReset()
    enqueueMock.mockReset()
  })

  it("queues the default pipeline when no previous run exists", async () => {
    const { publish } = await import("@/lib/server/events")
    await import("@/lib/server/productInsights/initialPipeline")

    prismaMock.product.findUnique.mockResolvedValueOnce({
      id: "prod_1",
      slug: "demo-product",
      userId: "user_1",
      insightProfile: null,
    })
    enqueueMock.mockResolvedValueOnce({ queued: true })

    await publish("product.created", { productId: "prod_1" })

    expect(prismaMock.product.findUnique).toHaveBeenCalledWith({
      where: { id: "prod_1" },
      select: expect.any(Object),
    })
    expect(enqueueMock).toHaveBeenCalledWith({
      productId: "prod_1",
      requestedByUserId: "user_1",
      stageSetId: "default",
    })
  })

  it("skips queuing when the pipeline has already run", async () => {
    const { publish } = await import("@/lib/server/events")
    await import("@/lib/server/productInsights/initialPipeline")

    prismaMock.product.findUnique.mockResolvedValueOnce({
      id: "prod_2",
      slug: "demo-product",
      userId: "user_2",
      insightProfile: {
        lastRunAt: new Date(),
      },
    })

    await publish("product.created", { productId: "prod_2" })

    expect(enqueueMock).not.toHaveBeenCalled()
  })
})

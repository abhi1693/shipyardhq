import { beforeEach, describe, expect, it, vi } from "vitest"

const sAddMock = vi.fn()
const rPushMock = vi.fn()
const sRemMock = vi.fn()
const getRedisClientMock = vi.fn()

vi.mock("@/lib/server/redis", () => ({
  getRedisClient: getRedisClientMock,
}))

describe("enqueueProductInsightPipelineJob", () => {
  beforeEach(() => {
    vi.resetModules()
    sAddMock.mockReset()
    rPushMock.mockReset()
    sRemMock.mockReset()
    getRedisClientMock.mockReset()

    sAddMock.mockResolvedValue(1)
    rPushMock.mockResolvedValue(1)
    sRemMock.mockResolvedValue(1)
    getRedisClientMock.mockResolvedValue({
      sAdd: sAddMock,
      rPush: rPushMock,
      sRem: sRemMock,
    })
  })

  it("uses namespaced redis keys for guard and queue", async () => {
    const { enqueueProductInsightPipelineJob } = await import(
      "@/lib/server/productInsights/pipelineQueue"
    )

    const result = await enqueueProductInsightPipelineJob({
      productId: "prod_123",
    })

    expect(result).toEqual({ queued: true })
    expect(sAddMock).toHaveBeenCalledWith(
      "test:productInsights:pipeline:v1:active",
      "prod_123",
    )
    expect(rPushMock).toHaveBeenCalledWith(
      "test:productInsights:pipeline:v1:queue",
      expect.any(String),
    )
  })
})

import { afterEach, describe, expect, it, vi } from "vitest"

const { dequeueEnvelopeBatchMock, requeueEnvelopeMock, processEnvelopeMock } =
  vi.hoisted(() => {
    return {
      dequeueEnvelopeBatchMock:
        vi.fn<(queue: string, batchSize?: number) => Promise<string[]>>(),
      requeueEnvelopeMock: vi.fn<(envelopeId: string) => Promise<void>>(),
      processEnvelopeMock: vi.fn<(envelopeId: string) => Promise<void>>(),
    }
  })

vi.mock("@/lib/server/events/queueClient", () => ({
  dequeueEnvelopeBatch: dequeueEnvelopeBatchMock,
  MAX_BATCH_SIZE: 25,
  requeueEnvelope: requeueEnvelopeMock,
}))

vi.mock("@/lib/server/events/worker", () => ({
  processEnvelope: processEnvelopeMock,
}))

import { drainEventQueue } from "@/lib/server/events/drain"

describe("drainEventQueue", () => {
  afterEach(() => {
    dequeueEnvelopeBatchMock.mockReset()
    requeueEnvelopeMock.mockReset()
    processEnvelopeMock.mockReset()
    vi.clearAllMocks()
  })

  it("processes up to the configured event limit", async () => {
    const now = () => 0

    const batches: string[][] = [["a1", "a2", "a3"], ["b1"], []]

    dequeueEnvelopeBatchMock.mockImplementation(
      async () => batches.shift() ?? [],
    )
    processEnvelopeMock.mockImplementation(async () => {
      // No-op; leave time unchanged for this scenario.
    })

    const result = await drainEventQueue({
      maxEvents: 4,
      maxDurationMs: 60_000,
      now,
    })

    expect(result.processed).toBe(4)
    expect(result.failed).toBe(0)
    expect(result.pulled).toBe(4)
    expect(result.limitHit.events).toBe(true)
    expect(result.limitHit.duration).toBe(false)
    expect(result.queue).toBe("default")
    expect(processEnvelopeMock).toHaveBeenCalledTimes(4)
    expect(dequeueEnvelopeBatchMock).toHaveBeenNthCalledWith(1, "default", 4)
    expect(dequeueEnvelopeBatchMock).toHaveBeenNthCalledWith(2, "default", 1)
    expect(requeueEnvelopeMock).not.toHaveBeenCalled()
  })

  it("stops when the duration cap is reached and requeues remaining work", async () => {
    let currentTime = 0
    const now = () => currentTime

    dequeueEnvelopeBatchMock.mockResolvedValue(["e1", "e2", "e3", "e4"])
    processEnvelopeMock.mockImplementation(async () => {
      currentTime += 2 * 60 * 1000 // advance by two minutes per envelope
    })

    const result = await drainEventQueue({
      maxEvents: 10,
      maxDurationMs: 3 * 60 * 1000,
      gracePeriodMs: 0,
      now,
    })

    expect(result.processed).toBe(2)
    expect(result.failed).toBe(0)
    expect(result.pulled).toBe(2)
    expect(result.limitHit.duration).toBe(true)
    expect(result.limitHit.events).toBe(false)
    expect(result.queue).toBe("default")

    expect(requeueEnvelopeMock).toHaveBeenCalledTimes(2)
    expect(requeueEnvelopeMock.mock.calls.map((call) => call[0])).toEqual([
      "e4",
      "e3",
    ])
  })

  it("honors the default grace period before the 15 minute vercel timeout", async () => {
    let currentTime = 0
    const now = () => currentTime

    dequeueEnvelopeBatchMock.mockResolvedValueOnce(["g1", "g2", "g3", "g4"])
    dequeueEnvelopeBatchMock.mockResolvedValue([])

    processEnvelopeMock.mockImplementation(async () => {
      currentTime += 5 * 60 * 1000
    })

    const result = await drainEventQueue({ now })

    expect(result.processed).toBe(3)
    expect(result.failed).toBe(0)
    expect(result.pulled).toBe(3)
    expect(result.limitHit.duration).toBe(true)
    expect(result.limitHit.events).toBe(false)
    expect(result.durationMs).toBe(15 * 60 * 1000)
    expect(result.queue).toBe("default")

    expect(requeueEnvelopeMock).toHaveBeenCalledTimes(1)
    expect(requeueEnvelopeMock).toHaveBeenCalledWith("g4")
  })

  it("uses the queue provided in options", async () => {
    dequeueEnvelopeBatchMock.mockResolvedValue([])

    const result = await drainEventQueue({ queue: "high", now: () => 0 })

    expect(result.queue).toBe("high")
    expect(dequeueEnvelopeBatchMock).toHaveBeenCalledWith("high", 25)
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const bullMocks = vi.hoisted(() => ({
  add: vi.fn(),
  close: vi.fn(),
  getJob: vi.fn(),
  queueConstructor: vi.fn(),
}))

vi.mock("bullmq", () => ({
  Queue: function QueueMock(...args: unknown[]) {
    return bullMocks.queueConstructor(...args)
  },
}))

vi.mock("@/lib/server/jobs/connection", () => ({
  createBullMqConnection: vi.fn(() => ({})),
  getBullMqPrefix: vi.fn(() => "test"),
}))

import {
  closeEventEnvelopeQueue,
  enqueueEventEnvelopeJob,
} from "@/lib/server/jobs/eventQueue"

describe("event queue replacement", () => {
  beforeEach(async () => {
    await closeEventEnvelopeQueue()
    vi.clearAllMocks()
    bullMocks.queueConstructor.mockImplementation(() => ({
      add: bullMocks.add,
      close: bullMocks.close,
      getJob: bullMocks.getJob,
    }))
    bullMocks.add.mockResolvedValue(undefined)
    bullMocks.close.mockResolvedValue(undefined)
  })

  afterEach(async () => {
    await closeEventEnvelopeQueue()
  })

  it.each(["waiting", "delayed", "active", "prioritized"])(
    "preserves an existing %s job so reconciliation cannot reset queue order",
    async (state) => {
      const remove = vi.fn()
      bullMocks.getJob.mockResolvedValueOnce({
        getState: vi.fn().mockResolvedValue(state),
        remove,
      })

      await enqueueEventEnvelopeJob(
        { envelopeId: "envelope_1", queue: "high" },
        { replaceExisting: true },
      )

      expect(remove).not.toHaveBeenCalled()
      expect(bullMocks.add).toHaveBeenCalledTimes(1)
    },
  )

  it.each(["completed", "failed"])(
    "removes an existing %s job that blocks a pending Postgres envelope",
    async (state) => {
      const remove = vi.fn().mockResolvedValue(undefined)
      bullMocks.getJob.mockResolvedValueOnce({
        getState: vi.fn().mockResolvedValue(state),
        remove,
      })

      await enqueueEventEnvelopeJob(
        { envelopeId: "envelope_1", queue: "high" },
        { replaceExisting: true },
      )

      expect(remove).toHaveBeenCalledTimes(1)
      expect(bullMocks.add).toHaveBeenCalledTimes(1)
    },
  )
})

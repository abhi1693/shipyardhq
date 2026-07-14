import { beforeEach, describe, expect, it, vi } from "vitest"

const eventQueueMocks = vi.hoisted(() => ({
  queryRaw: vi.fn(),
  enqueueEventEnvelopeJob: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({
  default: { $queryRaw: eventQueueMocks.queryRaw },
}))

vi.mock("@/lib/server/jobs/eventQueue", () => ({
  enqueueEventEnvelopeJob: eventQueueMocks.enqueueEventEnvelopeJob,
}))

import { reconcileDueEventEnvelopeJobs } from "@/lib/server/events/queueClient"

describe("event envelope reconciliation", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    eventQueueMocks.enqueueEventEnvelopeJob.mockResolvedValue(undefined)
  })

  it("replaces a stale BullMQ job when Postgres still marks the envelope due", async () => {
    eventQueueMocks.queryRaw.mockResolvedValueOnce([
      { id: "boundary_envelope_1", queue: "high" },
    ])

    await expect(reconcileDueEventEnvelopeJobs()).resolves.toEqual({
      attempted: 1,
      enqueued: 1,
      failed: 0,
    })
    expect(eventQueueMocks.enqueueEventEnvelopeJob).toHaveBeenCalledWith(
      { envelopeId: "boundary_envelope_1", queue: "high" },
      { replaceExisting: true },
    )
  })
})

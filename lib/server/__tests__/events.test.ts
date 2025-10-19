import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/prisma", () => ({
  default: {
    $executeRaw: vi.fn().mockResolvedValue(undefined),
  },
}))

vi.mock("@/lib/server/events/queueClient", () => ({
  enqueueEvent: vi.fn().mockResolvedValue(undefined),
  dequeueEnvelopeBatch: vi.fn(async () => []),
  requeueEnvelope: vi.fn(async () => undefined),
}))

import prisma from "@/lib/prisma"
import {
  enqueueEvent,
  dequeueEnvelopeBatch,
  requeueEnvelope,
} from "@/lib/server/events/queueClient"
import {
  dispatchEvent,
  registerEventHandler,
  resetEventRegistryForTesting,
} from "@/lib/server/events"

const waitForAsyncHandlers = () =>
  new Promise<void>((resolve) => setTimeout(resolve, 0))

describe("event dispatcher", () => {
  const prismaExecuteRaw = prisma.$executeRaw as unknown as ReturnType<
    typeof vi.fn
  >
  const enqueueEventMock = enqueueEvent as unknown as ReturnType<typeof vi.fn>
  const dequeueMock = dequeueEnvelopeBatch as unknown as ReturnType<
    typeof vi.fn
  >
  const requeueMock = requeueEnvelope as unknown as ReturnType<typeof vi.fn>

  beforeEach(() => {
    resetEventRegistryForTesting()
    prismaExecuteRaw.mockClear()
    enqueueEventMock.mockClear()
    dequeueMock.mockClear()
    requeueMock.mockClear()
  })

  it("persists envelope and enqueues when async handlers are present", async () => {
    const asyncHandler = vi.fn()

    registerEventHandler({
      event: "product.created",
      id: "test.async-handler",
      handler: asyncHandler as any,
    })

    await dispatchEvent("product.created", { productId: "async-123" })

    expect(asyncHandler).not.toHaveBeenCalled()
    expect(prismaExecuteRaw).toHaveBeenCalled()
    expect(enqueueEventMock).toHaveBeenCalledTimes(1)
  })

  it("falls back to inline execution when enqueue fails locally", async () => {
    const asyncHandler = vi.fn()

    registerEventHandler({
      event: "product.created",
      id: "test.async-handler",
      handler: asyncHandler as any,
    })

    enqueueEventMock.mockRejectedValueOnce(new Error("queue unavailable"))

    await dispatchEvent("product.created", { productId: "fallback-1" })
    await waitForAsyncHandlers()

    expect(asyncHandler).toHaveBeenCalledWith({ productId: "fallback-1" })
    expect(prismaExecuteRaw).toHaveBeenCalled()
  })
})

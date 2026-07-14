import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const listenerMocks = vi.hoisted(() => ({
  recompute: vi.fn(),
  refreshCaches: vi.fn(),
  registerEventHandler: vi.fn(),
}))

vi.mock("@/lib/server/events", () => ({
  registerEventHandler: listenerMocks.registerEventHandler,
}))

vi.mock("@/lib/server/productPlanGrants", () => ({
  recomputeProductPlanGrantProjectionAtBoundary: listenerMocks.recompute,
}))

vi.mock("@/lib/server/productPlanGrantCache", () => ({
  refreshProductPlanGrantCachesFromWorker: listenerMocks.refreshCaches,
}))

import { processProductPlanGrantBoundaryEvent } from "@/lib/server/productPlanGrantBoundaryListener"

const NOW = new Date("2026-07-14T12:00:00.000Z")
const PRODUCT_ID = "product_1"

describe("product plan grant boundary listener", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    listenerMocks.recompute.mockResolvedValue({
      productId: PRODUCT_ID,
      grantsExpired: 0,
      projectionChanged: false,
    })
    listenerMocks.refreshCaches.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("always refreshes caches even when a duplicate job changes no rows", async () => {
    await processProductPlanGrantBoundaryEvent({
      productId: PRODUCT_ID,
      boundaryAt: NOW.toISOString(),
    })

    expect(listenerMocks.recompute).toHaveBeenCalledWith(PRODUCT_ID, NOW)
    expect(listenerMocks.refreshCaches).toHaveBeenCalledWith(
      [PRODUCT_ID],
      "product-plan-grant.boundary",
    )
  })

  it("propagates cache failures so the durable event retries", async () => {
    listenerMocks.refreshCaches.mockRejectedValueOnce(
      new Error("cache refresh failed"),
    )

    await expect(
      processProductPlanGrantBoundaryEvent({
        productId: PRODUCT_ID,
        boundaryAt: NOW.toISOString(),
      }),
    ).rejects.toThrow("cache refresh failed")
    expect(listenerMocks.recompute).toHaveBeenCalledTimes(1)
  })

  it("rejects an early delivery instead of completing before the boundary", async () => {
    const boundaryAt = new Date(NOW.getTime() + 1000)

    await expect(
      processProductPlanGrantBoundaryEvent({
        productId: PRODUCT_ID,
        boundaryAt: boundaryAt.toISOString(),
      }),
    ).rejects.toThrow("boundary ran early")
    expect(listenerMocks.recompute).not.toHaveBeenCalled()
    expect(listenerMocks.refreshCaches).not.toHaveBeenCalled()
  })
})

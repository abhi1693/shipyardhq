import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/prisma", () => {
  const productBadge = {
    findFirst: vi.fn(async () => null),
    create: vi.fn(async () => ({})),
    update: vi.fn(async () => ({})),
  }
  const product = {
    findUnique: vi.fn(async () => ({
      createdAt: new Date(Date.now()),
      plan: { boostForDays: 1 },
    })),
  }
  const plan = {
    findFirst: vi.fn(async () => ({ boostForDays: 1 })),
  }
  return { default: { productBadge, product, plan } }
})

import prisma from "@/lib/prisma"
import "@/lib/server/badges"
import { resolveRegisteredHandler } from "@/lib/server/events"

async function runBadgeHandler(
  event: string,
  handlerId: string,
  payload: Record<string, unknown>,
) {
  const registration = resolveRegisteredHandler(event, handlerId)
  if (!registration) {
    throw new Error(`Handler ${handlerId} not registered for ${event}`)
  }
  await registration.handler(payload as any)
}

describe("badges listeners", () => {
  beforeEach(() => {
    ;(prisma as any).productBadge.findFirst.mockClear()
    ;(prisma as any).productBadge.create.mockClear()
    ;(prisma as any).productBadge.update.mockClear()
    ;(prisma as any).product.findUnique.mockClear()
    ;(prisma as any).product.findUnique.mockImplementation(async () => ({
      createdAt: new Date(Date.now()),
      plan: { boostForDays: 1 },
    }))
    ;(prisma as any).plan.findFirst.mockClear()
    ;(prisma as any).plan.findFirst.mockResolvedValue({ boostForDays: 1 })
  })

  it("assigns new badge on product.created", async () => {
    await runBadgeHandler("product.created", "badges.auto-assign-new", {
      productId: "p1",
    })
    expect((prisma as any).productBadge.create).toHaveBeenCalled()
  })

  it("uses plan boost days when assigning new badge on product.created", async () => {
    const createdAt = new Date("2024-01-01T00:00:00.000Z")
    ;(prisma as any).product.findUnique.mockResolvedValueOnce({
      createdAt,
      plan: { boostForDays: 5 },
    })

    await runBadgeHandler("product.created", "badges.auto-assign-new", {
      productId: "pPlan",
    })

    const createArgs = (prisma as any).productBadge.create.mock.calls.at(-1)?.[0]
    expect(createArgs?.data?.expiresAt?.toISOString()).toBe(
      new Date(createdAt.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    )
  })

  it("applies default expiry for trending badge", async () => {
    await runBadgeHandler("badge.assigned", "badges.apply-default-expiry", {
      id: "b1",
      productId: "p1",
      badge: "trending",
    })
    expect((prisma as any).productBadge.update).toHaveBeenCalled()
  })

  it("refreshes expiresAt when existing badge has none", async () => {
    ;(prisma as any).productBadge.findFirst.mockResolvedValueOnce({
      id: "x",
      expiresAt: null,
    })
    await runBadgeHandler("product.created", "badges.auto-assign-new", {
      productId: "p2",
    })
    expect((prisma as any).productBadge.update).toHaveBeenCalled()
  })

  it("logs errors and continues", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})
    ;(prisma as any).productBadge.create.mockRejectedValueOnce(
      new Error("nope"),
    )
    await runBadgeHandler("product.created", "badges.auto-assign-new", {
      productId: "p3",
    })
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
    ;(prisma as any).productBadge.create.mockResolvedValue({})
  })

  it("does not set expiry for editor-pick", async () => {
    ;(prisma as any).productBadge.update.mockClear()
    await runBadgeHandler("badge.assigned", "badges.apply-default-expiry", {
      id: "b2",
      productId: "p1",
      badge: "editor-pick",
    })
    expect((prisma as any).productBadge.update).not.toHaveBeenCalled()
  })

  it("product.updated within 7 days ensures new badge", async () => {
    ;(prisma as any).product.findUnique.mockResolvedValueOnce({
      createdAt: new Date(),
    })
    ;(prisma as any).productBadge.findFirst.mockResolvedValueOnce(null)
    await runBadgeHandler("product.updated", "badges.refresh-new-badge", {
      productId: "p5",
    })
    expect((prisma as any).productBadge.create).toHaveBeenCalled()
  })

  it("handles product.deleted event (no-op)", async () => {
    await runBadgeHandler("product.deleted", "badges.deleted-cleanup", {
      productId: "p6",
    })
    expect(true).toBe(true)
  })

  it("badge.assigned default branch does nothing for unknown badge", async () => {
    ;(prisma as any).productBadge.update.mockClear()
    await runBadgeHandler("badge.assigned", "badges.apply-default-expiry", {
      id: "b3",
      productId: "p1",
      badge: "unknown",
    })
    expect((prisma as any).productBadge.update).not.toHaveBeenCalled()
  })

  it("logs errors in badge.assigned catch", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})
    ;(prisma as any).productBadge.update.mockRejectedValueOnce(
      new Error("nope"),
    )
    await runBadgeHandler("badge.assigned", "badges.apply-default-expiry", {
      id: "b4",
      productId: "p1",
      badge: "featured",
    })
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
    ;(prisma as any).productBadge.update.mockResolvedValue({})
  })

  it("logs errors in product.updated catch", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})
    ;(prisma as any).product.findUnique.mockRejectedValueOnce(new Error("nope"))
    await runBadgeHandler("product.updated", "badges.refresh-new-badge", {
      productId: "p6",
    })
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
    ;(prisma as any).product.findUnique.mockResolvedValue({
      createdAt: new Date(),
    })
  })

  it("applies plan-based expiry when assigning new badge manually", async () => {
    vi.useFakeTimers()
    try {
      const now = new Date("2024-02-01T00:00:00.000Z")
      vi.setSystemTime(now)
      ;(prisma as any).product.findUnique.mockResolvedValueOnce({
        createdAt: new Date("2024-01-15T00:00:00.000Z"),
        plan: { boostForDays: 3 },
      })
      ;(prisma as any).productBadge.update.mockClear()
      await runBadgeHandler("badge.assigned", "badges.apply-default-expiry", {
        id: "bN",
        productId: "p1",
        badge: "new",
      })

      const updateArgs = (prisma as any).productBadge.update.mock.calls.at(
        -1,
      )?.[0]
      expect(updateArgs?.data?.expiresAt?.toISOString()).toBe(
        new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      )
    } finally {
      vi.useRealTimers()
    }
  })

  it("respects provided expiresAt and returns early", async () => {
    ;(prisma as any).productBadge.update.mockClear()
    const future = new Date(Date.now() + 1000)
    await runBadgeHandler("badge.assigned", "badges.apply-default-expiry", {
      id: "b5",
      productId: "p1",
      badge: "featured",
      expiresAt: future,
    })
    expect((prisma as any).productBadge.update).not.toHaveBeenCalled()
  })

  it("product.updated returns early when product not found", async () => {
    ;(prisma as any).productBadge.create.mockClear()
    ;(prisma as any).product.findUnique.mockResolvedValueOnce(null)
    await runBadgeHandler("product.updated", "badges.refresh-new-badge", {
      productId: "missing",
    })
    expect((prisma as any).productBadge.create).not.toHaveBeenCalled()
  })
})

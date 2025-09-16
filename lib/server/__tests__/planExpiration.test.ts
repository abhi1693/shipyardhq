import { describe, it, expect, beforeEach, vi } from "vitest"

const mockPrisma = vi.hoisted(() => ({
  plan: {
    findFirst: vi.fn(),
  },
  product: {
    findMany: vi.fn(),
    updateMany: vi.fn(),
  },
}))

vi.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: mockPrisma,
}))

import {
  addDays,
  isPlanExpired,
  expireBoostedPlans,
} from "@/lib/server/planExpiration"

describe("plan expiration helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.plan.findFirst.mockReset()
    mockPrisma.product.findMany.mockReset()
    mockPrisma.product.updateMany.mockReset()
  })

  it("adds days to a date", () => {
    const start = new Date("2024-01-01T00:00:00Z")
    const result = addDays(start, 5)
    expect(result.toISOString()).toBe("2024-01-06T00:00:00.000Z")
  })

  it("returns false when boost is zero", () => {
    const start = new Date()
    expect(isPlanExpired(start, 0, addDays(start, 10))).toBe(false)
  })

  it("detects expiration when now passes threshold", () => {
    const start = new Date("2024-01-01T00:00:00Z")
    const now = new Date("2024-01-11T00:00:00Z")
    expect(isPlanExpired(start, 10, now)).toBe(true)
  })

  it("handles non-expired boosts", () => {
    const start = new Date("2024-01-01T00:00:00Z")
    const now = new Date("2024-01-05T00:00:00Z")
    expect(isPlanExpired(start, 10, now)).toBe(false)
  })

  it("throws when no default plan is present", async () => {
    mockPrisma.plan.findFirst.mockResolvedValue(null)
    await expect(expireBoostedPlans(new Date())).rejects.toThrow(
      /No default plan configured/,
    )
  })

  it("returns empty when nothing expires", async () => {
    mockPrisma.plan.findFirst.mockResolvedValue({ id: "default" })
    mockPrisma.product.findMany.mockResolvedValueOnce([
      {
        id: "p1",
        name: "Prod",
        planAssignedAt: new Date("2024-01-01T00:00:00Z"),
        plan: { boostForDays: 10, name: "Boost", isDefault: false },
      },
    ])
    const result = await expireBoostedPlans(
      new Date("2024-01-05T00:00:00Z"),
    )
    expect(result).toEqual({ expired: [], count: 0 })
    expect(mockPrisma.product.updateMany).not.toHaveBeenCalled()
  })

  it("expires products whose boosts elapsed", async () => {
    mockPrisma.plan.findFirst.mockResolvedValue({ id: "default" })
    mockPrisma.product.findMany.mockResolvedValueOnce([
      {
        id: "p1",
        name: "Prod",
        planAssignedAt: new Date("2024-01-01T00:00:00Z"),
        plan: { boostForDays: 5, name: "Boost", isDefault: false },
      },
    ])

    const result = await expireBoostedPlans(
      new Date("2024-01-10T00:00:00Z"),
    )

    expect(result.count).toBe(1)
    expect(result.expired[0].productId).toBe("p1")
    expect(mockPrisma.product.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["p1"] } },
      data: { planId: "default", planAssignedAt: null },
    })
  })
})
